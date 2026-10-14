/** Swiss formatting and date helpers for the admin area (time zone Europe/Zurich). */

const TZ = "Europe/Zurich";

const dateFmt = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("de-CH", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: Date | string): Date {
  // Plain dates (YYYY-MM-DD) are calendar days; noon UTC keeps them on the same day in Zurich.
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}

/** 13.10.2026 */
export function formatDate(value: Date | string | null | undefined): string {
  return value ? dateFmt.format(toDate(value)) : "–";
}

/** 13.10.2026, 22:15 */
export function formatDateTime(value: Date | string | null | undefined): string {
  return value ? dateTimeFmt.format(toDate(value)) : "–";
}

/** Today's date in Zurich as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}

/** Adds calendar days to a YYYY-MM-DD date (negative values go back). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar days from `from` to `to` (YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetweenIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** Adds calendar months to a YYYY-MM-DD date; the 31st becomes the last day of a shorter month. */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

const chf = new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const chfRound = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 });

/** CHF 1’234.50 */
export function formatChf(amount: number | null | undefined, opts: { round?: boolean } = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "–";
  return `CHF ${(opts.round ? chfRound : chf).format(amount)}`;
}

/**
 * A rate per hour or day: "CHF 125.00 pro Stunde"; short "CHF 125 / h" or "CHF 1’100 / Tag"
 * (whole francs without decimals) for tiles and tables.
 */
export function formatRate(amount: number | null | undefined, unit: string | null | undefined, short = false): string {
  if (amount === null || amount === undefined) return "–";
  const per = unit === "tag" ? (short ? "/ Tag" : "pro Tag") : short ? "/ h" : "pro Stunde";
  return `${formatChf(amount, { round: short && Number.isInteger(amount) })} ${per}`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return `${pct.format(value)} %`;
}

/** Display numbers: A-0012 (Auftrag), M-0007 (Vakanz, table mandates), F-0003 (Firma), T-0004 (Textbaustein). */
export const displayNo = {
  assignment: (id: number) => `A-${String(id).padStart(4, "0")}`,
  mandate: (id: number) => `M-${String(id).padStart(4, "0")}`,
  company: (id: number) => `F-${String(id).padStart(4, "0")}`,
  snippet: (id: number) => `T-${String(id).padStart(4, "0")}`,
};

export function fullName(p: { firstName?: string | null; lastName?: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "–";
}

/** 820 B, 14 KB, 1.5 MB: with a decimal point like every other number. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${formatNumber(bytes / 1024 / 1024, 1)} MB`;
}
