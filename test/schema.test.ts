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
});
