import "server-only";
import { pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { adminEnv } from "../env";
import { safeEqual } from "../crypto";

const pbkdf2Async = promisify(pbkdf2);

/**
 * Checks a password against ADMIN_PASSWORD_HASH (format pbkdf2-sha256$<iterations>$<salt>$<hash>,
 * salt and hash base64url). The setup page computes the same format in the browser with
 * WebCrypto, so the password itself is never sent anywhere.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = adminEnv.passwordHash?.trim();
  if (!stored || password.length === 0 || password.length > 512) return false;
  const [scheme, iterRaw, saltRaw, hashRaw] = stored.split("$");
  const iterations = Number(iterRaw);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !saltRaw || !hashRaw) {
    return false;
  }
  const expected = Buffer.from(hashRaw, "base64url");
  const actual = await pbkdf2Async(password.normalize("NFC"), Buffer.from(saltRaw, "base64url"), iterations, expected.length, "sha256");
  return safeEqual(actual, expected);
}
