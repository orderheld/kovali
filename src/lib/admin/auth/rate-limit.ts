import "server-only";
import { and, count, eq, gt, lt, notLike } from "drizzle-orm";
import { hashLoginName } from "../crypto";
import { getDb } from "../db/client";
import { loginAttempts } from "../db/schema";

/**
 * Login throttling for the admin login and the candidate portal, counted separately so that
 * failed portal logins never lock Ferhat out of the admin: at most 5 failed attempts per IP
 * in 15 minutes, and at most 50 (admin) or 200 (portal) failed attempts in total per hour.
 *
 * Portal logins are also counted per account (keyed hash of the e-mail address), so guesses
 * against one account are capped whatever the IP: at most 10 failures in 15 minutes. These
 * rows share the table with the IP rows; their ip_hash starts with "acct:" and they are left
 * out of the per-IP and the global count.
 *
 * A successful admin login clears that IP's admin failures (there is only one admin account).
 * A successful portal login clears nothing: other candidates' accounts stay protected, and
 * failures expire through the time windows and the 30-day cleanup.
 */
export type LoginScope = "admin" | "portal";

/** Exported for the record of processing activities (privacy.ts), which states them. */
export const PER_IP_LIMIT = 5;
export const PER_ACCOUNT_LIMIT = 10;
export const LOGIN_WINDOW_MINUTES = 15;
const PER_IP_WINDOW_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;
const PER_ACCOUNT_WINDOW_MS = PER_IP_WINDOW_MS;
const GLOBAL_LIMIT: Record<LoginScope, number> = { admin: 50, portal: 200 };
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const ACCOUNT_PREFIX = "acct:";

/** Throttle key of a login name (e-mail); never the address itself. */
export function accountThrottleKey(email: string): string {
  return `${ACCOUNT_PREFIX}${hashLoginName(email)}`;
}

async function failuresSince(scope: LoginScope, key: string | null, since: Date): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, scope),
        key ? eq(loginAttempts.ipHash, key) : notLike(loginAttempts.ipHash, `${ACCOUNT_PREFIX}%`),
        eq(loginAttempts.success, false),
        gt(loginAttempts.at, since),
      ),
    );
  return row?.n ?? 0;
}

/**
 * True when the IP, the account (when an account key is given) or the scope as a whole has
 * reached its limit of failed attempts.
 */
export async function loginBlocked(scope: LoginScope, ipHash: string, accountKey?: string): Promise<boolean> {
  const now = Date.now();
  if ((await failuresSince(scope, ipHash, new Date(now - PER_IP_WINDOW_MS))) >= PER_IP_LIMIT) return true;
  if (accountKey && (await failuresSince(scope, accountKey, new Date(now - PER_ACCOUNT_WINDOW_MS))) >= PER_ACCOUNT_LIMIT) return true;
  return (await failuresSince(scope, null, new Date(now - GLOBAL_WINDOW_MS))) >= GLOBAL_LIMIT[scope];
}

/** Records an attempt for the IP and, for a failure with an account key, for the account too. */
export async function recordLoginAttempt(scope: LoginScope, ipHash: string, success: boolean, accountKey?: string): Promise<void> {
  const db = await getDb();
  await db.insert(loginAttempts).values([
    { scope, ipHash, success },
    ...(accountKey && !success ? [{ scope, ipHash: accountKey, success }] : []),
  ]);
  if (success && scope === "admin") {
    // A successful admin login clears this IP's admin failures.
    await db
      .delete(loginAttempts)
      .where(and(eq(loginAttempts.scope, scope), eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.success, false)));
  }
  // Entries older than 30 days are not needed.
  await db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
}
