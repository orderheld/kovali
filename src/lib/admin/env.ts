import "server-only";

/**
 * Configuration of the admin area, Ferhat's personal tool with one single login. All values
 * come from environment variables that only he sets (Vercel: Project Settings > Environment
 * Variables). Nothing secret is in the repository. /admin/einrichtung generates the values in
 * the browser. Password and two-factor code are both required.
 */
export const adminEnv = {
  /** Postgres connection string (Neon via the Vercel integration, or a local database). */
  databaseUrl: process.env.DATABASE_URL,
  /**
   * PBKDF2 hash of the admin password: pbkdf2-sha256:<iterations>:<salt>:<hash> (base64url).
   * Colons instead of the usual "$", because .env files expand "$" as variables.
   */
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  /**
   * At least 32 random bytes (base64url). Keys for sessions, IP hashes and file encryption are
   * derived from it. Changing it makes stored documents unreadable, so it must never change.
   */
  secret: process.env.ADMIN_SECRET,
  /** TOTP secret (base32) for Google Authenticator. Login always asks for the six-digit code. */
  totpSecret: process.env.ADMIN_TOTP_SECRET?.trim() || undefined,
};

export interface AdminConfigItem {
  name: string;
  label: string;
  ok: boolean;
  required: boolean;
}

const SECRET_MIN_BYTES = 32;

export function secretBytes(): Buffer | null {
  const raw = adminEnv.secret?.trim();
  if (!raw) return null;
  const bytes = Buffer.from(raw, "base64url");
  return bytes.length >= SECRET_MIN_BYTES ? bytes : null;
}

/** Splits a stored password hash; "$" is accepted as separator too. */
export function parsePasswordHash(value: string | undefined) {
  const parts = value?.trim().split(/[:$]/) ?? [];
  const iterations = Number(parts[1]);
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !parts[2] || !parts[3]) {
    return null;
  }
  return { iterations, salt: Buffer.from(parts[2], "base64url"), hash: Buffer.from(parts[3], "base64url") };
}

/** At least 80 bits in base32 (16 characters), as the authenticator apps expect. */
export function totpSecretValid(value: string | undefined = adminEnv.totpSecret): boolean {
  const clean = value?.replace(/\s/g, "").replace(/=+$/, "").toUpperCase() ?? "";
  return /^[A-Z2-7]{16,}$/.test(clean);
}

function passwordHashValid(): boolean {
  const parsed = parsePasswordHash(adminEnv.passwordHash);
  return parsed !== null && parsed.salt.length >= 16 && parsed.hash.length >= 32;
}

/** State of every setting, for the setup page. Contains no values. */
export function adminConfigStatus(): AdminConfigItem[] {
  return [
    { name: "DATABASE_URL", label: "Datenbank (Neon)", ok: Boolean(adminEnv.databaseUrl), required: true },
    { name: "ADMIN_PASSWORD_HASH", label: "Passwort (als Hash)", ok: passwordHashValid(), required: true },
    { name: "ADMIN_SECRET", label: "Geheimer Schlüssel", ok: secretBytes() !== null, required: true },
    { name: "ADMIN_TOTP_SECRET", label: "Zwei-Faktor-Code (Google Authenticator)", ok: totpSecretValid(), required: true },
  ];
}

/** True when database, password, key and two-factor code are all set. Login and every admin page need it. */
export function isAdminConfigured(): boolean {
  return adminConfigStatus().every((item) => item.ok || !item.required);
}
