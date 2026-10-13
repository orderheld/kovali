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
const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const IDLE_MS = 4 * 60 * 60 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

export interface AdminSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
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
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
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
  if (!row) return null;
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
  if (!isAdminConfigured()) redirect("/admin/einrichtung");
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For Route Handlers: the session or null (respond with 401). */
export async function adminSessionForApi(): Promise<AdminSession | null> {
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
  jar.delete(ADMIN_COOKIE);
}

/** Ends every admin session, including the current one. */
export async function destroyAllAdminSessions(): Promise<number> {
  const db = await getDb();
  const rows = await db.delete(sessions).returning({ id: sessions.id });
  (await cookies()).delete(ADMIN_COOKIE);
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
