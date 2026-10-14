import { formatChf, formatNumber } from "@/lib/admin/format";
import { openMandateStatuses } from "@/lib/admin/options";
import { HOURS_PER_DAY, monthlyExample } from "@/lib/admin/rates";

/**
 * Which vacancies a candidate sees in the portal, and the example calculation shown with the
 * rate. Pure functions; vacancies.ts applies the same rule in SQL.
 */

/**
 * Candidate statuses that see vacancies published for "alle": everyone Ferhat still works
 * with, including people in an assignment (they look for the next one) and people marked as
 * not available (availability changes; they decide themselves). Archived candidates do not
 * see them; their data is on the way out. Vacancies shared with a person ("ausgewaehlt") are
 * shown regardless of the status, because Ferhat chose that person explicitly.
 */
export const candidateStatusesSeeingAll = ["neu", "aktiv", "im_einsatz", "nicht_verfuegbar"] as const;

export interface VisibilityInput {
  portalVisibility: string;
  status: string;
  closedAt: Date | null;
}

export function mandateOpen(m: Pick<VisibilityInput, "status" | "closedAt">): boolean {
  return m.closedAt === null && (openMandateStatuses as readonly string[]).includes(m.status);
}

export function seesAllVacancies(candidateStatus: string | null | undefined): boolean {
  return (candidateStatusesSeeingAll as readonly string[]).includes(candidateStatus ?? "");
}

export function vacancyVisible(m: VisibilityInput, candidateStatus: string | null | undefined, hasShare: boolean): boolean {
  if (!mandateOpen(m)) return false;
  if (m.portalVisibility === "alle") return seesAllVacancies(candidateStatus);
  if (m.portalVisibility === "ausgewaehlt") return hasShare;
  return false;
}

export interface RateExample {
  /** Workload of the example in percent. */
  workload: number;
  days: number;
  hours: number;
  hourly: number;
  daily: number;
  amount: number;
  unit: "stunde" | "tag";
  /** The calculation as one sentence, e.g. "Beispiel bei 100 %: 21 Arbeitstage × 8.4 h = … (exkl. MWST)". */
  text: string;
}

/**
 * One month at the vacancy's workload (100 % when none is set): rate × hours for hourly rates,
 * rate × days for daily rates. A business-to-business calculation: the amount the
 * specialist's own GmbH or AG invoices KOVALI (excluding VAT); salary, AHV and insurance are
 * paid by that firm. Never presented as a salary.
 */
export function rateExample(rate: number | null | undefined, unit: string | null | undefined, workload?: number | null): RateExample | null {
  if (rate === null || rate === undefined || Number.isNaN(rate) || rate <= 0) return null;
  const u: "stunde" | "tag" = unit === "tag" ? "tag" : "stunde";
  const ex = monthlyExample(rate, u, workload ?? 100);
  if (!ex) return null;
  const days = formatNumber(ex.days, 1);
  // The same amount as the admin preview (monthlyExample): rate × days or rate × hours.
  const amount = ex.amount;
  const calc =
    u === "tag"
      ? `${days} Arbeitstage × ${formatChf(rate)} = ${formatChf(amount)}`
      : `${days} Arbeitstage × ${formatNumber(HOURS_PER_DAY, 1)} h = ${formatNumber(ex.hours, 1)} h × ${formatChf(ex.hourly)} = ${formatChf(amount)}`;
  return {
    workload: ex.workload,
    days: ex.days,
    hours: ex.hours,
    hourly: ex.hourly,
    daily: ex.daily,
    amount,
    unit: u,
    text: `Beispiel bei ${ex.workload} %: ${calc} pro Monat, die Ihre Firma KOVALI in Rechnung stellt (exkl. MWST)`,
  };
}

/** Title shown to candidates. The internal title may name the end client, so it is never used. */
export function vacancyTitle(m: { id: number; portalTitle: string | null }): string {
  return m.portalTitle?.trim() || `Projektmandat M-${String(m.id).padStart(4, "0")}`;
}
