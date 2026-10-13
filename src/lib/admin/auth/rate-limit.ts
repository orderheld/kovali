import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { loginAttempts } from "../db/schema";

/**
 * Login throttling shared by the admin login and the candidate portal: at most 5 failed
 * attempts per IP in 15 minutes, and at most 50 failed attempts in total per hour.
 */
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 15 * 60 * 1000;
const GLOBAL_LIMIT = 50;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

export async function loginBlocked(ipHash: string): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const [perIp] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipHash, ipHash),
        eq(loginAttempts.success, false),
        gt(loginAttempts.at, new Date(now - PER_IP_WINDOW_MS)),
      ),
    );
  if ((perIp?.n ?? 0) >= PER_IP_LIMIT) return true;
  const [global] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.success, false), gt(loginAttempts.at, new Date(now - GLOBAL_WINDOW_MS))));
  return (global?.n ?? 0) >= GLOBAL_LIMIT;
}

export async function recordLoginAttempt(ipHash: string, success: boolean): Promise<void> {
  const db = await getDb();
  await db.insert(loginAttempts).values({ ipHash, success });
  if (success) {
    // A successful login clears this IP's failures; old entries are not needed after 30 days.
    await db.delete(loginAttempts).where(and(eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.success, false)));
  }
  await db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
}
