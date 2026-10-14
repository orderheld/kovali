/**
 * Rates: conversions between hourly and daily rates, margins and the example calculation
 * candidates see per vacancy. Pure functions, shared by the admin area and the portal.
 */

/** Hours per working day (Swiss full-time 42 hours per week). */
export const HOURS_PER_DAY = 8.4;
/** Average working days per month used for examples (about 252 per year). */
export const WORKDAYS_PER_MONTH = 21;

export type RateUnit = "stunde" | "tag";

export function toHourly(amount: number | null | undefined, unit: string | null | undefined): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return unit === "tag" ? amount / HOURS_PER_DAY : amount;
}

export function toDaily(amount: number | null | undefined, unit: string | null | undefined): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return unit === "tag" ? amount : amount * HOURS_PER_DAY;
}

export interface MonthlyExample {
  hourly: number;
  daily: number;
  hours: number;
  days: number;
  /** Amount for one month at the given workload, before taxes and social insurance. */
  amount: number;
  workload: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Example for one month at a workload: 21 days × workload, then rate × hours (8.4 per day) for
 * an hourly rate, rate × days for a daily rate, so every factor of the shown calculation
 * multiplies out exactly. The one calculation behind the admin preview and the portal.
 */
export function monthlyExample(amount: number | null | undefined, unit: string | null | undefined, workloadPercent = 100): MonthlyExample | null {
  const hourly = toHourly(amount, unit);
  if (hourly === null) return null;
  const workload = Math.min(Math.max(workloadPercent, 10), 100);
  const days = Math.round(WORKDAYS_PER_MONTH * (workload / 100) * 10) / 10;
  const hours = Math.round(days * HOURS_PER_DAY * 10) / 10;
  const total = unit === "tag" ? round2(amount! * days) : round2(hourly * hours);
  return { hourly, daily: hourly * HOURS_PER_DAY, hours, days, amount: total, workload };
}

/**
 * Starting rates of a new submission: the mandate's selling rate and, as buying rate, the rate
 * published to candidates in the portal (what the candidate accepted when answering there) or
 * else the candidate's own rate, converted to the mandate's unit (hour or day).
 */
export function defaultSubmissionRates(
  mandate: { rateSell: number | null; rateUnit: string | null; portalRate?: number | null; portalRateUnit?: string | null },
  candidate: { rateAmount: number | null; rateUnit: string | null },
): { rateSell: number | null; rateBuy: number | null; rateUnit: RateUnit } {
  const published = mandate.portalRate !== null && mandate.portalRate !== undefined;
  const [amount, from] = published ? [mandate.portalRate, mandate.portalRateUnit ?? mandate.rateUnit] : [candidate.rateAmount, candidate.rateUnit];
  const unit: RateUnit = mandate.rateUnit === "tag" || (!mandate.rateUnit && from === "tag") ? "tag" : "stunde";
  const buy = unit === "tag" ? toDaily(amount, from) : toHourly(amount, from);
  return { rateSell: mandate.rateSell ?? null, rateBuy: buy === null ? null : round2(buy), rateUnit: unit };
}
