import { daysBetweenIso, formatRate } from "./format";
import { mandateStatuses, openMandateStatuses, type Tone } from "./options";

/**
 * Pure rules of the vacancies (table mandates): list filters, due dates, what a status change
 * does to the application date and closed_at, quick actions on the detail page and the link to
 * the calculator. No database and no React, so pages, Server Actions and tests share them.
 */

// --- List filter ---------------------------------------------------------------

export type VacancyGroup = "offen" | "zusage" | "abgeschlossen" | "alle";

export const vacancyGroups: readonly { value: VacancyGroup; label: string; statuses: readonly string[] | null }[] = [
  { value: "offen", label: "Offen", statuses: openMandateStatuses },
  { value: "zusage", label: "Zusage", statuses: ["gewonnen"] },
  // Paused vacancies are not worked on, so they leave the open list as well.
  { value: "abgeschlossen", label: "Abgeschlossen", statuses: ["verloren", "zurueckgezogen", "pausiert"] },
  { value: "alle", label: "Alle", statuses: null },
];

/** The list shows a group, optionally narrowed to one of its statuses. */
export interface StatusFilter {
  group: VacancyGroup;
  status: string | null;
}

export function isOpenStatus(status: string): boolean {
  return (openMandateStatuses as readonly string[]).includes(status);
}

/** The group a status belongs to (never "alle"). */
export function groupOf(status: string): VacancyGroup {
  return vacancyGroups.find((g) => g.statuses?.includes(status))?.value ?? "alle";
}

/**
 * Reads ?status=: a group ("offen", "zusage", "abgeschlossen", "alle") or a single status such
 * as "angeboten". Anything else shows the open vacancies.
 */
export function parseStatusFilter(value: string | null | undefined): StatusFilter {
  const group = vacancyGroups.find((g) => g.value === value);
  if (group) return { group: group.value, status: null };
  if (value && mandateStatuses.some((s) => s.value === value)) {
    const owner = vacancyGroups.find((g) => g.statuses?.includes(value))!;
    // A group with a single status needs no narrowing.
    return owner.statuses!.length === 1 ? { group: owner.value, status: null } : { group: owner.value, status: value };
  }
  return { group: "offen", status: null };
}

/** The value for ?status= that leads back to this filter; undefined for the default view. */
export function statusParam(filter: StatusFilter): string | undefined {
  if (filter.status) return filter.status;
  return filter.group === "offen" ? undefined : filter.group;
}

/** Statuses the list shows, or null for all. */
export function filterStatuses(filter: StatusFilter): string[] | null {
  if (filter.status) return [filter.status];
  const statuses = vacancyGroups.find((g) => g.value === filter.group)?.statuses;
  return statuses ? [...statuses] : null;
}

/** Tab counts from the number of vacancies per status. */
export function groupCounts(perStatus: Record<string, number>): Record<VacancyGroup, number> {
  const sum = (statuses: readonly string[] | null) => (statuses ?? mandateStatuses.map((s) => s.value)).reduce((n, s) => n + (perStatus[s] ?? 0), 0);
  return Object.fromEntries(vacancyGroups.map((g) => [g.value, sum(g.statuses)])) as Record<VacancyGroup, number>;
}

/** Position of a status in the pipeline, for sorting (unknown values last). */
export function statusRank(status: string): number {
  const i = mandateStatuses.findIndex((s) => s.value === status);
  return i === -1 ? mandateStatuses.length : i;
}

/** Splits rows into consecutive sections of the same status, in the order given. */
export function sectionsByStatus<T extends { status: string }>(rows: readonly T[]): { status: string; rows: T[] }[] {
  const sections: { status: string; rows: T[] }[] = [];
  for (const row of rows) {
    const last = sections.at(-1);
    if (last && last.status === row.status) last.rows.push(row);
    else sections.push({ status: row.status, rows: [row] });
  }
  return sections;
}

// --- Due dates -------------------------------------------------------------------

export type DueLevel = "overdue" | "today" | "soon" | "later";

export interface Due {
  level: DueLevel;
  /** Days from today; negative when overdue. */
  days: number;
  /** Short text such as "morgen" or "2 Tage überfällig". */
  label: string;
}

/** Dates up to this many days ahead count as due soon (amber). */
export const SOON_DAYS = 3;

/**
 * How pressing a date (YYYY-MM-DD) is compared with today. Null without a date or when the
 * vacancy is no longer worked on: an old next step of a closed vacancy needs no attention.
 */
export function dueState(date: string | null | undefined, today: string, active = true): Due | null {
  if (!date || !active) return null;
  const days = daysBetweenIso(today, date);
  if (days < 0) return { level: "overdue", days, label: `${-days} ${days === -1 ? "Tag" : "Tage"} überfällig` };
  if (days === 0) return { level: "today", days, label: "heute" };
  if (days <= SOON_DAYS) return { level: "soon", days, label: days === 1 ? "morgen" : `in ${days} Tagen` };
  return { level: "later", days, label: `in ${days} Tagen` };
}

/** Badge colour of a due date; null when it needs no highlight. */
export function dueTone(due: Due | null): Tone | null {
  if (!due) return null;
  if (due.level === "overdue") return "red";
  if (due.level === "today" || due.level === "soon") return "amber";
  return null;
}

// --- Status changes -------------------------------------------------------------

/** A decision has been made; "pausiert" may still come back and is not closed. */
export const closedMandateStatuses = ["gewonnen", "verloren", "zurueckgezogen"] as const;

export function isClosedStatus(status: string): boolean {
  return (closedMandateStatuses as readonly string[]).includes(status);
}

export interface StatusState {
  status: string;
  appliedAt: string | null;
  closedAt: Date | null;
}

/**
 * The vacancy after a status change. closed_at is set when a decision is made, kept between
 * closed statuses (it records when the vacancy left the pipeline) and cleared when it reopens.
 * Moving to "Beworben" without an application date records today as that date.
 */
export function statusChange(current: StatusState, next: string, today: string, now: Date): StatusState {
  if (current.status === next) return { ...current };
  let closedAt: Date | null = null;
  if (isClosedStatus(next)) closedAt = isClosedStatus(current.status) && current.closedAt ? current.closedAt : now;
  const appliedAt = next === "angeboten" && !current.appliedAt ? today : current.appliedAt;
  return { status: next, appliedAt, closedAt };
}

export interface QuickAction {
  status: string;
  label: string;
  primary?: boolean;
}

/** The usual next moves from a status, as buttons on the detail page. */
export function quickActions(status: string, appliedAt: string | null): QuickAction[] {
  switch (status) {
    case "neu":
      return [
        { status: "in_bearbeitung", label: "Bewerbung vorbereiten" },
        { status: "angeboten", label: "Als beworben markieren", primary: true },
      ];
    case "in_bearbeitung":
      return [{ status: "angeboten", label: "Als beworben markieren", primary: true }];
    case "angeboten":
      return [
        { status: "verloren", label: "Absage erhalten" },
        { status: "interview", label: "Interview vereinbart", primary: true },
      ];
    case "interview":
      return [
        { status: "verloren", label: "Absage erhalten" },
        { status: "gewonnen", label: "Zusage erhalten", primary: true },
      ];
    case "pausiert":
      return [{ status: appliedAt ? "angeboten" : "in_bearbeitung", label: "Wieder aufnehmen", primary: true }];
    default:
      return [];
  }
}

// --- Display --------------------------------------------------------------------

/** "CHF 125.00 pro Stunde", short "CHF 125 / h" (shared with the assignments, see format.ts). */
export { formatRate };

/** Link to the calculator with the posted rate, or null without a rate. */
export function rechnerHref(v: { rateSell: number | null; rateUnit: string | null; workload: number | null }): string | null {
  if (v.rateSell === null || v.rateSell === undefined || !(v.rateSell > 0)) return null;
  const sp = new URLSearchParams({ satz: String(v.rateSell), einheit: v.rateUnit === "tag" ? "tag" : "stunde" });
  if (v.workload) sp.set("pensum", String(v.workload));
  return `/admin/rechner?${sp.toString()}`;
}
