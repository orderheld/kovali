import "server-only";

/**
 * Server-side configuration. Secrets are only read on the server and are never
 * exposed to the browser (no NEXT_PUBLIC_ prefix). See .env.example.
 */
export const serverEnv = {
  resendApiKey: process.env.RESEND_API_KEY,
  /** Recipient of contact requests, e.g. info@kovali.ch */
  contactTo: process.env.CONTACT_TO_EMAIL,
  /** Verified sender, e.g. "KOVALI Website <website@kovali.ch>" */
  contactFrom: process.env.CONTACT_FROM_EMAIL,
  /** Optional: Neon Postgres connection string. Without it, requests are only sent by email. */
  databaseUrl: process.env.DATABASE_URL,
  /** Secret salt for hashing IP addresses (rate limiting). */
  ipSalt: process.env.CONTACT_IP_SALT,
  /** Log instead of sending (local tests, preview deployments). */
  dryRun: process.env.CONTACT_DRY_RUN === "true",
  /** Protects the retention cron endpoint. */
  cronSecret: process.env.CRON_SECRET,
  /** Days after which stored requests are deleted. */
  retentionDays: Number.parseInt(process.env.CONTACT_RETENTION_DAYS ?? "365", 10) || 365,
};

export function isEmailConfigured(): boolean {
  return Boolean(serverEnv.resendApiKey && serverEnv.contactTo && serverEnv.contactFrom);
}
