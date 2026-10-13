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

/**
 * Example for one month: rate × 8.4 hours × 21 days × workload. Used in the portal so a
 * candidate sees what a rate means per month.
 */
export function monthlyExample(amount: number | null | undefined, unit: string | null | undefined, workloadPercent = 100): MonthlyExample | null {
  const hourly = toHourly(amount, unit);
  if (hourly === null) return null;
  const workload = Math.min(Math.max(workloadPercent, 10), 100);
  const days = Math.round(WORKDAYS_PER_MONTH * (workload / 100) * 10) / 10;
  const hours = Math.round(days * HOURS_PER_DAY * 10) / 10;
  return { hourly, daily: hourly * HOURS_PER_DAY, hours, days, amount: Math.round(hourly * hours * 100) / 100, workload };
}

export interface Margin {
  /** Per hour, in CHF. */
  amount: number;
  /** Share of the selling rate, 0–100. */
  percent: number;
}

/** Margin between selling rate (client pays) and buying rate (subcontractor gets), per hour. */
export function margin(
  sell: number | null | undefined,
  buy: number | null | undefined,
  sellUnit: string | null | undefined,
  buyUnit: string | null | undefined = sellUnit,
): Margin | null {
  const s = toHourly(sell, sellUnit);
  const b = toHourly(buy, buyUnit);
  if (s === null || b === null || s <= 0) return null;
  const amount = Math.round((s - b) * 100) / 100;
  return { amount, percent: Math.round(((s - b) / s) * 10000) / 100 };
}
