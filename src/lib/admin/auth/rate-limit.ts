import "server-only";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { getDb, type AdminDb } from "../db/client";
import { loginAttempts } from "../db/schema";

/**
 * Login throttling for the admin login.
 *
 * - Per IP: at most 5 failed attempts in 15 minutes, of either kind.
 * - Whole login: after 10 attempts with the right password and a wrong code within an hour,
 *   every login is refused until those attempts are an hour old. Only someone who knows the
 *   password can cause this, so a stranger cannot lock Ferhat out by guessing passwords.
 *
 * Check and record are atomic: an attempt is reserved (recorded as a failure) under an advisory
 * lock before the password is checked, so concurrent requests see each other. The slow password
 * check runs outside the lock. A successful login turns its reservation into a success and
 * clears that IP's failures. Refused attempts are not recorded, so they never extend a block.
 * Rows of the former candidate portal (scope "portal") are ignored.
 */
const SCOPE = "admin";

export const PER_IP_LIMIT = 5;
export const LOGIN_WINDOW_MINUTES = 15;
/** Attempts with the right password and a wrong code, per hour, before the whole login locks. */
export const GLOBAL_CODE_LIMIT = 10;
export const CODE_LOCK_MINUTES = 60;
const PER_IP_WINDOW_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;
const CODE_WINDOW_MS = CODE_LOCK_MINUTES * 60 * 1000;
/** Serialises the counting and recording of login attempts across server instances. */
const LOGIN_LOCK = 724_211_002;

type Tx = Parameters<Parameters<AdminDb["transaction"]>[0]>[0];

async function lock(tx: Tx): Promise<void> {
  // Transaction-level, so it also works through Neon's pooled connection (PgBouncer).
  await tx.execute(sql`select pg_advisory_xact_lock(${LOGIN_LOCK})`);
}

async function ipFailures(tx: Tx, ipHash: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, SCOPE),
        eq(loginAttempts.ipHash, ipHash),
        eq(loginAttempts.success, false),
        gt(loginAttempts.at, new Date(Date.now() - PER_IP_WINDOW_MS)),
      ),
    );
  return row?.n ?? 0;
}

async function codeFailures(tx: Tx): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, SCOPE),
        eq(loginAttempts.kind, "code"),
        eq(loginAttempts.success, false),
        gt(loginAttempts.at, new Date(Date.now() - CODE_WINDOW_MS)),
      ),
    );
  return row?.n ?? 0;
}

export type LoginReservation = { status: "ok"; id: number } | { status: "ip_blocked" } | { status: "code_locked" };

/**
 * Before the password is checked: refuses when this IP has reached its limit or the login is
 * locked by wrong codes, otherwise records the attempt as a failed one and returns its id.
 */
export async function reserveLoginAttempt(ipHash: string): Promise<LoginReservation> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await lock(tx);
    if ((await codeFailures(tx)) >= GLOBAL_CODE_LIMIT) return { status: "code_locked" };
    if ((await ipFailures(tx, ipHash)) >= PER_IP_LIMIT) return { status: "ip_blocked" };
    const [row] = await tx.insert(loginAttempts).values({ scope: SCOPE, ipHash, success: false, kind: "password" }).returning({ id: loginAttempts.id });
    return { status: "ok", id: row.id };
  });
}

/**
 * After the password was correct: checks the code under the same lock, so concurrent guesses
 * cannot pass the code limit. `check` verifies the code (and claims its step) with the given
 * transaction. A wrong code turns the reserved attempt into a code failure; a right one into a
 * success, and that IP's failures are cleared.
 */
export async function checkLoginCode(attemptId: number, ipHash: string, check: (tx: Tx) => Promise<boolean>): Promise<"ok" | "wrong" | "locked"> {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    await lock(tx);
    if ((await codeFailures(tx)) >= GLOBAL_CODE_LIMIT) {
      // Another attempt locked the login meanwhile; this one stays a plain failure.
      return "locked" as const;
    }
    if (!(await check(tx))) {
      await tx.update(loginAttempts).set({ kind: "code" }).where(eq(loginAttempts.id, attemptId));
      return "wrong" as const;
    }
    await tx.update(loginAttempts).set({ success: true }).where(eq(loginAttempts.id, attemptId));
    await tx
      .delete(loginAttempts)
      .where(and(eq(loginAttempts.scope, SCOPE), eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.success, false)));
    return "ok" as const;
  });
  await removeOldAttempts();
  return result;
}

/** Entries older than 30 days are not needed. */
export async function removeOldAttempts(): Promise<void> {
  const db = await getDb();
  await db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
}
