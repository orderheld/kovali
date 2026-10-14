import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { z } from "zod";

/**
 * Candidate passwords. scrypt with a random 16-byte salt and OWASP's parameter set
 * N=2^15, r=8, p=3 (about 32 MiB of memory per hash, a few hundred milliseconds of CPU).
 * The parameters are stored with every hash, so they can be raised later without
 * invalidating existing passwords: scrypt:<N>:<r>:<p>:<salt>:<hash> (base64url).
 */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
// 128 * N * r is exactly Node's default limit; leave headroom so the call never fails on it.
const MAX_MEMORY = 96 * 1024 * 1024;

function derive(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // NFC: the same password typed on a Mac and on Windows produces the same bytes.
    scryptCallback(password.normalize("NFC"), salt, keylen, { ...options, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) throw new Error("Ungültige Passwortlänge.");
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, KEY_BYTES, { N, r: R, p: P });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${key.toString("base64url")}`;
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

/** Splits a stored hash. Parameters outside sane bounds are rejected so a damaged row cannot exhaust memory. */
export function parseScryptHash(stored: string | null | undefined): ParsedHash | null {
  const parts = stored?.split(":") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const powerOfTwo = Number.isInteger(n) && n >= 2 ** 14 && n <= 2 ** 17 && (n & (n - 1)) === 0;
  if (!powerOfTwo || !Number.isInteger(r) || r < 8 || r > 16 || !Number.isInteger(p) || p < 1 || p > 16) return null;
  const salt = Buffer.from(parts[4], "base64url");
  const hash = Buffer.from(parts[5], "base64url");
  if (salt.length < 16 || hash.length < 32) return null;
  return { N: n, r, p, salt, hash };
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parsed = parseScryptHash(stored);
  if (!parsed || password.length === 0 || password.length > PASSWORD_MAX) {
    await dummyVerify();
    return false;
  }
  const actual = await derive(password, parsed.salt, parsed.hash.length, { N: parsed.N, r: parsed.r, p: parsed.p });
  return actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash);
}

const DUMMY_SALT = Buffer.alloc(SALT_BYTES, 7);

/**
 * Spends the same time as a real check. Used when no account exists for an e-mail address,
 * so the response time does not reveal which addresses have an account.
 */
export async function dummyVerify(): Promise<void> {
  await derive("kovali-portal-dummy-password", DUMMY_SALT, KEY_BYTES, { N, r: R, p: P });
}

/** Validation of a new password (form field and server). */
export const newPasswordSchema = z
  .string({ error: "Bitte ein Passwort eingeben." })
  .min(PASSWORD_MIN, `Mindestens ${PASSWORD_MIN} Zeichen.`)
  .max(PASSWORD_MAX, `Höchstens ${PASSWORD_MAX} Zeichen.`)
  .refine((v) => v.trim().length >= PASSWORD_MIN, `Mindestens ${PASSWORD_MIN} Zeichen ohne Leerzeichen am Anfang und Ende.`)
  .refine((v) => new Set(v).size >= 4, "Das Passwort ist zu einfach. Bitte verschiedene Zeichen verwenden.");

/** Two password fields that must match. Field names: password, passwordRepeat. */
export const passwordPairSchema = z
  .object({
    password: newPasswordSchema,
    passwordRepeat: z.string({ error: "Bitte das Passwort wiederholen." }),
  })
  .refine((v) => v.password === v.passwordRepeat, { message: "Die Passwörter stimmen nicht überein.", path: ["passwordRepeat"] });
