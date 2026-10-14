/** Rates: conversions between hourly and daily rates. Pure functions. */

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
