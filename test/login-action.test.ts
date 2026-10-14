import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The login action against a real Postgres (TEST_DATABASE_URL, wiped here): parallel requests
 * cannot pass the limits, wrong passwords never lock the login, wrong codes with the right
 * password do. The client IP, the session cookie and redirect() are stubbed; password check,
 * TOTP and throttling are the real code. Password and TOTP secret are fictional test values.
 */

const PASSWORD = "test-passwort-fuer-vitest";
const TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { pbkdf2Sync } = process.getBuiltinModule("node:crypto");
  const salt = Buffer.alloc(16, 3);
  const hash = pbkdf2Sync("test-passwort-fuer-vitest", salt, 100_000, 32, "sha256");
  process.env.ADMIN_PASSWORD_HASH = `pbkdf2-sha256:100000:${salt.toString("base64url")}:${hash.toString("base64url")}`;
  process.env.ADMIN_SECRET = Buffer.alloc(32, 5).toString("base64url");
  process.env.ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
});

/** The IP of the next login() call; read when the call starts. */
let currentIp = "ip-0";
vi.mock("@/lib/admin/request", () => ({
  requestIp: () => Promise.resolve(currentIp),
  requestIpHash: () => Promise.resolve(currentIp),
  requestUserAgent: () => Promise.resolve(null),
}));
vi.mock("@/lib/admin/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/auth/session")>()),
  createAdminSession: vi.fn(async () => {}),
}));
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), redirect: vi.fn() }));

const url = process.env.TEST_DATABASE_URL;
const idle = { status: "idle" } as const;

describe.skipIf(!url)("admin login (database)", () => {
  const client = new Client({ connectionString: url });
  let login: typeof import("@/app/admin/login/actions").login;
  let limits: typeof import("@/lib/admin/auth/rate-limit");
  let codes: { valid: string[]; wrong: string };

  const form = (password: string, code: string) => {
    const fd = new FormData();
    fd.set("password", password);
    fd.set("code", code);
    return fd;
  };
  /** Starts login() for one IP; the IP is read synchronously when the call starts. */
  const attempt = (ip: string, password: string, code: string) => {
    currentIp = ip;
    return login(idle, form(password, code));
  };
  const count = async (where: string) => Number((await client.query<{ n: string }>(`select count(*) as n from login_attempts where ${where}`)).rows[0].n);

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    ({ login } = await import("@/app/admin/login/actions"));
    limits = await import("@/lib/admin/auth/rate-limit");
    const { base32Decode, totpCode } = await import("@/lib/admin/auth/totp");
    const secret = base32Decode(TOTP_SECRET);
    const step = Math.floor(Date.now() / 30_000);
    const valid = [step - 1, step, step + 1].map((s) => totpCode(secret, s));
    const wrong = ["111111", "222222", "333333", "444444"].find((c) => !valid.includes(c))!;
    codes = { valid, wrong };
  });

  beforeEach(async () => {
    await client.query("delete from login_attempts; delete from settings where key = 'admin_totp_last_step'");
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("lets only 5 of 30 parallel wrong logins from one address check the password", async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => attempt("ip-burst", "falsch", codes.wrong)));
    const messages = results.map((r) => (r && r.status === "error" ? r.message : "ok"));
    expect(messages.filter((m) => m === "Passwort oder Code ist nicht korrekt.")).toHaveLength(limits.PER_IP_LIMIT);
    expect(messages.filter((m) => m?.startsWith("Zu viele Fehlversuche von dieser Adresse"))).toHaveLength(30 - limits.PER_IP_LIMIT);
    expect(await count("not success")).toBe(limits.PER_IP_LIMIT);

    // Another address with password and code still gets in.
    expect(await attempt("ip-ferhat", PASSWORD, codes.valid[1])).toBeUndefined();
  });

  it("keeps the login open after many wrong passwords from other addresses", async () => {
    await client.query("insert into login_attempts (scope, ip_hash, success) select 'admin', 'ip-x' || g, false from generate_series(1, 60) g");
    expect(await attempt("ip-ferhat", PASSWORD, codes.valid[1])).toBeUndefined();
    expect(await count("success")).toBe(1);
  });

  it("locks every login after 10 wrong codes with the right password, also in parallel", async () => {
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => attempt(`ip-guess-${i}`, PASSWORD, codes.wrong)));
    expect(results.every((r) => r?.status === "error")).toBe(true);
    expect(await count("kind = 'code' and not success")).toBe(limits.GLOBAL_CODE_LIMIT);
    const locked = await attempt("ip-ferhat", PASSWORD, codes.valid[1]);
    expect(locked).toMatchObject({ status: "error", message: expect.stringContaining("für bis zu eine Stunde gesperrt") });
  });

  it("accepts each code only once", async () => {
    expect(await attempt("ip-ferhat", PASSWORD, codes.valid[1])).toBeUndefined();
    expect(await attempt("ip-ferhat", PASSWORD, codes.valid[1])).toMatchObject({ status: "error", message: "Passwort oder Code ist nicht korrekt." });
    expect(await count("kind = 'code' and not success")).toBe(1);
  });
});
