/**
 * Retention periods for candidate data. One source for the admin tool, the candidate portal and
 * the public privacy policy, so the promises there and the rules in the tool cannot drift apart.
 * No server-only imports: the public site and client components read these too.
 */

/** Profiles without consent: at most six months. */
export const RETENTION_MONTHS_WITHOUT_CONSENT = 6;
/** With documented consent for the talent pool: up to 24 months, renewable with a new consent. */
export const RETENTION_MONTHS_WITH_CONSENT = 24;
/** Contracts with clients and subcontractors, accounting records (Art. 958f OR). */
export const RETENTION_YEARS_BUSINESS_RECORDS = 10;
/**
 * Signed consent forms and NDAs with a person are proof, not business records: kept until
 * possible claims are time-barred, at most ten years (Art. 60 and 127 OR).
 */
export const RETENTION_YEARS_PROOF_MAX = 10;

/** A candidate portal session ends after seven days, or after eight hours without activity. */
export const PORTAL_SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const PORTAL_SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
