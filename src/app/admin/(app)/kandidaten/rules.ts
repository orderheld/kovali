import { addMonthsIso } from "@/lib/admin/format";
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
  "Leer lassen für die Standardfrist: mit Einwilligung heute plus 24 Monate, ohne Einwilligung heute plus 6 Monate (wie auf der Website versprochen: höchstens sechs Monate).";

/** Retention date when none is entered (YYYY-MM-DD). */
export function defaultRetentionUntil(hasConsent: boolean, today: string): string {
  return addMonthsIso(today, hasConsent ? RETENTION_MONTHS_WITH_CONSENT : RETENTION_MONTHS_WITHOUT_CONSENT);
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export type RetentionState =
  | { state: "none" }
  | { state: "ok"; days: number }
  /** Within RETENTION_WARN_DAYS. */
  | { state: "due"; days: number }
  /** On or after the date: the navigation counts these as open privacy tasks. */
  | { state: "overdue"; days: number };

export function retentionState(retentionUntil: string | null | undefined, today: string): RetentionState {
  if (!retentionUntil) return { state: "none" };
  const days = daysUntil(retentionUntil, today);
  if (days <= 0) return { state: "overdue", days };
  if (days <= RETENTION_WARN_DAYS) return { state: "due", days };
  return { state: "ok", days };
}

/** Short flag for the candidate list; null when nothing needs attention. */
export function privacyFlag(c: { consentAt: Date | null; retentionUntil: string | null }, today: string): { tone: Tone; label: string; title: string } | null {
  const r = retentionState(c.retentionUntil, today);
  if (r.state === "overdue") return { tone: "red", label: "Frist abgelaufen", title: "Aufbewahrungsfrist erreicht: löschen oder Einwilligung erneuern." };
  if (r.state === "due") {
    const days = r.days === 1 ? "1 Tag" : `${r.days} Tagen`;
    return { tone: "amber", label: `Frist in ${days}`, title: `Aufbewahrungsfrist endet in ${days}.` };
  }
  if (!c.consentAt) return { tone: "amber", label: "Keine Einwilligung", title: "Noch keine Einwilligung zur Speicherung erfasst." };
  return null;
}

/** GmbH or AG: the same check as the submission rules of the mandate module. */
export { isCapitalCompany } from "@/lib/admin/legal-form";

/** Age in full years on a given day. */
export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
