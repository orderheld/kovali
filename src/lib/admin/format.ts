/** Swiss formatting for the admin area and generated documents (time zone Europe/Zurich). */

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
const longDateFmt = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });

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

/** 13. Oktober 2026 */
export function formatLongDate(value: Date | string | null | undefined): string {
  return value ? longDateFmt.format(toDate(value)) : "–";
}

/** Today's date in Zurich as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}

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

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return `${pct.format(value)} %`;
}

/** "Jan. 2024" from YYYY-MM */
export function formatMonth(ym: string | null | undefined): string {
  if (!ym) return "";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const names = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  return `${names[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}

export function formatMonthRange(from: string, to: string): string {
  const a = formatMonth(from);
  const b = to ? formatMonth(to) : "heute";
  return a ? `${a} – ${b}` : b;
}

/** Display numbers: K-0042 (Kandidat), M-0007 (Mandat), F-0003 (Firma), VS-0012 (Vorschlag). */
export const displayNo = {
  candidate: (id: number) => `K-${String(id).padStart(4, "0")}`,
  mandate: (id: number) => `M-${String(id).padStart(4, "0")}`,
  company: (id: number) => `F-${String(id).padStart(4, "0")}`,
  submission: (id: number) => `VS-${String(id).padStart(4, "0")}`,
};

export function fullName(p: { firstName?: string | null; lastName?: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "–";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
