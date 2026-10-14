import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrations, migrationsThrough } from "@/lib/admin/db/migrations";
import * as schema from "@/lib/admin/db/schema";

/**
 * The Drizzle schema (used by the code) and the SQL migrations (used by the database) are
 * written by hand. This test applies the migrations to an empty database and checks that
 * every table and column of the schema exists there with the same type and nullability. It
 * also runs older migrations on data written before them. Fictional sample data only.
 */

const url = process.env.TEST_DATABASE_URL;
const tables: PgTable[] = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable));

describe.skipIf(!url)("database schema", () => {
  const client = new Client({ connectionString: url });

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    for (const m of migrations) await client.query(m.sql);
  });

  afterAll(async () => {
    await client.end();
  });

  it("has a migration for every table and column", async () => {
    expect(tables.length).toBeGreaterThanOrEqual(12);
    const { rows } = await client.query<{ table_name: string; column_name: string; data_type: string; udt_name: string; is_nullable: string }>(
      "select table_name, column_name, data_type, udt_name, is_nullable from information_schema.columns where table_schema = 'public'",
    );
    const db = new Map(rows.map((r) => [`${r.table_name}.${r.column_name}`, r]));
    const problems: string[] = [];
    for (const table of tables) {
      const config = getTableConfig(table);
      for (const col of config.columns) {
        const key = `${config.name}.${col.name}`;
        const actual = db.get(key);
        if (!actual) {
          problems.push(`${key}: fehlt in der Migration`);
          continue;
        }
        db.delete(key);
        const expectedType = col.getSQLType().replace(/\(.*\)/, "").replace("[]", "");
        const actualType = actual.data_type === "ARRAY" ? actual.udt_name.replace(/^_/, "") : actual.data_type;
        const normalise = (t: string) =>
          ({
            "timestamp with time zone": "timestamp",
            "character varying": "varchar",
            int8: "bigint",
            int4: "integer",
            int2: "smallint",
          })[t] ?? t;
        if (normalise(expectedType) !== normalise(actualType) && !(expectedType === "timestamp" && actualType.startsWith("timestamp"))) {
          problems.push(`${key}: Typ ${actualType} statt ${expectedType}`);
        }
        if ((actual.is_nullable === "YES") !== !col.notNull) problems.push(`${key}: nullable ${actual.is_nullable}, Schema notNull ${col.notNull}`);
      }
    }
    for (const key of db.keys()) {
      if (!key.startsWith("admin_migrations.") && !key.startsWith("contact_requests.")) problems.push(`${key}: fehlt im Drizzle-Schema`);
    }
    expect(problems).toEqual([]);
  });

  it("removes the candidate module from an empty database and adds the new tables", async () => {
    const tableNames = async () =>
      (await client.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name);
    const names = await tableNames();
    for (const gone of ["candidates", "submissions", "candidate_accounts", "candidate_sessions", "change_requests", "vacancy_shares"]) {
      expect(names).not.toContain(gone);
    }
    expect(names).toEqual(expect.arrayContaining(["assignments", "snippets", "mandates", "contracts", "documents", "activities"]));
    const { rows } = await client.query<{ table_name: string; column_name: string }>(
      "select table_name, column_name from information_schema.columns where table_schema = 'public' and column_name in ('candidate_id', 'portal_visibility', 'portal_title', 'portal_rate')",
    );
    expect(rows).toEqual([]);
  });

  it("enforces the owner of documents and notes, including assignments", async () => {
    await client.query("insert into companies (name, kind) values ('Muster Vermittlung AG', 'auftraggeber')");
    await client.query("insert into mandates (title, company_id) values ('Business Analyst', 1)");
    await client.query("insert into assignments (title, company_id, mandate_id, rate_amount) values ('Business Analyst', 1, 1, 120)");
    await client.query("insert into contracts (number, title, assignment_id) values ('V-2026-0001', 'Einzelauftrag', 1)");
    const doc = (owners: string, values: string) =>
      client.query(`insert into documents (${owners}, kind, filename, mime_type, size_bytes, sha256, content) values (${values}, 'rapport', 'r.pdf', 'application/pdf', 1, 'x', '\\x00')`);
    await doc("assignment_id", "1");
    await doc("contract_id", "1");
    // No owner, or two owners, is refused.
    await expect(client.query("insert into documents (kind, filename, mime_type, size_bytes, sha256, content) values ('rapport', 'r.pdf', 'application/pdf', 1, 'x', '\\x00')")).rejects.toThrow(
      /documents_owner/,
    );
    await expect(doc("assignment_id, company_id", "1, 1")).rejects.toThrow(/documents_owner/);
    await expect(doc("assignment_id", "1").then(() => client.query("update documents set kind = 'dossier' where assignment_id = 1"))).rejects.toThrow(
      /documents_kind_check/,
    );
    // A note may belong to several records, but to at least one.
    await client.query("insert into activities (assignment_id, contract_id, body) values (1, 1, 'Vertrag abgelegt')");
    await expect(client.query("insert into activities (body) values ('Ohne Bezug')")).rejects.toThrow(/activities_owner/);
    // New fields of assignments, snippets, vacancies and contracts with their defaults and rules.
    const a = await client.query("select status, workload, rate_unit, billing, rate_basis, expenses_monthly from assignments where id = 1");
    expect(a.rows[0]).toEqual({ status: "laufend", workload: 100, rate_unit: "stunde", billing: "rechnung", rate_basis: "brutto", expenses_monthly: "0.00" });
    await expect(client.query("insert into assignments (title, billing) values ('X', 'bar')")).rejects.toThrow(/assignments_billing_check/);
    await expect(client.query("insert into assignments (title, start_date, end_date) values ('X', '2026-10-01', '2026-09-30')")).rejects.toThrow(/assignments_period/);
    await expect(client.query("insert into assignments (title, workload) values ('X', 0)")).rejects.toThrow(/assignments_workload_check/);
    await client.query("insert into snippets (title, body, company_id, pinned) values ('Kurzprofil', 'Text', 1, true)");
    await client.query("update mandates set url = 'https://example.ch/job', applied_at = '2026-10-10', application_text = 'Text' where id = 1");
    const c = await client.query("insert into contracts (number, title, notice_period) values ('V-2026-0002', 'NDA', '1 Monat') returning template");
    expect(c.rows[0]).toEqual({ template: "sonstiges" });
    // Deleting the assignment takes its documents and notes along and keeps the contract.
    await client.query("delete from assignments where id = 1");
    expect((await client.query("select count(*)::int as n from documents where contract_id is null")).rows[0]).toEqual({ n: 0 });
    expect((await client.query("select assignment_id from contracts where id = 1")).rows[0]).toEqual({ assignment_id: null });
  });

  it("keeps stored candidates and their data, and still adds the new tables", async () => {
    await client.query("drop schema public cascade; create schema public;");
    for (const m of migrationsThrough("0003_consent_scope_contract_sent")) await client.query(m.sql);
    await client.query("insert into companies (name, kind) values ('Muster Vermittlung AG', 'auftraggeber')");
    await client.query("insert into candidates (first_name, last_name) values ('Test', 'Person')");
    await client.query("insert into mandates (title, company_id, portal_visibility) values ('Business Analyst', 1, 'alle')");
    await client.query("insert into submissions (mandate_id, candidate_id, consent_at, consent_method) values (1, 1, now(), 'email')");
    await client.query(
      "insert into documents (candidate_id, kind, filename, mime_type, size_bytes, sha256, content) values (1, 'cv', 'cv.pdf', 'application/pdf', 1, 'x', '\\x00')",
    );
    await client.query("insert into login_attempts (scope, ip_hash, success) values ('portal', 'ip-1', false), ('admin', 'ip-2', false)");
    const last = migrations[migrations.length - 1];
    expect(last.id).toBe("0004_personal_admin");
    await client.query(last.sql);

    // The candidate data stays untouched.
    expect((await client.query("select first_name, last_name from candidates")).rows).toEqual([{ first_name: "Test", last_name: "Person" }]);
    expect((await client.query("select mandate_id, candidate_id, consent_method from submissions")).rows).toEqual([
      { mandate_id: "1", candidate_id: "1", consent_method: "email" },
    ]);
    expect((await client.query("select candidate_id, filename from documents")).rows).toEqual([{ candidate_id: "1", filename: "cv.pdf" }]);
    expect((await client.query("select scope from login_attempts order by scope")).rows).toEqual([{ scope: "admin" }, { scope: "portal" }]);
    // The portal columns of vacancies go in any case; the new fields are there.
    const cols = await client.query<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'mandates'");
    expect(cols.rows.map((r) => r.column_name)).toEqual(expect.arrayContaining(["url", "applied_at", "application_text"]));
    expect(cols.rows.map((r) => r.column_name)).not.toContain("portal_visibility");

    // New records work next to the old ones.
    await client.query("insert into assignments (title, company_id) values ('Business Analyst', 1)");
    await client.query("insert into snippets (title, body) values ('Kurzprofil', 'Text')");
    await client.query(
      "insert into documents (assignment_id, kind, filename, mime_type, size_bytes, sha256, content) values (1, 'rapport', 'r.pdf', 'application/pdf', 1, 'x', '\\x00')",
    );
    await client.query("insert into activities (assignment_id, body) values (1, 'Auftrag erfasst')");
    // The owner rule counts candidates too: one owner per document.
    await expect(
      client.query(
        "insert into documents (assignment_id, candidate_id, kind, filename, mime_type, size_bytes, sha256, content) values (1, 1, 'rapport', 'r.pdf', 'application/pdf', 1, 'x', '\\x00')",
      ),
    ).rejects.toThrow(/documents_owner/);
    await expect(client.query("insert into activities (body) values ('Ohne Bezug')")).rejects.toThrow(/activities_owner/);
  });

  it("moves consent and withdrawals written as text into the new columns", async () => {
    await client.query("drop schema public cascade; create schema public;");
    const consentColumns = migrations.findIndex((m) => m.id === "0002_consent_columns");
    for (const m of migrations.slice(0, consentColumns)) await client.query(m.sql);
    await client.query("insert into candidates (first_name, last_name) values ('Test', 'Person')");
    await client.query("insert into mandates (title) select 'Mandat ' || n from generate_series(1, 8) n");
    const legacy: [string | null, string, string | null][] = [
      ["now()", "Widerruf am 05.10.2026 (E-Mail): möchte nicht mehr", null],
      [null, "Widerruf am 31.02.2026 (E-Mail)", null],
      ["now()", "Im Kandidatenportal bestätigt am 14.10.2026, 10:00", null],
      ["now()", "Im Kandidatenportal bestätigt am 14.10.2026, 10:00; im Kandidatenportal zurückgezogen am 15.10.2026, 11:00, keine weitere Weitergabe", "now()"],
      [null, "Einwilligung im Kandidatenportal zurückgezogen am 15.10.2026, 11:00", null],
      ["now()", "Mündlich: Telefon 13.10.2026", null],
      ["now()", "Einwilligung V-2026-0003", null],
      ["now()", "E-Mail", null],
    ];
    for (const [i, [consentAt, note, submittedAt]] of legacy.entries()) {
      await client.query(
        `insert into submissions (mandate_id, candidate_id, consent_at, consent_note, submitted_at) values ($1, 1, ${consentAt ?? "null"}, $2, ${submittedAt ?? "null"})`,
        [i + 1, note],
      );
    }
    await client.query(migrations[consentColumns].sql);
    const { rows } = await client.query<{ consent: boolean; consent_method: string | null; consent_note: string | null; withdrawn: string | null; withdrawal_note: string | null }>(
      "select consent_at is not null as consent, consent_method, consent_note, to_char(withdrawn_at at time zone 'Europe/Zurich', 'YYYY-MM-DD') as withdrawn, withdrawal_note from submissions order by mandate_id",
    );
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
    expect(rows).toEqual([
      { consent: true, consent_method: null, consent_note: null, withdrawn: "2026-10-05", withdrawal_note: "E-Mail: möchte nicht mehr" },
      // An impossible date does not stop the migration; the withdrawal counts from now on.
      { consent: false, consent_method: null, consent_note: null, withdrawn: today, withdrawal_note: "Widerruf am 31.02.2026 (E-Mail)" },
      { consent: true, consent_method: "portal", consent_note: "Im Kandidatenportal bestätigt am 14.10.2026, 10:00", withdrawn: null, withdrawal_note: null },
      {
        consent: true,
        consent_method: "portal",
        consent_note: "Im Kandidatenportal bestätigt am 14.10.2026, 10:00",
        withdrawn: today,
        withdrawal_note: "Im Kandidatenportal zurückgezogen am 15.10.2026, 11:00, keine weitere Weitergabe",
      },
      { consent: false, consent_method: null, consent_note: null, withdrawn: today, withdrawal_note: "Im Kandidatenportal zurückgezogen am 15.10.2026, 11:00" },
      { consent: true, consent_method: "muendlich", consent_note: "Telefon 13.10.2026", withdrawn: null, withdrawal_note: null },
      { consent: true, consent_method: "vertrag", consent_note: "Einwilligung V-2026-0003", withdrawn: null, withdrawal_note: null },
      { consent: true, consent_method: "email", consent_note: null, withdrawn: null, withdrawal_note: null },
    ]);
  });

  it("gives existing consents their scope and existing contracts their sending date", async () => {
    await client.query("drop schema public cascade; create schema public;");
    const scopeColumns = migrations.findIndex((m) => m.id === "0003_consent_scope_contract_sent");
    expect(scopeColumns).toBeGreaterThan(0);
    for (const m of migrations.slice(0, scopeColumns)) await client.query(m.sql);
    await client.query("insert into candidates (first_name, last_name) values ('Test', 'Person')");
    await client.query("insert into mandates (title) select 'Mandat ' || n from generate_series(1, 6) n");
    const legacy: [string | null, string, string | null][] = [
      // consent method, dossier variant, withdrawn
      ["portal", "namentlich", null],
      ["portal", "anonym", null],
      ["email", "namentlich", null],
      ["vertrag", "anonym", null],
      ["email", "namentlich", "now()"],
      [null, "namentlich", null],
    ];
    for (const [i, [method, variant, withdrawnAt]] of legacy.entries()) {
      await client.query(
        `insert into submissions (mandate_id, candidate_id, consent_at, consent_method, profile_variant, withdrawn_at) values ($1, 1, ${method ? "now()" : "null"}, $2, $3, ${withdrawnAt ?? "null"})`,
        [i + 1, method, variant],
      );
    }
    const sentOn = "2026-09-01T08:00:00Z";
    const changedOn = "2026-09-20T08:00:00Z";
    await client.query(
      `insert into contracts (number, template, title, status, updated_at) values
         ('V-2026-0001', 'nda', 'Versendet', 'versendet', $1),
         ('V-2026-0002', 'nda', 'Wieder geöffnet', 'entwurf', $1),
         ('V-2026-0003', 'nda', 'Versendet ohne Protokoll', 'versendet', $1),
         ('V-2026-0004', 'nda', 'Nie versendet', 'entwurf', $1)`,
      [changedOn],
    );
    await client.query(
      `insert into audit_log (at, action, entity, entity_id, summary) values
         ($1, 'update', 'contract', 1, 'Vertrag V-2026-0001: Status versendet'),
         ($1, 'update', 'contract', 2, 'Vertrag V-2026-0002: Status versendet'),
         ($2, 'update', 'contract', 2, 'Vertrag V-2026-0002: Status entwurf'),
         ($2, 'update', 'contract', 4, 'Vertrag V-2026-0004: Status entwurf')`,
      [sentOn, changedOn],
    );
    await client.query(migrations[scopeColumns].sql);
    const { rows } = await client.query<{ consent_scope: string | null }>("select consent_scope from submissions order by mandate_id");
    // Portal consents never covered the name; a withdrawn consent covers nothing.
    expect(rows.map((r) => r.consent_scope)).toEqual(["anonym", "anonym", "namentlich", "anonym", null, null]);
    const contracts = await client.query<{ number: string; sent_at: Date | null }>("select number, sent_at from contracts order by number");
    expect(contracts.rows.map((r) => [r.number, r.sent_at?.toISOString() ?? null])).toEqual([
      ["V-2026-0001", new Date(sentOn).toISOString()],
      ["V-2026-0002", new Date(sentOn).toISOString()],
      ["V-2026-0003", new Date(changedOn).toISOString()],
      ["V-2026-0004", null],
    ]);
  });
});
