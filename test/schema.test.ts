import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrations } from "@/lib/admin/db/migrations";
import * as schema from "@/lib/admin/db/schema";

/**
 * The Drizzle schema (used by the code) and the SQL migrations (used by the database) are
 * written by hand. This test applies the migrations to an empty database and checks that
 * every table and column of the schema exists there with the same type and nullability.
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
    expect(tables.length).toBeGreaterThan(15);
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

  it("enforces consent before a profile is submitted", async () => {
    await client.query("insert into companies (name, kind) values ('Test AG', 'auftraggeber')");
    await client.query("insert into candidates (first_name, last_name) values ('Test', 'Person')");
    await client.query("insert into mandates (title) values ('Business Analyst')");
    await expect(
      client.query("insert into submissions (mandate_id, candidate_id, submitted_at) values (1, 1, now())"),
    ).rejects.toThrow(/submissions_consent_before_submit/);
  });

  it("keeps consent, withdrawal and objection columns consistent", async () => {
    await expect(client.query("insert into submissions (mandate_id, candidate_id, consent_at, consent_method) values (1, 1, now(), 'fax')")).rejects.toThrow(
      /submissions_consent_method_check/,
    );
    // A form of consent without its date says nothing.
    await expect(client.query("insert into submissions (mandate_id, candidate_id, consent_method) values (1, 1, 'email')")).rejects.toThrow(
      /submissions_consent_method_needs_consent/,
    );
    await expect(client.query("insert into submissions (mandate_id, candidate_id, withdrawal_note) values (1, 1, 'E-Mail')")).rejects.toThrow(
      /submissions_withdrawal_note_needs_date/,
    );
    await expect(client.query("update candidates set objection_note = 'E-Mail' where id = 1")).rejects.toThrow(/candidates_objection_note_needs_date/);
    // What a consent covers exists only with a consent, and only as one of the two dossiers.
    await expect(client.query("insert into submissions (mandate_id, candidate_id, consent_at, consent_scope) values (1, 1, now(), 'alles')")).rejects.toThrow(
      /submissions_consent_scope_check/,
    );
    await expect(client.query("insert into submissions (mandate_id, candidate_id, consent_scope) values (1, 1, 'anonym')")).rejects.toThrow(
      /submissions_consent_scope_needs_consent/,
    );
    // A withdrawal after a hand-over keeps the consent it was based on.
    await client.query(
      "insert into companies (name, kind) values ('Muster GmbH', 'subunternehmer'); " +
        "insert into submissions (mandate_id, candidate_id, consent_at, consent_method, submitted_at, subcontractor_company_id, withdrawn_at, withdrawal_note) " +
        "values (1, 1, now() - interval '2 days', 'portal', now() - interval '1 day', 2, now(), 'Im Kandidatenportal zurückgezogen')",
    );
    // The firm is a snapshot: deleting it later keeps the submission.
    await client.query("delete from companies where id = 2");
    const { rows } = await client.query("select consent_method, subcontractor_company_id, withdrawal_note from submissions where mandate_id = 1");
    expect(rows).toEqual([{ consent_method: "portal", subcontractor_company_id: null, withdrawal_note: "Im Kandidatenportal zurückgezogen" }]);
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
