import { consentCovers } from "@/lib/admin/consent";
import { formatChf, formatDate, formatNumber, formatPercent, todayIso } from "@/lib/admin/format";
import { mandateStatuses, openMandateStatuses, type Tone } from "@/lib/admin/options";
import { b2bMargin, VAT_RATE_PERCENT } from "@/lib/admin/payroll";
import { HOURS_PER_DAY, type MonthlyExample } from "@/lib/admin/rates";

export { defaultSubmissionRates } from "@/lib/admin/rates";

/**
 * Pure rules of the mandate module: list groups, deadline urgency, when a mandate counts as
 * closed, when a profile may leave KOVALI, margins and the portal rate example. No database
 * and no React, so pages, Server Actions, client forms and unit tests share one definition.
 */

// --- List groups ---------------------------------------------------------------

export type MandateGroup = "offen" | "gewonnen" | "abgeschlossen" | "alle";

export const mandateGroups: readonly { value: MandateGroup; label: string; statuses: readonly string[] | null }[] = [
  { value: "offen", label: "Offen", statuses: openMandateStatuses },
  { value: "gewonnen", label: "Gewonnen", statuses: ["gewonnen"] },
  // Paused mandates are not worked on, so they leave the open list as well.
  { value: "abgeschlossen", label: "Abgeschlossen", statuses: ["verloren", "zurueckgezogen", "pausiert"] },
  { value: "alle", label: "Alle", statuses: null },
];

/** The group from a search parameter; the open mandates are the default view. */
export function parseGroup(value: string | undefined): MandateGroup {
  return mandateGroups.find((g) => g.value === value)?.value ?? "offen";
}

/** Statuses shown in a group, or null for all. */
export function groupStatuses(group: MandateGroup): string[] | null {
  const statuses = mandateGroups.find((g) => g.value === group)?.statuses;
  return statuses ? [...statuses] : null;
}

/** Tab counts from the number of mandates per status. */
export function groupCounts(perStatus: Record<string, number>): Record<MandateGroup, number> {
  const sum = (statuses: readonly string[] | null) =>
    (statuses ?? mandateStatuses.map((s) => s.value)).reduce((n, s) => n + (perStatus[s] ?? 0), 0);
  return Object.fromEntries(mandateGroups.map((g) => [g.value, sum(g.statuses)])) as Record<MandateGroup, number>;
}

export function isOpenStatus(status: string): boolean {
  return (openMandateStatuses as readonly string[]).includes(status);
}

// --- Closing ---------------------------------------------------------------------

/** A decision has been made; "pausiert" may still come back and is not closed. */
export const closedMandateStatuses = ["gewonnen", "verloren", "zurueckgezogen"] as const;

export function isClosedStatus(status: string): boolean {
  return (closedMandateStatuses as readonly string[]).includes(status);
}

/**
 * closed_at after a status change: set when a mandate is decided, kept when it moves between
 * closed statuses (it records when the mandate left the pipeline), cleared when it reopens.
 */
export function nextClosedAt(previous: { status: string; closedAt: Date | null }, nextStatus: string, now: Date): Date | null {
  if (!isClosedStatus(nextStatus)) return null;
  if (isClosedStatus(previous.status) && previous.closedAt) return previous.closedAt;
  return now;
}

// --- Deadlines -------------------------------------------------------------------

export type UrgencyLevel = "overdue" | "soon" | "later";

export interface Urgency {
  level: UrgencyLevel;
  /** Days from today; negative when overdue. */
  days: number;
  /** Short text such as "morgen" or "seit 2 Tagen überfällig", null when not urgent. */
  label: string | null;
}

/** Days within which a deadline is shown as due soon (amber). */
export const SOON_DAYS = 3;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * How urgent a date (YYYY-MM-DD) is compared with today: overdue (red), due within three days
 * (amber) or later. Null without a date or when the mandate is no longer worked on, because a
 * closed mandate's old deadline needs no attention.
 */
export function deadlineUrgency(date: string | null | undefined, today: string, active = true): Urgency | null {
  if (!date || !active) return null;
  const days = daysBetween(today, date);
  if (days < 0) {
    return { level: "overdue", days, label: `${-days} ${days === -1 ? "Tag" : "Tage"} überfällig` };
  }
  if (days <= SOON_DAYS) {
    return { level: "soon", days, label: days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen` };
  }
  return { level: "later", days, label: null };
}

export function urgencyTone(urgency: Urgency | null): Tone | null {
  if (!urgency) return null;
  return urgency.level === "overdue" ? "red" : urgency.level === "soon" ? "amber" : null;
}

// --- Submissions -----------------------------------------------------------------

/** Statuses that mean the profile has gone to the client. */
export const submittedStatuses = ["vorgeschlagen", "interview", "angebot", "zusage"] as const;

export type SubmissionChange = { ok: true; submittedAt: Date | null } | { ok: false; error: string };

export const CONSENT_MISSING =
  "Ohne Einwilligung der Fachperson für dieses Mandat darf das Profil nicht weitergegeben werden. Erfasse zuerst die Einwilligung.";

export const RECIPIENT_MISSING = "Ordne dem Mandat zuerst eine Firma zu: Sie ist die Empfängerin des Profils.";

export const CONSENT_WITHDRAWN =
  "Die Fachperson hat ihre Einwilligung für dieses Mandat widerrufen. Eine Weitergabe ist erst wieder möglich, wenn sie erneut einwilligt und du das erfasst.";

export const OBJECTION_ACTIVE =
  "Die Fachperson hat jeder weiteren Weitergabe widersprochen. Erst eine neue, ausdrückliche Einwilligung für ein Mandat hebt den Widerspruch auf.";

export const CONSENT_ANONYMOUS_ONLY =
  "Die Einwilligung gilt nur für das anonymisierte Dossier. Frag die Fachperson, ob du ihr Profil mit Namen weitergeben darfst, und erfasse diese Einwilligung, oder schlage sie anonymisiert vor.";

/** The consent of this submission was withdrawn (or the candidate declined the mandate). */
export function isWithdrawn(s: { withdrawnAt?: Date | null }): boolean {
  return Boolean(s.withdrawnAt);
}

/**
 * A renewed consent cannot predate the withdrawal of this submission or the candidate's
 * objection it lifts; the same day is fine. Returns the error message, or null.
 */
export function renewedConsentError(consentDate: string, blockers: { withdrawnAt?: Date | null; objectionAt?: Date | null }): string | null {
  const checks = [
    { at: blockers.withdrawnAt, what: "Widerruf" },
    { at: blockers.objectionAt, what: "Widerspruch" },
  ];
  for (const { at, what } of checks) {
    if (at && consentDate < todayIso(at)) return `Die Einwilligung muss am oder nach dem ${what} vom ${formatDate(at)} liegen.`;
  }
  return null;
}

/**
 * Checks a submission status change. Moving to a status after the proposal for the first time
 * records the submission date and needs the candidate's consent for this mandate (the database
 * enforces the same rule with submissions_consent_before_submit) and a recipient company.
 * After a withdrawal, or while the candidate objects to any hand-over, no status may bring the
 * profile back to the client until consent is recorded again. A dossier with the name needs a
 * consent that covers it (consentCovers): a portal consent covers the anonymised one only.
 * Earlier dates stay: once a profile has left KOVALI, that remains a fact even if the status
 * goes back.
 */
export function submissionStatusChange(
  current: {
    consentAt: Date | null;
    consentScope?: string | null;
    profileVariant?: string;
    withdrawnAt?: Date | null;
    objectionAt?: Date | null;
    submittedAt: Date | null;
    recipientCompanyId?: number | null;
  },
  nextStatus: string,
  now: Date,
): SubmissionChange {
  const submits = (submittedStatuses as readonly string[]).includes(nextStatus);
  if (submits && current.objectionAt) return { ok: false, error: OBJECTION_ACTIVE };
  if (submits && isWithdrawn(current)) return { ok: false, error: CONSENT_WITHDRAWN };
  if (!submits || current.submittedAt) return { ok: true, submittedAt: current.submittedAt };
  if (!current.consentAt) return { ok: false, error: CONSENT_MISSING };
  if (!consentCovers(current, current.profileVariant ?? "anonym")) return { ok: false, error: CONSENT_ANONYMOUS_ONLY };
  // Every hand-over needs a known recipient, so the record says who received the profile.
  if (current.recipientCompanyId === null) return { ok: false, error: RECIPIENT_MISSING };
  return { ok: true, submittedAt: now };
}

/**
 * Consent date from the form (YYYY-MM-DD). Today keeps the current time; an earlier day is
 * stored at noon UTC, which stays on the same calendar day in Zurich (as in format.ts).
 */
export function consentTimestamp(date: string, today: string, now: Date): Date | { error: string } {
  if (date > today) return { error: "Das Datum liegt in der Zukunft." };
  if (date === today) return now;
  return new Date(`${date}T12:00:00Z`);
}

// --- Margins ---------------------------------------------------------------------

export interface MarginInfo {
  amount: number;
  percent: number;
  /** red: KOVALI loses money; amber: under 10 %; green otherwise. */
  tone: Extract<Tone, "red" | "amber" | "green">;
  text: string;
  /** The subcontractor's VAT counts as cost (KOVALI cannot reclaim it). */
  includesVat: boolean;
}

/**
 * VAT situation for margins. Without its own VAT number (kovaliParty().vatNumber) KOVALI cannot
 * reclaim the VAT its subcontractor charges, so that VAT is a cost. No record says whether a
 * subcontractor charges VAT, so a firm is assumed to (the cautious figure).
 */
export interface MarginVat {
  kovaliVatRegistered: boolean;
  subcontractorCharges?: boolean;
}

export const MARGIN_VAT_NOTE = "Einkauf inkl. nicht abziehbarer MWST des Subunternehmens";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Margin per hour with a warning colour; the buying rate may use another unit (portal rate).
 * With `vat` the subcontractor's VAT that KOVALI cannot reclaim is part of the cost, as in the
 * Rechner (b2bMargin).
 */
export function marginInfo(
  sell: number | null | undefined,
  buy: number | null | undefined,
  sellUnit: string | null | undefined,
  buyUnit: string | null | undefined = sellUnit,
  vat?: MarginVat,
): MarginInfo | null {
  if (sell === null || sell === undefined || buy === null || buy === undefined) return null;
  const unit = (u: string | null | undefined) => (u === "tag" ? "tag" : "stunde");
  const m = b2bMargin({
    sell,
    sellUnit: unit(sellUnit),
    buy,
    buyUnit: unit(buyUnit),
    workloadPercent: 100,
    vat: vat ? { kovaliRegistered: vat.kovaliVatRegistered, subcontractorCharges: vat.subcontractorCharges ?? true, ratePercent: VAT_RATE_PERCENT } : undefined,
  });
  if (!m) return null;
  const amount = round2(m.perHour);
  const percent = round2(m.percent);
  const includesVat = m.vatCostHourly > 0;
  const tone = amount < 0 ? "red" : percent < 10 ? "amber" : "green";
  const text = `${formatChf(amount)} pro Stunde · ${formatPercent(percent)}${includesVat ? ` (${MARGIN_VAT_NOTE})` : ""}`;
  return { amount, percent, tone, text, includesVat };
}

/** "CHF 145.00 pro Stunde", or "CHF 145 / h" in tight spots such as tables (cents only when there are any). */
export function formatRate(amount: number | null | undefined, unit: string | null | undefined, short = false): string {
  if (amount === null || amount === undefined) return "–";
  const per = unit === "tag" ? (short ? "/ Tag" : "pro Tag") : short ? "/ h" : "pro Stunde";
  return `${formatChf(amount, { round: short && Number.isInteger(amount) })} ${per}`;
}

// --- Portal ----------------------------------------------------------------------

/**
 * The calculation candidates see for a rate, as one line. Hourly rates show the hours,
 * daily rates the days, so every factor in the line multiplies out exactly.
 */
export function monthlyExampleText(example: MonthlyExample, unit: string | null | undefined): string {
  const prefix = `Beispiel ${example.workload} %: ${formatNumber(example.days, 1)} Tage`;
  if (unit === "tag") return `${prefix} × ${formatChf(example.daily)} = ${formatChf(example.amount)} pro Monat`;
  return `${prefix} × ${formatNumber(HOURS_PER_DAY, 1)} h = ${formatNumber(example.hours, 1)} h × ${formatChf(example.hourly)} = ${formatChf(example.amount)} pro Monat`;
}

/** Amount typed into a form field (1'250.50 or 1250,50), null when empty or not a valid amount. */
export function parseAmountInput(value: string): number | null {
  const s = value.replace(/['’\s]/g, "").replace(",", ".");
  if (s === "" || !/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Number(s);
}

const LEGAL_FORM = /\s+(ag|gmbh|sa|sàrl|sarl|ltd|inc|kg|gmbh\s*&\s*co\.?\s*kg|holding|group|gruppe)\.?$/i;

/**
 * Names (end client, company) that a portal text mentions. Candidates should not learn who the
 * client is from the portal unless Ferhat decides so; the form shows these as a warning.
 * Also matches the name without its legal form ("Muster Bank" for "Muster Bank AG").
 */
export function confidentialMentions(text: string, names: readonly (string | null | undefined)[]): string[] {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const found: string[] = [];
  for (const raw of names) {
    const name = raw?.trim();
    if (!name) continue;
    const variants = [name, name.replace(LEGAL_FORM, "")].map((v) => v.trim().toLowerCase()).filter((v) => v.length >= 3);
    const hit = variants.some((v) => {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(haystack);
    });
    if (hit && !found.includes(name)) found.push(name);
  }
  return found;
}

// --- Matching list ---------------------------------------------------------------

/**
 * Top entries of a ranking, with one candidate (opened from the candidate page) moved to the
 * top even if it would not make the cut.
 */
export function topMatches<T extends { candidate: { id: number } }>(ranked: readonly T[], limit: number, highlightId?: number | null) {
  const highlighted = highlightId ? ranked.find((r) => r.candidate.id === highlightId) ?? null : null;
  const rest = ranked.filter((r) => r !== highlighted).slice(0, highlighted ? Math.max(limit - 1, 0) : limit);
  return { items: highlighted ? [highlighted, ...rest] : rest, highlighted };
}

/** Candidates suggested for sharing a vacancy: good matches not yet shared. */
export function suggestedShareIds(
  ranked: readonly { candidate: { id: number }; match: { score: number } }[],
  alreadyShared: ReadonlySet<number>,
  { max = 5, minScore = 50 }: { max?: number; minScore?: number } = {},
): number[] {
  return ranked
    .filter((r) => r.match.score >= minScore && !alreadyShared.has(r.candidate.id))
    .slice(0, max)
    .map((r) => r.candidate.id);
}
