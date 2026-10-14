import "server-only";
import { randomToken, sha256 } from "@/lib/admin/crypto";

/**
 * One-time links of the candidate portal (invitation and password reset). The link carries
 * 32 random bytes; the database only keeps their SHA-256 in candidate_accounts.token_hash,
 * so a leaked database copy cannot be turned into working links. A new link replaces the
 * previous one, and using a link clears it (single use).
 */

export type LinkPurpose = "einladung" | "reset";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

const TTL: Record<LinkPurpose, number> = { einladung: INVITATION_TTL_MS, reset: RESET_TTL_MS };

/** 32 bytes in base64url are always 43 characters from this alphabet. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export interface LinkToken {
  /** Goes into the link only; never stored. */
  token: string;
  hash: string;
  expiresAt: Date;
}

export function createLinkToken(purpose: LinkPurpose, now = new Date()): LinkToken {
  const token = randomToken(32);
  return { token, hash: sha256(token), expiresAt: new Date(now.getTime() + TTL[purpose]) };
}

export function isTokenShape(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

export function tokenHash(token: string): string {
  return sha256(token);
}

export interface TokenAccount {
  status: string;
  tokenHash: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Whether an account's stored link may be used for a purpose. Invitations work for invited
 * accounts and, when Ferhat sends a new link, for active ones (the person sets a new
 * password). Password resets only work for active accounts, so nobody can skip the privacy
 * notice of the invitation. Locked accounts accept no link.
 */
export function linkUsable(account: TokenAccount | null | undefined, purpose: LinkPurpose, now = new Date()): boolean {
  if (!account?.tokenHash || !account.tokenExpiresAt) return false;
  if (account.tokenExpiresAt.getTime() <= now.getTime()) return false;
  return purpose === "einladung" ? account.status === "eingeladen" || account.status === "aktiv" : account.status === "aktiv";
}

/**
 * A reset link was requested less than five minutes ago: no second e-mail, so the form
 * cannot be used to flood someone's mailbox. Only reset-length links count; a 7-day
 * invitation never blocks a reset request.
 */
export function resetRecentlyRequested(tokenExpiresAt: Date | null, now = new Date()): boolean {
  if (!tokenExpiresAt) return false;
  const remaining = tokenExpiresAt.getTime() - now.getTime();
  return remaining > RESET_TTL_MS - 5 * 60 * 1000 && remaining <= RESET_TTL_MS;
}
