import "server-only";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/admin/db/client";
import { candidateAccounts, candidateSessions, candidates } from "@/lib/admin/db/schema";
import { dummyVerify, hashPassword, verifyPassword } from "./password";
import { createLinkToken, isTokenShape, linkUsable, resetRecentlyRequested, tokenHash, type LinkPurpose } from "./tokens";

/**
 * Accounts of the candidate portal: login, invitation, password reset and the management
 * functions of the admin area. No cookies here (session.ts sets them), so everything can be
 * tested directly against a database.
 */

/** Name of the unique constraint a failed insert violated (Drizzle wraps the pg error in `cause`). */
function violatedConstraint(error: unknown): string | undefined {
  for (let e: unknown = error, i = 0; e && i < 3; e = (e as { cause?: unknown }).cause, i++) {
    const c = (e as { constraint?: unknown }).constraint;
    if (typeof c === "string") return c;
  }
  return undefined;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface AuthenticatedAccount {
  accountId: number;
  candidateId: number;
}

/**
 * Checks e-mail and password. Unknown addresses, invited, locked and active accounts all take
 * the same time and give the same answer (null), so the result does not reveal which
 * addresses have an account.
 */
export async function authenticate(email: string, password: string): Promise<AuthenticatedAccount | null> {
  const db = await getDb();
  const [account] = await db
    .select({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, status: candidateAccounts.status, passwordHash: candidateAccounts.passwordHash })
    .from(candidateAccounts)
    .where(eq(candidateAccounts.email, normalizeEmail(email).slice(0, 200)))
    .limit(1);
  if (!account || !account.passwordHash) {
    await dummyVerify();
    return null;
  }
  const valid = await verifyPassword(password, account.passwordHash);
  if (!valid || account.status !== "aktiv") return null;
  await db.update(candidateAccounts).set({ lastLoginAt: new Date() }).where(eq(candidateAccounts.id, account.id));
  return { accountId: account.id, candidateId: account.candidateId };
}

export interface LinkAccount {
  accountId: number;
  candidateId: number;
  email: string;
  firstName: string;
  status: string;
  hasPassword: boolean;
}

/** The account behind a link, if the link is valid for this purpose (for showing the form). */
export async function findLinkAccount(token: unknown, purpose: LinkPurpose): Promise<LinkAccount | null> {
  if (!isTokenShape(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      accountId: candidateAccounts.id,
      candidateId: candidateAccounts.candidateId,
      email: candidateAccounts.email,
      status: candidateAccounts.status,
      tokenHash: candidateAccounts.tokenHash,
      tokenExpiresAt: candidateAccounts.tokenExpiresAt,
      passwordHash: candidateAccounts.passwordHash,
      firstName: candidates.firstName,
    })
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .where(eq(candidateAccounts.tokenHash, tokenHash(token)))
    .limit(1);
  if (!row || !linkUsable(row, purpose)) return null;
  return {
    accountId: row.accountId,
    candidateId: row.candidateId,
    email: row.email,
    firstName: row.firstName,
    status: row.status,
    hasPassword: Boolean(row.passwordHash),
  };
}

/**
 * Uses a link: sets the password, clears the link (single use) and ends all sessions of the
 * account. An invitation also activates the account and records when the privacy notice was
 * shown (candidates.privacy_info_at, kept when already set). Returns null for an invalid,
 * used or expired link.
 */
export async function redeemLink(token: unknown, purpose: LinkPurpose, password: string): Promise<AuthenticatedAccount | null> {
  if (!isTokenShape(token)) return null;
  const passwordHash = await hashPassword(password);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, status: candidateAccounts.status, tokenHash: candidateAccounts.tokenHash, tokenExpiresAt: candidateAccounts.tokenExpiresAt })
      .from(candidateAccounts)
      .where(eq(candidateAccounts.tokenHash, tokenHash(token)))
      .for("update")
      .limit(1);
    if (!row || !linkUsable(row, purpose)) return null;
    const now = new Date();
    await tx
      .update(candidateAccounts)
      .set({ passwordHash, status: "aktiv", tokenHash: null, tokenExpiresAt: null, lastLoginAt: now, updatedAt: now })
      .where(eq(candidateAccounts.id, row.id));
    await tx.delete(candidateSessions).where(eq(candidateSessions.accountId, row.id));
    if (purpose === "einladung") {
      await tx
        .update(candidates)
        .set({ privacyInfoAt: sql`coalesce(${candidates.privacyInfoAt}, now())` })
        .where(eq(candidates.id, row.candidateId));
    }
    return { accountId: row.id, candidateId: row.candidateId };
  });
}

export type ResetRequest = { candidateId: number; email: string; firstName: string; token: string; expiresAt: Date };

/**
 * Creates a reset link for an active account. Returns null for unknown, invited or locked
 * accounts and when a link was requested a moment ago; the caller answers the same way in
 * every case.
 */
export async function createResetLink(email: string): Promise<ResetRequest | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, email: candidateAccounts.email, status: candidateAccounts.status, tokenExpiresAt: candidateAccounts.tokenExpiresAt, firstName: candidates.firstName })
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .where(eq(candidateAccounts.email, normalizeEmail(email).slice(0, 200)))
    .limit(1);
  if (!row || row.status !== "aktiv" || resetRecentlyRequested(row.tokenExpiresAt)) return null;
  const link = createLinkToken("reset");
  await db
    .update(candidateAccounts)
    .set({ tokenHash: link.hash, tokenExpiresAt: link.expiresAt, updatedAt: new Date() })
    .where(and(eq(candidateAccounts.id, row.id), eq(candidateAccounts.status, "aktiv")));
  return { candidateId: row.candidateId, email: row.email, firstName: row.firstName, token: link.token, expiresAt: link.expiresAt };
}

/** Changes the password after checking the current one. Other sessions end; this one stays. */
export async function changePassword(accountId: number, current: string, next: string, keepSessionId: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ passwordHash: candidateAccounts.passwordHash, status: candidateAccounts.status })
    .from(candidateAccounts)
    .where(eq(candidateAccounts.id, accountId))
    .limit(1);
  if (!row || row.status !== "aktiv" || !(await verifyPassword(current, row.passwordHash))) return false;
  const passwordHash = await hashPassword(next);
  await db.transaction(async (tx) => {
    await tx.update(candidateAccounts).set({ passwordHash, tokenHash: null, tokenExpiresAt: null, updatedAt: new Date() }).where(eq(candidateAccounts.id, accountId));
    await tx.delete(candidateSessions).where(and(eq(candidateSessions.accountId, accountId), sql`${candidateSessions.id} <> ${keepSessionId}`));
  });
  return true;
}

// --- Admin -----------------------------------------------------------------------

export type IssuedLink = { accountId: number; candidateId: number; email: string; token: string; expiresAt: Date };

export type InviteResult = { ok: true; link: IssuedLink } | { ok: false; error: "candidate_missing" | "account_exists" | "email_taken" };

/** Creates the account of a candidate with an invitation link (7 days). */
export async function createInvitation(candidateId: number, email: string): Promise<InviteResult> {
  const db = await getDb();
  const address = normalizeEmail(email);
  const [candidate] = await db.select({ id: candidates.id }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  if (!candidate) return { ok: false, error: "candidate_missing" };
  const [existing] = await db
    .select({ candidateId: candidateAccounts.candidateId })
    .from(candidateAccounts)
    .where(sql`${candidateAccounts.candidateId} = ${candidateId} or ${candidateAccounts.email} = ${address}`);
  if (existing) return { ok: false, error: existing.candidateId === candidateId ? "account_exists" : "email_taken" };
  const link = createLinkToken("einladung");
  try {
    const [row] = await db
      .insert(candidateAccounts)
      .values({ candidateId, email: address, status: "eingeladen", tokenHash: link.hash, tokenExpiresAt: link.expiresAt })
      .returning({ id: candidateAccounts.id });
    return { ok: true, link: { accountId: row.id, candidateId, email: address, token: link.token, expiresAt: link.expiresAt } };
  } catch (error) {
    // Two clicks at the same time: the unique indexes decide.
    const constraint = violatedConstraint(error);
    if (constraint === "candidate_accounts_candidate_id_key") return { ok: false, error: "account_exists" };
    if (constraint === "candidate_accounts_email_key") return { ok: false, error: "email_taken" };
    throw error;
  }
}

/**
 * A new invitation link (7 days) for an invited or active account; the previous link stops
 * working. For an active account it lets the person set a new password. Locked accounts get
 * no link.
 */
export async function renewLink(accountId: number): Promise<IssuedLink | null> {
  const db = await getDb();
  const link = createLinkToken("einladung");
  const [row] = await db
    .update(candidateAccounts)
    .set({ tokenHash: link.hash, tokenExpiresAt: link.expiresAt, updatedAt: new Date() })
    .where(and(eq(candidateAccounts.id, accountId), inArray(candidateAccounts.status, ["eingeladen", "aktiv"])))
    .returning({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, email: candidateAccounts.email });
  return row ? { accountId: row.id, candidateId: row.candidateId, email: row.email, token: link.token, expiresAt: link.expiresAt } : null;
}

/** The account a just-issued link belongs to, if the token is still its current, valid link. */
export async function accountForIssuedLink(accountId: number, token: unknown) {
  if (!isTokenShape(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, email: candidateAccounts.email, status: candidateAccounts.status, firstName: candidates.firstName, tokenExpiresAt: candidateAccounts.tokenExpiresAt })
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .where(and(eq(candidateAccounts.id, accountId), eq(candidateAccounts.tokenHash, tokenHash(token)), gt(candidateAccounts.tokenExpiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/**
 * Locks or unlocks an account. Locking ends all sessions and voids an open link; unlocking
 * restores "aktiv" when a password exists, otherwise "eingeladen" (a new link is needed).
 */
export async function setAccountLocked(accountId: number, locked: boolean) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(candidateAccounts)
      .set(
        locked
          ? { status: "gesperrt", tokenHash: null, tokenExpiresAt: null, updatedAt: new Date() }
          : { status: sql`case when ${candidateAccounts.passwordHash} is null then 'eingeladen' else 'aktiv' end`, updatedAt: new Date() },
      )
      .where(and(eq(candidateAccounts.id, accountId), locked ? undefined : eq(candidateAccounts.status, "gesperrt")))
      .returning({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId, status: candidateAccounts.status });
    if (row && locked) await tx.delete(candidateSessions).where(eq(candidateSessions.accountId, accountId));
    return row ?? null;
  });
}

/** Deletes the access (sessions go with it). The candidate record stays. */
export async function deleteAccount(accountId: number) {
  const db = await getDb();
  const [row] = await db.delete(candidateAccounts).where(eq(candidateAccounts.id, accountId)).returning({ id: candidateAccounts.id, candidateId: candidateAccounts.candidateId });
  return row ?? null;
}

/** Candidates that can be invited: no account yet, not archived. */
export async function invitableCandidates() {
  const db = await getDb();
  return db
    .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, email: candidates.email })
    .from(candidates)
    .leftJoin(candidateAccounts, eq(candidateAccounts.candidateId, candidates.id))
    .where(and(isNull(candidateAccounts.id), sql`${candidates.status} <> 'archiviert'`))
    .orderBy(sql`lower(${candidates.lastName})`, sql`lower(${candidates.firstName})`);
}
