import "server-only";
import { and, eq, gt, lt, ne, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomToken, sha256 } from "@/lib/admin/crypto";
import { getDb } from "@/lib/admin/db/client";
import { candidateAccounts, candidateSessions } from "@/lib/admin/db/schema";
import { isAdminConfigured } from "@/lib/admin/env";

/**
 * Sessions of the candidate portal, separate from the admin sessions: a random token in an
 * HttpOnly cookie, only its SHA-256 in candidate_sessions. A session ends after 7 days, after
 * 8 hours without activity, on logout, on a password change (other devices) and when Ferhat
 * locks the account. Every lookup also requires the account to be active.
 */

const SECURE = process.env.NODE_ENV === "production";
/** Same names as in src/proxy.ts, which only checks that the cookie exists. */
export const PORTAL_COOKIE = SECURE ? "__Host-kovali-portal" : "kovali-portal";
export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

export interface CandidateSession {
  /** SHA-256 of the cookie token. */
  sessionId: string;
  accountId: number;
  /** Every portal query filters by this id; it never comes from the browser. */
  candidateId: number;
  email: string;
  lastLoginAt: Date | null;
}

/** Attributes of the session cookie. Deleting needs the same ones: browsers ignore a `__Host-` cookie without Secure. */
const COOKIE_OPTIONS = { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/" } as const;

/**
 * Removes the session cookie from the browser. Only possible in Server Actions and Route
 * Handlers; while a Server Component renders, cookies are read-only and nothing happens.
 */
async function clearPortalCookie(): Promise<void> {
  try {
    (await cookies()).set(PORTAL_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0, expires: new Date(0) });
  } catch {
    // Read-only during rendering: the proxy lets the request through and the page redirects.
  }
}

export async function createCandidateSession(accountId: number): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);
  const db = await getDb();
  await db.insert(candidateSessions).values({ id: sha256(token), accountId, expiresAt });
  (await cookies()).set(PORTAL_COOKIE, token, { ...COOKIE_OPTIONS, expires: expiresAt });
  // Housekeeping: expired and idle sessions of all accounts are not needed any more.
  await db
    .delete(candidateSessions)
    .where(or(lt(candidateSessions.expiresAt, new Date()), lt(candidateSessions.lastSeenAt, new Date(Date.now() - SESSION_IDLE_MS))));
}

/** The current candidate session, or null. Cached per request. */
export const getCandidateSession = cache(async (): Promise<CandidateSession | null> => {
  // Everything after this point runs per request, never while prerendering.
  await connection();
  if (!isAdminConfigured()) return null;
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: candidateSessions.id,
      lastSeenAt: candidateSessions.lastSeenAt,
      accountId: candidateAccounts.id,
      candidateId: candidateAccounts.candidateId,
      email: candidateAccounts.email,
      lastLoginAt: candidateAccounts.lastLoginAt,
    })
    .from(candidateSessions)
    .innerJoin(candidateAccounts, eq(candidateAccounts.id, candidateSessions.accountId))
    .where(
      and(
        eq(candidateSessions.id, sha256(token)),
        gt(candidateSessions.expiresAt, now),
        gt(candidateSessions.lastSeenAt, new Date(now.getTime() - SESSION_IDLE_MS)),
        eq(candidateAccounts.status, "aktiv"),
      ),
    )
    .limit(1);
  if (!row) {
    // Expired, ended on another device, account locked or forged: drop the cookie, so the proxy sends the next request to the login.
    await clearPortalCookie();
    return null;
  }
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_MS) {
    await db.update(candidateSessions).set({ lastSeenAt: now }).where(eq(candidateSessions.id, row.sessionId));
  }
  return { sessionId: row.sessionId, accountId: row.accountId, candidateId: row.candidateId, email: row.email, lastLoginAt: row.lastLoginAt };
});

/** For pages and Server Actions of the portal: the session, or a redirect to the login. */
export async function requireCandidate(): Promise<CandidateSession> {
  const session = await getCandidateSession();
  if (!session) redirect("/portal/login");
  return session;
}

/** For Route Handlers: the session or null (respond with 401). */
export async function candidateSessionForApi(): Promise<CandidateSession | null> {
  return getCandidateSession();
}

/** Logout on this device. */
export async function destroyCandidateSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (token && token.length <= 100) {
    const db = await getDb();
    await db.delete(candidateSessions).where(eq(candidateSessions.id, sha256(token)));
  }
  await clearPortalCookie();
}

/** Ends the sessions of an account, optionally except one (the device that changed the password). */
export async function endAccountSessions(accountId: number, exceptSessionId?: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .delete(candidateSessions)
    .where(and(eq(candidateSessions.accountId, accountId), exceptSessionId ? ne(candidateSessions.id, exceptSessionId) : undefined))
    .returning({ id: candidateSessions.id });
  return rows.length;
}
