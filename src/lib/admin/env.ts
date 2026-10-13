import "server-only";

/**
 * Configuration of the admin area. All values come from environment variables that only
 * Ferhat sets (Vercel: Project Settings > Environment Variables). Nothing secret is in the
 * repository. /admin/einrichtung generates the values in the browser.
 */
export const adminEnv = {
  /** Postgres connection string (Neon via the Vercel integration, or a local database). */
  databaseUrl: process.env.DATABASE_URL,
  /** PBKDF2 hash of the admin password: pbkdf2-sha256$<iterations>$<salt>$<hash> (base64url). */
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  /**
   * At least 32 random bytes (base64url). Keys for sessions, IP hashes and file encryption are
   * derived from it. Changing it makes stored documents unreadable, so it must never change.
   */
  secret: process.env.ADMIN_SECRET,
  /** Optional TOTP secret (base32). When set, login also asks for a six-digit code. */
  totpSecret: process.env.ADMIN_TOTP_SECRET || undefined,
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

function passwordHashValid(): boolean {
  const parts = adminEnv.passwordHash?.trim().split("$") ?? [];
  return parts.length === 4 && parts[0] === "pbkdf2-sha256" && Number(parts[1]) >= 100_000;
}

/** State of every setting, for the setup page. Contains no values. */
export function adminConfigStatus(): AdminConfigItem[] {
  return [
    { name: "DATABASE_URL", label: "Datenbank (Neon)", ok: Boolean(adminEnv.databaseUrl), required: true },
    { name: "ADMIN_PASSWORD_HASH", label: "Passwort (als Hash)", ok: passwordHashValid(), required: true },
    { name: "ADMIN_SECRET", label: "Geheimer Schlüssel", ok: secretBytes() !== null, required: true },
    { name: "ADMIN_TOTP_SECRET", label: "Zwei-Faktor-Code (empfohlen)", ok: Boolean(adminEnv.totpSecret), required: false },
  ];
}

export function isAdminConfigured(): boolean {
  return adminConfigStatus().every((item) => item.ok || !item.required);
}
