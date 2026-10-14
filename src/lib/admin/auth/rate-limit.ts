import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { loginAttempts } from "../db/schema";

/**
 * Login throttling for the admin login: at most 5 failed attempts per IP in 15 minutes, and at
 * most 50 failed attempts in total per hour. A successful login clears that IP's failures
 * (there is only one account). Rows of the former candidate portal (scope "portal") are
 * ignored.
 */
const SCOPE = "admin";

export const PER_IP_LIMIT = 5;
export const LOGIN_WINDOW_MINUTES = 15;
export const GLOBAL_LIMIT = 50;
const PER_IP_WINDOW_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

async function failuresSince(ipHash: string | null, since: Date): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, SCOPE),
        ipHash ? eq(loginAttempts.ipHash, ipHash) : undefined,
        eq(loginAttempts.success, false),
        gt(loginAttempts.at, since),
      ),
    );
  return row?.n ?? 0;
}

/** True when the IP or the login as a whole has reached its limit of failed attempts. */
export async function loginBlocked(ipHash: string): Promise<boolean> {
  const now = Date.now();
  if ((await failuresSince(ipHash, new Date(now - PER_IP_WINDOW_MS))) >= PER_IP_LIMIT) return true;
  return (await failuresSince(null, new Date(now - GLOBAL_WINDOW_MS))) >= GLOBAL_LIMIT;
}

export async function recordLoginAttempt(ipHash: string, success: boolean): Promise<void> {
  const db = await getDb();
  await db.insert(loginAttempts).values({ scope: SCOPE, ipHash, success });
  if (success) {
    await db.delete(loginAttempts).where(and(eq(loginAttempts.scope, SCOPE), eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.success, false)));
  }
  // Entries older than 30 days are not needed.
  await db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
}
