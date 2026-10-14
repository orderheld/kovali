import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The database client and the key derivation read the environment when they are first
// imported (vi.hoisted runs first). The secret is a fixed test value.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ADMIN_SECRET = Buffer.alloc(32, 7).toString("base64url");
});

import { GLOBAL_LIMIT, loginBlocked, PER_IP_LIMIT, recordLoginAttempt } from "./rate-limit";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("login throttle (database)", () => {
  const client = new Client({ connectionString: url });
  const ip = (n: number) => `ip-${n}`;

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("../db/client");
    await getDb();
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("blocks an IP after 5 failures and clears them after a successful login", async () => {
    for (let i = 0; i < PER_IP_LIMIT - 1; i++) await recordLoginAttempt(ip(1), false);
    expect(await loginBlocked(ip(1))).toBe(false);
    await recordLoginAttempt(ip(1), false);
    expect(await loginBlocked(ip(1))).toBe(true);
    // Another address is not affected.
    expect(await loginBlocked(ip(2))).toBe(false);

    await client.query("delete from login_attempts");
    for (let i = 0; i < 4; i++) await recordLoginAttempt(ip(7), false);
    await recordLoginAttempt(ip(7), true);
    const { rows } = await client.query<{ n: string }>("select count(*) as n from login_attempts where ip_hash = $1 and not success", [ip(7)]);
    expect(Number(rows[0].n)).toBe(0);
  });

  it("blocks every login once the hourly total is reached", async () => {
    await client.query("delete from login_attempts");
    await client.query(
      "insert into login_attempts (scope, ip_hash, success) select 'admin', 'ip-x' || g, false from generate_series(1, $1::int - 1) g",
      [GLOBAL_LIMIT],
    );
    expect(await loginBlocked(ip(5000))).toBe(false);
    await recordLoginAttempt(ip(5001), false);
    expect(await loginBlocked(ip(5000))).toBe(true);
  });

  it("ignores rows of the former candidate portal", async () => {
    await client.query("delete from login_attempts");
    await client.query("insert into login_attempts (scope, ip_hash, success) select 'portal', 'ip-9', false from generate_series(1, 60)");
    expect(await loginBlocked(ip(9))).toBe(false);
  });
});
