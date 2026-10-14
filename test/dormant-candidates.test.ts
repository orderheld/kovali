import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * A database that held candidates when migration 0004 ran (the old candidate tables stay):
 * deleting a vacancy, contract or company keeps history entries that still belong to a
 * candidate, and Einstellungen > System deletes the old candidate data with its tables. The
 * session check, refresh() and redirect() are stubbed; everything else is the real code.
 * Fictional sample data only.
 */

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ADMIN_SECRET = Buffer.alloc(32, 4).toString("base64url");
});

vi.mock("@/lib/admin/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/auth/session")>()),
  requireAdmin: vi.fn(async () => ({ id: "test", createdAt: new Date(), expiresAt: new Date() })),
}));
vi.mock("next/cache", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/cache")>()), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), redirect: vi.fn() }));

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("old candidate data (database)", () => {
  const client = new Client({ connectionString: url });
  const rows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await rows<T>(text, values))[0]!;
  const doc = (owner: string, id: string | number, name: string) =>
    client.query(`insert into documents (${owner}, kind, filename, mime_type, size_bytes, sha256, content) values ($1, 'sonstiges', $2, 'application/pdf', 1, 'x', '\\x00')`, [
      id,
      name,
    ]);

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    // The database as the version with the candidate portal left it (0001 to 0003) ...
    const { migrationsThrough } = await import("@/lib/admin/db/migrations");
    await client.query("create table admin_migrations (id text primary key, applied_at timestamptz not null default now())");
    for (const m of migrationsThrough("0003_consent_scope_contract_sent")) {
      await client.query(m.sql);
      await client.query("insert into admin_migrations (id) values ($1)", [m.id]);
    }
    await client.query("insert into companies (name, kind) values ('Muster Vermittlung AG', 'auftraggeber'), ('Beispiel Bank AG', 'endkunde')");
    await client.query("insert into candidates (first_name, last_name) values ('Test', 'Person'), ('Erika', 'Beispiel')");
    await client.query("insert into mandates (title, company_id) values ('Business Analyst', 1), ('Testmanager', 1)");
    await client.query("insert into contracts (number, template, title, company_id, candidate_id) values ('V-2026-0001', 'einwilligung', 'Einwilligung', 1, 1)");
    await client.query(
      "insert into submissions (mandate_id, candidate_id, consent_at, consent_method) values (1, 1, now(), 'email'), (2, 2, now(), 'muendlich')",
    );
    await client.query("insert into vacancy_shares (mandate_id, candidate_id) values (1, 2)");
    await client.query(
      `insert into activities (candidate_id, mandate_id, company_id, contract_id, body) values
         (1, null, null, null, 'Nur Kandidat'),
         (1, 1, null, null, 'Kandidat und Vakanz'),
         (2, null, 2, null, 'Kandidat und Firma'),
         (1, null, null, 1, 'Kandidat und Vertrag')`,
    );
    await doc("candidate_id", 1, "cv.pdf");
    // ... then the first access of this version runs 0004 and later.
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("keeps history entries of candidates when a vacancy, contract or company is deleted", async () => {
    const { mandateDeleteImpact } = await import("@/lib/admin/data/mandates");
    const { deleteVacancy } = await import("@/app/admin/(app)/vakanzen/actions");
    const { deleteContract } = await import("@/app/admin/(app)/vertraege/actions");
    const { deleteCompany } = await import("@/app/admin/(app)/firmen/actions");

    // The confirmation names the old submission and share that go with the vacancy.
    expect(await mandateDeleteImpact(1)).toMatchObject({ legacy: 2 });
    expect(await mandateDeleteImpact(2)).toMatchObject({ legacy: 1 });

    expect(await deleteVacancy(1)).toBeUndefined();
    expect(await deleteContract(1)).toBeUndefined();
    expect(await deleteCompany(2)).toBeUndefined();

    const left = await rows<{ body: string; candidate_id: string; mandate_id: string | null; company_id: string | null; contract_id: string | null }>(
      "select body, candidate_id, mandate_id, company_id, contract_id from activities where candidate_id is not null order by id",
    );
    expect(left).toEqual([
      { body: "Nur Kandidat", candidate_id: "1", mandate_id: null, company_id: null, contract_id: null },
      { body: "Kandidat und Vakanz", candidate_id: "1", mandate_id: null, company_id: null, contract_id: null },
      { body: "Kandidat und Firma", candidate_id: "2", mandate_id: null, company_id: null, contract_id: null },
      { body: "Kandidat und Vertrag", candidate_id: "1", mandate_id: null, company_id: null, contract_id: null },
    ]);
    // Submissions and shares of the deleted vacancy went with it, as announced.
    expect(await rows("select mandate_id from submissions")).toEqual([{ mandate_id: "2" }]);
    expect(await rows("select 1 from vacancy_shares")).toEqual([]);
  });

  it("deletes the old candidate data and its tables on request, and records counts only", async () => {
    const { dormantCandidateData } = await import("@/lib/admin/data/dormant");
    const { deleteDormantCandidates } = await import("@/app/admin/(app)/einstellungen/system/actions");
    const { redirect } = await import("next/navigation");

    // Records of this version next to the old ones.
    await client.query("insert into contracts (number, template, title, company_id, candidate_id) values ('V-2026-0002', 'nda', 'NDA', 1, 2)");
    const assignment = await one<{ id: string }>("insert into assignments (title, company_id) values ('Business Analyst', 1) returning id");
    await doc("company_id", 1, "rahmenvertrag.pdf");
    await doc("assignment_id", assignment.id, "rapport.pdf");
    await doc("candidate_id", 2, "zeugnis.pdf");
    await client.query("insert into activities (company_id, body) values (1, 'Firma bleibt')");

    expect(await dormantCandidateData()).toEqual({ candidates: 2, documents: 2 });
    expect(await deleteDormantCandidates()).toBeUndefined();
    expect(redirect).toHaveBeenLastCalledWith("/admin/einstellungen/system?kandidaten=geloescht");

    const tables = (await rows<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'")).map((r) => r.table_name);
    for (const gone of ["candidates", "submissions", "candidate_accounts", "candidate_sessions", "change_requests", "vacancy_shares"]) {
      expect(tables).not.toContain(gone);
    }
    expect(await rows("select table_name, column_name from information_schema.columns where table_schema = 'public' and column_name = 'candidate_id'")).toEqual([]);
    expect(await rows("select filename from documents order by filename")).toEqual([{ filename: "rahmenvertrag.pdf" }, { filename: "rapport.pdf" }]);
    // The candidates' history goes with them; the rest stays.
    expect(await rows("select body from activities where body like '%Kandidat%'")).toEqual([]);
    expect(await rows("select body from activities where body = 'Firma bleibt'")).toEqual([{ body: "Firma bleibt" }]);
    expect(await rows("select number from contracts order by number")).toEqual([{ number: "V-2026-0002" }]);
    expect(await rows("select action, entity, summary from audit_log where entity = 'settings'")).toEqual([
      { action: "delete", entity: "settings", summary: "Alte Kandidatendaten gelöscht: 2 Profile, 2 Dokumente, Tabellen entfernt" },
    ]);

    // The owner rules now hold as on a database that never had candidates.
    await expect(client.query("insert into activities (body) values ('Ohne Bezug')")).rejects.toThrow(/activities_owner/);
    await expect(
      client.query(
        "insert into documents (company_id, assignment_id, kind, filename, mime_type, size_bytes, sha256, content) values (1, $1, 'sonstiges', 'x.pdf', 'application/pdf', 1, 'x', '\\x00')",
        [assignment.id],
      ),
    ).rejects.toThrow(/documents_owner/);
    expect(await dormantCandidateData()).toBeNull();
    expect(await deleteDormantCandidates()).toMatchObject({ status: "error" });
  });
});
