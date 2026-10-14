import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The database client and the key derivation read the environment when they are first
// imported (vi.hoisted runs first). The secret is a fixed test value.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ADMIN_SECRET = Buffer.alloc(32, 7).toString("base64url");
});

import { checkLoginCode, GLOBAL_CODE_LIMIT, PER_IP_LIMIT, reserveLoginAttempt } from "./rate-limit";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("login throttle (database)", () => {
  const client = new Client({ connectionString: url });
  const ip = (n: number) => `ip-${n}`;
  const failures = async (where = "true") =>
    Number((await client.query<{ n: string }>(`select count(*) as n from login_attempts where not success and ${where}`)).rows[0].n);
  /** A wrong password: the reservation simply stays a failure. */
  const wrongPassword = (n: number) => reserveLoginAttempt(ip(n));
  /** The right password with a right or wrong code. */
  async function withCode(n: number, codeOk: boolean) {
    const r = await reserveLoginAttempt(ip(n));
    if (r.status !== "ok") return r.status;
    return checkLoginCode(r.id, ip(n), async () => codeOk);
  }

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
    for (let i = 0; i < PER_IP_LIMIT; i++) expect((await wrongPassword(1)).status).toBe("ok");
    expect(await wrongPassword(1)).toEqual({ status: "ip_blocked" });
    // Refused attempts are not recorded, so they do not extend the block.
    expect(await failures(`ip_hash = '${ip(1)}'`)).toBe(PER_IP_LIMIT);
    // Another address is not affected.
    expect((await wrongPassword(2)).status).toBe("ok");

    await client.query("delete from login_attempts");
    for (let i = 0; i < PER_IP_LIMIT - 1; i++) await wrongPassword(7);
    expect(await withCode(7, true)).toBe("ok");
    expect(await failures(`ip_hash = '${ip(7)}'`)).toBe(0);
    expect((await client.query("select success, kind from login_attempts where ip_hash = $1", [ip(7)])).rows).toEqual([{ success: true, kind: "password" }]);
  });

  it("counts parallel attempts of one IP: no more than the limit get through", async () => {
    await client.query("delete from login_attempts");
    const results = await Promise.all(Array.from({ length: 30 }, () => wrongPassword(3)));
    expect(results.filter((r) => r.status === "ok")).toHaveLength(PER_IP_LIMIT);
    expect(results.filter((r) => r.status === "ip_blocked")).toHaveLength(30 - PER_IP_LIMIT);
    expect(await failures()).toBe(PER_IP_LIMIT);
  });

  it("does not lock the login for wrong passwords from many addresses", async () => {
    await client.query("delete from login_attempts");
    await client.query("insert into login_attempts (scope, ip_hash, success) select 'admin', 'ip-x' || g, false from generate_series(1, 500) g");
    expect(await withCode(5000, true)).toBe("ok");
  });

  it("locks every login after 10 wrong codes with the right password, also parallel ones", async () => {
    await client.query("delete from login_attempts");
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => withCode(100 + i, false)));
    expect(results.filter((r) => r === "wrong")).toHaveLength(GLOBAL_CODE_LIMIT);
    expect(await failures("kind = 'code'")).toBe(GLOBAL_CODE_LIMIT);
    // Now even the right password with the right code is refused, from any address.
    expect(await withCode(6000, true)).toBe("code_locked");
    expect(await wrongPassword(6001)).toEqual({ status: "code_locked" });
    // After an hour the attempts no longer count.
    await client.query("update login_attempts set at = now() - interval '61 minutes'");
    expect(await withCode(6000, true)).toBe("ok");
  });

  it("ignores rows of the former candidate portal", async () => {
    await client.query("delete from login_attempts");
    await client.query("insert into login_attempts (scope, ip_hash, success, kind) select 'portal', 'ip-9', false, 'code' from generate_series(1, 60)");
    expect((await wrongPassword(9)).status).toBe("ok");
  });
});
