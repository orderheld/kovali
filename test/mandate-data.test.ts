import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Queries of the Mandate module against a real Postgres (TEST_DATABASE_URL, wiped here):
 * list filters and counts, the subcontractor rule, withdrawals and the consent constraint.
 * Fictional sample data only.
 */

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("mandate data", () => {
  const client = new Client({ connectionString: url });
  // Loaded after DATABASE_URL points at the test database (the env is read on import).
  let mandatesData: typeof import("@/lib/admin/data/mandates");
  let submissionsData: typeof import("@/lib/admin/data/submissions");
  let getDb: typeof import("@/lib/admin/db/client").getDb;
  let schema: typeof import("@/lib/admin/db/schema");

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    process.env.DATABASE_URL = url;
    ({ getDb } = await import("@/lib/admin/db/client"));
    mandatesData = await import("@/lib/admin/data/mandates");
    submissionsData = await import("@/lib/admin/data/submissions");
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
            { name: "Muster Daten GmbH", kind: "subunternehmer", legalForm: "GmbH" },
            { name: "Beispiel Informatik", kind: "subunternehmer", legalForm: "Einzelunternehmen" },
          ])
          .returning({ id: schema.companies.id }),
      ),
    ).toEqual([1, 2, 3]);
    expect(
      ids(
        await db
          .insert(schema.candidates)
          .values([
            { firstName: "Lea", lastName: "Probst", companyId: 2 },
            { firstName: "Jonas", lastName: "Fiktiv", companyId: 3 },
            { firstName: "Mia", lastName: "Ohnefirma" },
            { firstName: "Tim", lastName: "Kunde", companyId: 1 },
          ])
          .returning({ id: schema.candidates.id }),
      ),
    ).toEqual([1, 2, 3, 4]);
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

  it("passes candidates on only through their own subcontractor firm", async () => {
    const { candidateFirm, subcontractorCheck, NO_OWN_FIRM, SOLE_PROPRIETOR_WARNING } = submissionsData;
    expect(subcontractorCheck(await candidateFirm(1))).toMatchObject({ ok: true, warning: null, firm: { name: "Muster Daten GmbH" } });
    expect(subcontractorCheck(await candidateFirm(2))).toMatchObject({ ok: true, warning: SOLE_PROPRIETOR_WARNING });
    expect(subcontractorCheck(await candidateFirm(3))).toEqual({ ok: false, error: NO_OWN_FIRM });
    // A client company is not the candidate's own firm.
    expect(subcontractorCheck(await candidateFirm(4))).toEqual({ ok: false, error: NO_OWN_FIRM });
  });

  it("refuses a hand-over without consent in the database itself", async () => {
    const db = await getDb();
    const error = await db
      .insert(schema.submissions)
      .values({ mandateId: 1, candidateId: 1, status: "vorgeschlagen", submittedAt: new Date() })
      .then(() => null)
      .catch((e: unknown) => e);
    // The actions detect the violation by its constraint name somewhere in the cause chain.
    const constraints: unknown[] = [];
    for (let e: unknown = error, depth = 0; e && typeof e === "object" && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
      constraints.push((e as { constraint?: unknown }).constraint);
    }
    expect(constraints).toContain("submissions_consent_before_submit");
  });

  it("lists submissions with their firm and finds the latest withdrawal", async () => {
    const db = await getDb();
    await db.insert(schema.submissions).values([
      { mandateId: 1, candidateId: 1, consentAt: new Date("2026-10-02T12:00:00Z"), consentNote: "E-Mail", submittedAt: new Date("2026-10-03T08:00:00Z"), status: "vorgeschlagen", matchScore: 80 },
      { mandateId: 1, candidateId: 2, consentNote: "Widerruf am 05.10.2026 (E-Mail)", status: "zurueckgezogen", matchScore: 60 },
      { mandateId: 4, candidateId: 2, consentNote: "Widerruf am 05.10.2026 (E-Mail)", status: "einwilligung_offen" },
    ]);
    const list = await submissionsData.listMandateSubmissions(1);
    expect(list.map((s) => [s.candidateId, s.firmName])).toEqual([
      [1, "Muster Daten GmbH"],
      [2, "Beispiel Informatik"],
    ]);
    const withdrawals = await submissionsData.candidateWithdrawals([1, 2, 3]);
    expect([...withdrawals.keys()]).toEqual([2]);
    expect(withdrawals.get(2)?.note).toBe("Widerruf am 05.10.2026 (E-Mail)");
    expect((await submissionsData.listCandidateSubmissions(2)).length).toBe(2);
  });
});
