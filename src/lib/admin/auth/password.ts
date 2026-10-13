import "server-only";
import { pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { adminEnv, parsePasswordHash } from "../env";
import { safeEqual } from "../crypto";

const pbkdf2Async = promisify(pbkdf2);

/**
 * Checks a password against ADMIN_PASSWORD_HASH (pbkdf2-sha256:<iterations>:<salt>:<hash>,
 * salt and hash base64url). The setup page computes the same format in the browser with
 * WebCrypto, so the password itself is never sent anywhere.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = parsePasswordHash(adminEnv.passwordHash);
  if (!stored || password.length === 0 || password.length > 512) return false;
  const actual = await pbkdf2Async(password.normalize("NFC"), stored.salt, stored.iterations, stored.hash.length, "sha256");
  return safeEqual(actual, stored.hash);
}
