import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomToken, sha256 } from "../crypto";
import { getDb } from "../db/client";
import { sessions } from "../db/schema";
import { isAdminConfigured } from "../env";
import { requestIpHash, requestUserAgent } from "../request";

/**
 * Admin sessions: a random token in an HttpOnly cookie, only its SHA-256 in the database.
 * A session ends after 12 hours, or after 4 hours without activity, or on logout.
 */

const SECURE = process.env.NODE_ENV === "production";
export const ADMIN_COOKIE = SECURE ? "__Host-kovali-admin" : "kovali-admin";
/** Exported for the record of processing activities (privacy.ts), which states them. */
export const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const IDLE_MS = 4 * 60 * 60 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

export interface AdminSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Attributes of the session cookie. Deleting needs the same ones: browsers ignore a `__Host-` cookie without Secure. */
const COOKIE_OPTIONS = { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/" } as const;

/**
 * Removes the session cookie from the browser. Only possible in Server Actions and Route
 * Handlers; while a Server Component renders, cookies are read-only and nothing happens.
 */
async function clearAdminCookie(): Promise<void> {
  try {
    (await cookies()).set(ADMIN_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0, expires: new Date(0) });
  } catch {
    // Read-only during rendering: the proxy lets the request through and the page redirects.
  }
}

export async function createAdminSession(): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ABSOLUTE_MS);
  const db = await getDb();
  await db.insert(sessions).values({
    id: sha256(token),
    expiresAt,
    ipHash: await requestIpHash(),
    userAgent: await requestUserAgent(),
  });
  (await cookies()).set(ADMIN_COOKIE, token, { ...COOKIE_OPTIONS, expires: expiresAt });
  // Housekeeping: expired sessions are not needed any more.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/** The current session, or null. Cached per request. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // Everything after this point runs per request, never while prerendering.
  await connection();
  if (!isAdminConfigured()) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sha256(token)),
        gt(sessions.expiresAt, now),
        gt(sessions.lastSeenAt, new Date(now.getTime() - IDLE_MS)),
      ),
    )
    .limit(1);
  if (!row) {
    // Expired, ended elsewhere or forged: drop the cookie, so the proxy sends the next request to the login.
    await clearAdminCookie();
    return null;
  }
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.id));
  }
  return { id: row.id, createdAt: row.createdAt, expiresAt: row.expiresAt };
});

/**
 * For pages and Server Actions: returns the session or redirects to the login (or to the
 * setup page while the admin area is not configured).
 */
export async function requireAdmin(): Promise<AdminSession> {
  // Request time first: without the env vars (e.g. a fresh deployment) the redirect below would
  // otherwise run at build time and make admin pages static, which breaks their dynamic metadata.
  await connection();
  if (!isAdminConfigured()) redirect("/admin/einrichtung");
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For Route Handlers: the session or null (respond with 401). */
export async function adminSessionForApi(): Promise<AdminSession | null> {
  await connection();
  if (!isAdminConfigured()) return null;
  return getAdminSession();
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  await clearAdminCookie();
}

/** Ends every admin session, including the current one. */
export async function destroyAllAdminSessions(): Promise<number> {
  const db = await getDb();
  const rows = await db.delete(sessions).returning({ id: sessions.id });
  await clearAdminCookie();
  return rows.length;
}

export async function activeAdminSessions() {
  const db = await getDb();
  const now = new Date();
  return db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(and(gt(sessions.expiresAt, now), gt(sessions.lastSeenAt, sql`now() - interval '4 hours'`)))
    .orderBy(sessions.lastSeenAt);
}
