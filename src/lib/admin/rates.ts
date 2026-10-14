/** Rates: a daily rate as an hourly one. Pure functions. */

/** Hours per working day (Swiss full-time 42 hours per week). */
export const HOURS_PER_DAY = 8.4;

export function toHourly(amount: number | null | undefined, unit: string | null | undefined): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return unit === "tag" ? amount / HOURS_PER_DAY : amount;
}

