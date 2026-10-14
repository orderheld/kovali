import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { adminEnv } from "../env";
import { migrations } from "./migrations";
import * as schema from "./schema";

/**
 * Database access for the admin area (node-postgres; works with Neon's pooled connection
 * string and with a local Postgres). One small pool per server instance. Migrations run once
 * per instance before the first query.
 */

export type AdminDb = NodePgDatabase<typeof schema>;

/** Advisory lock key of the migrations; also taken by changes to the table structure at runtime. */
export const MIGRATION_LOCK = 724_211_001;

declare global {
  // Survives hot reloads in development.
  var __kovaliAdminDb: { pool: Pool; db: AdminDb; ready: Promise<void> } | undefined;
}

function sslFor(url: string): false | { rejectUnauthorized: boolean } {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1" ? false : { rejectUnauthorized: true };
}

async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK]);
    await client.query(
      "create table if not exists admin_migrations (id text primary key, applied_at timestamptz not null default now())",
    );
    const { rows } = await client.query<{ id: string }>("select id from admin_migrations");
    const applied = new Set(rows.map((r) => r.id));
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      await client.query("begin");
      try {
        await client.query(migration.sql);
        await client.query("insert into admin_migrations (id) values ($1)", [migration.id]);
        await client.query("commit");
        console.info(JSON.stringify({ event: "admin.migration_applied", id: migration.id }));
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => {});
    client.release();
  }
}

function init() {
  const url = adminEnv.databaseUrl;
  if (!url) throw new Error("DATABASE_URL fehlt.");
  const pool = new Pool({ connectionString: url, ssl: sslFor(url), max: 5, idleTimeoutMillis: 10_000 });
  // An idle connection dropped by the server must not crash the process.
  pool.on("error", (error) => console.error(JSON.stringify({ event: "admin.db_pool_error", error: String(error) })));
  attachDatabasePool(pool);
  const db = drizzle(pool, { schema });
  const ready = migrate(pool);
  // A failed migration must not stay cached forever; the next request tries again.
  ready.catch(() => {
    globalThis.__kovaliAdminDb = undefined;
  });
  return { pool, db, ready };
}

/** Returns the database once all migrations have run. */
export async function getDb(): Promise<AdminDb> {
  globalThis.__kovaliAdminDb ??= init();
  const state = globalThis.__kovaliAdminDb;
  await state.ready;
  return state.db;
}
