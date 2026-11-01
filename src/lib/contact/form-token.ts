import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Spam protection for the contact form: a signed token with the time the visitor started on
 * the form. The page stays static: the form asks for the token at the first click or key press
 * (requestFormToken in kontakt/actions.ts) and sends it along. The server then measures the
 * fill time itself, so a bot can neither skip the check nor fake the time, and a request
 * without a token is refused. No cookie, no personal data: the token holds a time and a
 * random number.
 */

/** Minimum time between the first interaction and sending. People need longer. */
export const MIN_FILL_MS = 3000;
/** Older tokens are refused; the form then fetches a new one. */
export const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
/** Clock difference between server instances that is still accepted. */
const CLOCK_SKEW_MS = 60 * 1000;

const VERSION = "v1";

/**
 * Key for the signature. The fallbacks are secrets that are set wherever the form is live
 * (the form only shows with Resend configured). The last one only applies locally and in
 * previews without Resend, where nothing is delivered.
 */
function signingKey(): Buffer {
  const secret = serverEnv.formSecret || serverEnv.ipSalt || serverEnv.resendApiKey || "kovali-local-contact-form";
  return createHmac("sha256", secret).update("kovali/contact-form-token/v1").digest();
}

function sign(body: string): string {
  return createHmac("sha256", signingKey()).update(body).digest("base64url");
}

export function issueFormToken(now = Date.now()): string {
  const body = `${VERSION}.${now.toString(36)}.${randomBytes(12).toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

export type FormTokenCheck =
  | { ok: true; nonce: string }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "too_fast" };

export function checkFormToken(value: unknown, now = Date.now()): FormTokenCheck {
  if (typeof value !== "string" || value.trim() === "") return { ok: false, reason: "missing" };
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION || value.length > 200) return { ok: false, reason: "invalid" };
  const [, time, nonce, signature] = parts;
  const expected = Buffer.from(sign(`${VERSION}.${time}.${nonce}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "invalid" };

  const issuedAt = Number.parseInt(time, 36);
  if (!Number.isSafeInteger(issuedAt)) return { ok: false, reason: "invalid" };
  const age = now - issuedAt;
  if (age < -CLOCK_SKEW_MS) return { ok: false, reason: "invalid" };
  if (age < MIN_FILL_MS) return { ok: false, reason: "too_fast" };
  if (age > MAX_TOKEN_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true, nonce };
}

/**
 * Tokens that already delivered a request, with its reference. A second request with the same
 * token is not sent again; the visitor sees the first reference. Per server instance, like the
 * in-memory rate limit: the rate limits still apply across instances.
 */
const used = new Map<string, { reference: string; at: number }>();

export function deliveredReference(nonce: string): string | undefined {
  return used.get(nonce)?.reference;
}

export function markTokenUsed(nonce: string, reference: string, now = Date.now()): void {
  used.set(nonce, { reference, at: now });
  if (used.size > 2000) {
    for (const [key, entry] of used) {
      if (now - entry.at > MAX_TOKEN_AGE_MS) used.delete(key);
    }
  }
}
