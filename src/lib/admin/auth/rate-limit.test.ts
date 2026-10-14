import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The database client and the key derivation read the environment when they are first
// imported (vi.hoisted runs first). The secret is a fixed test value.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ADMIN_SECRET = Buffer.alloc(32, 7).toString("base64url");
});

import { accountThrottleKey, loginBlocked, recordLoginAttempt } from "./rate-limit";

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

  it("keys accounts by a hash of the normalised e-mail, never the address", () => {
    const key = accountThrottleKey(" Anna.Beispiel@Example.CH ");
    expect(key).toBe(accountThrottleKey("anna.beispiel@example.ch"));
    expect(key).not.toBe(accountThrottleKey("beat.muster@example.ch"));
    expect(key).toMatch(/^acct:[A-Za-z0-9_-]{22}$/);
    expect(key).not.toContain("anna");
  });

  it("does not clear the IP's portal failures on a successful portal login", async () => {
    for (let i = 0; i < 4; i++) await recordLoginAttempt("portal", ip(1), false);
    expect(await loginBlocked("portal", ip(1))).toBe(false);
    // Someone with a valid account of their own logs in from the same IP …
    await recordLoginAttempt("portal", ip(1), true);
    // … and the earlier failures still count.
    await recordLoginAttempt("portal", ip(1), false);
    expect(await loginBlocked("portal", ip(1))).toBe(true);
    const { rows } = await client.query<{ n: string }>("select count(*) as n from login_attempts where scope = 'portal' and ip_hash = $1 and not success", [ip(1)]);
    expect(Number(rows[0].n)).toBe(5);
  });

  it("caps failures against one account across IPs", async () => {
    const target = accountThrottleKey("anna.beispiel@example.ch");
    const other = accountThrottleKey("beat.muster@example.ch");
    for (let i = 0; i < 10; i++) {
      expect(await loginBlocked("portal", ip(100 + i), target)).toBe(false);
      await recordLoginAttempt("portal", ip(100 + i), false, target);
    }
    // A fresh IP is blocked for this account, but not for another one.
    expect(await loginBlocked("portal", ip(200), accountThrottleKey("ANNA.beispiel@example.ch"))).toBe(true);
    expect(await loginBlocked("portal", ip(200), other)).toBe(false);
    // The account rows never count as an IP.
    expect(await loginBlocked("portal", ip(200))).toBe(false);
  });

  it("counts each failed attempt once in the global limit", async () => {
    await client.query("delete from login_attempts");
    // 101 failures, each with an account row: double counting would reach the limit of 200.
    for (let i = 0; i < 101; i++) await recordLoginAttempt("portal", ip(1000 + i), false, accountThrottleKey(`person${i}@example.ch`));
    expect(await loginBlocked("portal", ip(5000), accountThrottleKey("neu@example.ch"))).toBe(false);
    await client.query(
      "insert into login_attempts (scope, ip_hash, success) select 'portal', 'ip-x' || g, false from generate_series(1, 99) g",
    );
    expect(await loginBlocked("portal", ip(5000))).toBe(true);
    // The admin login is counted separately.
    expect(await loginBlocked("admin", ip(5000))).toBe(false);
  });

  it("still clears the IP's admin failures after a successful admin login", async () => {
    for (let i = 0; i < 4; i++) await recordLoginAttempt("admin", ip(7), false);
    await recordLoginAttempt("admin", ip(7), true);
    const { rows } = await client.query<{ n: string }>("select count(*) as n from login_attempts where scope = 'admin' and ip_hash = $1 and not success", [ip(7)]);
    expect(Number(rows[0].n)).toBe(0);
  });
});
