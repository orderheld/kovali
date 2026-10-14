import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../crypto";

/** Time-based one-time passwords (RFC 6238: SHA-1, 30 seconds, 6 digits), as in common authenticator apps. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpCode(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, "0");
}

/**
 * Accepts the code of the current 30-second step and of one step before or after, so a
 * slightly wrong clock still works. Returns the matched step to block replays.
 */
export function verifyTotp(base32Secret: string, code: string, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const secret = base32Decode(base32Secret);
  if (secret.length < 10) return null;
  const step = Math.floor(now / 30_000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (safeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(digits))) return candidate;
  }
  return null;
}
