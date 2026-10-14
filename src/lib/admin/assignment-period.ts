import { formatDate } from "./format";
import type { Tone } from "./options";

/** Period of an assignment relative to today: remaining days, start, overdue end date. Pure. */

/** Calendar days from `from` to `to` (YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetweenIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

const days = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);
const inDays = (n: number) => (n === 1 ? "morgen" : `in ${n} Tagen`);

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
