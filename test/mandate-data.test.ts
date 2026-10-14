import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Queries of the vacancies (table mandates) against a real Postgres (TEST_DATABASE_URL, wiped
 * here): list filters and counts, the same hits in the global search, and the counts in the
 * company list. Fictional sample data only.
 */

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("vacancy data", () => {
  const client = new Client({ connectionString: url });
  // Loaded after DATABASE_URL points at the test database (the env is read on import).
  let mandatesData: typeof import("@/lib/admin/data/mandates");
  let getDb: typeof import("@/lib/admin/db/client").getDb;
  let schema: typeof import("@/lib/admin/db/schema");

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    process.env.DATABASE_URL = url;
    ({ getDb } = await import("@/lib/admin/db/client"));
    mandatesData = await import("@/lib/admin/data/mandates");
    schema = await import("@/lib/admin/db/schema");
    const db = await getDb();
    // Identity columns: a freshly created schema numbers rows from 1 in insertion order.
    const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
    expect(
      ids(
        await db
          .insert(schema.companies)
          .values([
            { name: "Alpenblick Consulting AG", kind: "auftraggeber", legalForm: "AG" },
            { name: "Muster Daten GmbH", kind: "endkunde", legalForm: "GmbH" },
            { name: "Beispiel Informatik", kind: "partner", legalForm: "Einzelunternehmen" },
          ])
          .returning({ id: schema.companies.id }),
      ),
    ).toEqual([1, 2, 3]);
    expect(
      ids(
        await db
          .insert(schema.mandates)
          .values([
            { title: "Cloud Architekt", companyId: 1, status: "neu", priority: "hoch", deadline: "2026-10-20", rateUnit: "stunde" },
            { title: "Testmanager Bank", companyId: 1, status: "gewonnen", closedAt: new Date("2026-10-01T10:00:00Z"), rateUnit: "stunde" },
            { title: "SAP Basis", endClient: "Seeblick Versicherung", status: "pausiert", rateUnit: "tag" },
            { title: "Scrum Master", companyId: 1, status: "interview", priority: "tief", rateUnit: "stunde" },
          ])
          .returning({ id: schema.mandates.id }),
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  afterAll(async () => {
    await client.end();
    const state = globalThis.__kovaliAdminDb;
    globalThis.__kovaliAdminDb = undefined;
    await state?.pool.end();
  });

  it("counts statuses and filters by company, priority and search", async () => {
    expect(await mandatesData.mandateStatusCounts({})).toEqual({ neu: 1, gewonnen: 1, pausiert: 1, interview: 1 });
    expect(await mandatesData.mandateStatusCounts({ companyId: 1 })).toEqual({ neu: 1, gewonnen: 1, interview: 1 });
    const open = await mandatesData.listMandates({ statuses: ["neu", "in_bearbeitung", "angeboten", "interview"], page: 1 });
    // Open mandates by urgency: high priority first.
    expect(open.rows.map((r) => r.id)).toEqual([1, 4]);
    expect((await mandatesData.listMandates({ priority: "tief", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([4]);
    expect((await mandatesData.listMandates({ q: "seeblick", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([3]);
    expect((await mandatesData.listMandates({ q: "M-0002", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([2]);
    expect((await mandatesData.listMandates({ q: "alpenblick", statuses: ["gewonnen"], page: 1 })).total).toBe(1);
    expect(await mandatesData.mandateCompanyOptions()).toEqual([{ value: 1, label: "Alpenblick Consulting AG" }]);
  });

  it("finds the same mandates in the list as in the global search", async () => {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const { searchAll } = await import("@/lib/admin/data/search");
    await db.update(schema.mandates).set({ description: "Migration auf S/4HANA im Finanzbereich" }).where(eq(schema.mandates.id, 2));
    // The description of a won mandate: "Alle anzeigen" opens the list with status "alle".
    expect((await searchAll("s/4hana"))?.mandates).toMatchObject({ total: 1, rows: [{ id: 2 }] });
    expect((await mandatesData.listMandates({ q: "s/4hana", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([2]);
    // The client's name finds its mandates in both.
    const list = await mandatesData.listMandates({ q: "alpenblick", statuses: null, page: 1 });
    const global = await searchAll("alpenblick");
    expect(list.total).toBe(3);
    expect(global?.mandates.total).toBe(3);
    expect(global?.mandates.rows.map((r) => r.id).sort()).toEqual(list.rows.map((r) => r.id).sort());
  });

  it("counts contacts and open mandates per company in the company list", async () => {
    const db = await getDb();
    // Contact ids deliberately differ from company ids: an unqualified "id" in the subquery would match wrongly.
    await db.insert(schema.contacts).values([
      { companyId: 2, firstName: "Erste", lastName: "Person" },
      { companyId: 1, firstName: "Zweite", lastName: "Person" },
      { companyId: 1, firstName: "Dritte", lastName: "Person" },
    ]);
    const { listCompanies } = await import("@/lib/admin/data/companies");
    const { rows } = await listCompanies({ page: 1 });
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(1)).toMatchObject({ contacts: 2, openMandates: 2 });
    expect(byId.get(2)).toMatchObject({ contacts: 1, openMandates: 0 });
    expect(byId.get(3)).toMatchObject({ contacts: 0, openMandates: 0 });
  });
});
