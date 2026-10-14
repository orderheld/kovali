import { addMonthsIso, formatDate } from "@/lib/admin/format";
import type { Tone } from "@/lib/admin/options";

/**
 * Data protection rules of the candidate module. Pure, so they are unit-tested and the list,
 * the detail page and the form agree on them.
 */

/** With consent, a profile may be kept for two years before asking again. */
export const RETENTION_MONTHS_WITH_CONSENT = 24;
/** Without consent at most six months: the website promises "höchstens sechs Monate". */
export const RETENTION_MONTHS_WITHOUT_CONSENT = 6;
/** From this many days before the retention date on, the record is flagged. */
export const RETENTION_WARN_DAYS = 30;

export const RETENTION_RULE_HINT =
  "Leer lassen für die Standardfrist: mit Einwilligung heute plus 24 Monate, ohne Einwilligung heute plus 6 Monate (wie auf der Website versprochen: höchstens sechs Monate). Ein späteres Datum ist nicht möglich.";

/** Retention date when none is entered (YYYY-MM-DD), also the latest date the form accepts. */
export function defaultRetentionUntil(hasConsent: boolean, today: string): string {
  return addMonthsIso(today, hasConsent ? RETENTION_MONTHS_WITH_CONSENT : RETENTION_MONTHS_WITHOUT_CONSENT);
}

/**
 * Checks a retention date entered in the candidate form against the 6/24-month cap, but only
 * when it is new or changed: a date set earlier through the Datenschutz extension, or an
 * overdue date saved unchanged, must not block other edits. Earlier dates are always fine.
 */
export function retentionInputError(entered: string | null, stored: string | null, hasConsent: boolean, today: string): string | null {
  if (!entered || entered === stored) return null;
  const max = defaultRetentionUntil(hasConsent, today);
  if (entered <= max) return null;
  return hasConsent
    ? `Mit Einwilligung höchstens ${RETENTION_MONTHS_WITH_CONSENT} Monate ab heute, also bis ${formatDate(max)}.`
    : `Ohne Einwilligung höchstens ${RETENTION_MONTHS_WITHOUT_CONSENT} Monate ab heute, also bis ${formatDate(max)}. Für länger zuerst die Einwilligung erfassen.`;
}

/**
 * When the consent is removed (e.g. withdrawn), the profile may be kept at most six months
 * from its creation, as without consent from the start. A cap in the past makes it overdue.
 */
export function retentionWithoutConsent(retentionUntil: string | null, createdOn: string): string {
  const cap = addMonthsIso(createdOn, RETENTION_MONTHS_WITHOUT_CONSENT);
  return retentionUntil && retentionUntil < cap ? retentionUntil : cap;
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/**
 * Same definition as retentionState in src/lib/admin/privacy.ts (the Datenschutz pages and the
 * navigation badge): «Aufbewahren bis» includes that day, so a record is overdue only from the
 * day after; on the day itself it is due with 0 days left.
 */
export type RetentionState =
  | { state: "none" }
  | { state: "ok"; days: number }
  /** Within RETENTION_WARN_DAYS, including the day itself (days 0). */
  | { state: "due"; days: number }
  /** After the date: the navigation counts these as open privacy tasks. */
  | { state: "overdue"; days: number };

export function retentionState(retentionUntil: string | null | undefined, today: string): RetentionState {
  if (!retentionUntil) return { state: "none" };
  const days = daysUntil(retentionUntil, today);
  if (days < 0) return { state: "overdue", days };
  if (days <= RETENTION_WARN_DAYS) return { state: "due", days };
  return { state: "ok", days };
}

/** Short flag for the candidate list; null when nothing needs attention. */
export function privacyFlag(c: { consentAt: Date | null; retentionUntil: string | null }, today: string): { tone: Tone; label: string; title: string } | null {
  const r = retentionState(c.retentionUntil, today);
  if (r.state === "overdue") return { tone: "red", label: "Frist abgelaufen", title: "Aufbewahrungsfrist abgelaufen: löschen oder Einwilligung erneuern." };
  if (r.state === "due") {
    if (r.days === 0) return { tone: "amber", label: "Frist heute", title: "Aufbewahrungsfrist endet heute." };
    const days = r.days === 1 ? "1 Tag" : `${r.days} Tagen`;
    return { tone: "amber", label: `Frist in ${days}`, title: `Aufbewahrungsfrist endet in ${days}.` };
  }
  if (!c.consentAt) return { tone: "amber", label: "Keine Einwilligung", title: "Noch keine Einwilligung zur Speicherung erfasst." };
  return null;
}

/**
 * Whether a firm is a capital company (GmbH or AG, also in French and Italian). A sole
 * proprietorship as subcontractor carries a higher risk of bogus self-employment. Swiss law
 * requires the legal form in the name of a GmbH or AG, so the name is a reliable fallback
 * when the legal form field is empty.
 */
export function isCapitalCompany(company: { legalForm?: string | null; legalName?: string | null; name?: string | null }): boolean {
  const pattern = /(?<![\p{L}\p{N}])(gmbh|ag|sa|s[àa]rl|sagl|aktiengesellschaft|gesellschaft mit beschränkter haftung)(?![\p{L}\p{N}])/iu;
  const source = company.legalForm?.trim() || [company.legalName, company.name].filter(Boolean).join(" ");
  return pattern.test(source);
}

/** Age in full years on a given day. */
export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
