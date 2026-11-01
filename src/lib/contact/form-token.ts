import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { MIN_FILL_MS } from "./state";

/**
 * Spam protection for the contact form: a signed token with the time the visitor started on
 * the form. The page stays static: the form asks for the token at the first click or key press
 * (requestFormToken in kontakt/actions.ts) and sends it along. The server then measures the
 * fill time itself, so a bot can neither skip the check nor fake the time, and a request
 * without a token is refused. No cookie, no personal data: the token holds a time and a
 * random number.
 */

export { MIN_FILL_MS };
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
 * Tokens that delivered a request, with its reference, and tokens whose request is still being
 * processed. A second request with the same token is not sent again; the visitor sees the first
 * reference. Per server instance, like the in-memory rate limit: the rate limits still apply
 * across instances.
 */
const used = new Map<string, { reference: string; at: number }>();
const inProgress = new Map<string, Promise<unknown>>();

export type TokenClaim = { earlier: string } | { release: (reference?: string) => void };

/**
 * Reserves the token for this request, or returns the reference of an earlier request that
 * delivered with it. Waits while another request with the same token is still running. Call
 * release once at the end, with the reference when the request was delivered; without one the
 * token stays usable, so the visitor can correct the request and send it again.
 */
export async function claimToken(nonce: string, now = Date.now()): Promise<TokenClaim> {
  // No await between the check and the reservation, so two requests cannot both pass.
  for (;;) {
    const done = used.get(nonce);
    if (done) return { earlier: done.reference };
    const pending = inProgress.get(nonce);
    if (!pending) break;
    await pending;
  }
  let finish: () => void = () => {};
  inProgress.set(nonce, new Promise<void>((resolve) => (finish = resolve)));
  return {
    release(reference) {
      if (reference) used.set(nonce, { reference, at: now });
      inProgress.delete(nonce);
      finish();
      if (used.size > 2000) {
        for (const [key, entry] of used) {
          if (now - entry.at > MAX_TOKEN_AGE_MS) used.delete(key);
        }
      }
    },
  };
}
