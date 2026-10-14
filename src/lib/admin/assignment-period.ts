import { daysBetweenIso, formatDate } from "./format";
import type { Tone } from "./options";

/** Period of an assignment relative to today: remaining days, start, overdue end date. Pure. */

export { daysBetweenIso };

const days = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);
const inDays = (n: number) => (n === 1 ? "morgen" : `in ${n} Tagen`);

/**
 * Status of a new assignment: "geplant" when it starts after today, else "laufend". The form
 * shows it as the default; Ferhat can still change it.
 */
export function defaultAssignmentStatus(startDate: string | null | undefined, today: string): "geplant" | "laufend" {
  return startDate && startDate > today ? "geplant" : "laufend";
}

/**
 * Running assignments split by their start: `current` have started (or have no start date) and
 * count on the dashboard, `upcoming` are marked as running but start after today. Assignments
 * whose end date has passed stay in `current`; they carry their own warning.
 */
export function splitByStart<T extends { startDate: string | null }>(rows: readonly T[], today: string): { current: T[]; upcoming: T[] } {
  const current: T[] = [];
  const upcoming: T[] = [];
  for (const row of rows) (row.startDate && row.startDate > today ? upcoming : current).push(row);
  return { current, upcoming };
}

/** "01.03.2026 – 28.02.2027", "ab 01.03.2026" or "bis 28.02.2027". */
export function formatPeriod(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `ab ${formatDate(start)}`;
  if (end) return `bis ${formatDate(end)}`;
  return "Zeitraum offen";
}

/**
 * A short status of the period for lists and the dashboard, or null when there is nothing to say.
 * Running: "noch 137 Tage", "endet heute", "Enddatum vorbei" (then set it to Beendet).
 * Planned: "startet in 12 Tagen", "startet heute", "Start überfällig".
 */
export function periodStatus(a: { status: string; startDate: string | null; endDate: string | null }, today: string): { text: string; tone: Tone; daysLeft: number | null } | null {
  if (a.status === "beendet") return null;
  if (a.status === "geplant" || (a.startDate && a.startDate > today)) {
    if (!a.startDate) return { text: "Start offen", tone: "neutral", daysLeft: null };
    const n = daysBetweenIso(today, a.startDate);
    if (n > 0) return { text: `startet ${inDays(n)}`, tone: "blue", daysLeft: null };
    if (n === 0) return { text: "startet heute", tone: "amber", daysLeft: null };
    return { text: "Start überfällig", tone: "amber", daysLeft: null };
  }
  if (!a.endDate) return { text: "ohne Enddatum", tone: "neutral", daysLeft: null };
  const n = daysBetweenIso(today, a.endDate);
  if (n > 0) return { text: `noch ${days(n)}`, tone: n <= 30 ? "amber" : "green", daysLeft: n };
  if (n === 0) return { text: "endet heute", tone: "amber", daysLeft: 0 };
  return { text: `Enddatum seit ${-n === 1 ? "1 Tag" : `${-n} Tagen`} vorbei`, tone: "red", daysLeft: n };
}
