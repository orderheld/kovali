import type { Tone } from "../options";

/**
 * When a contract runs out: "endet in 12 Tagen" within the warning window, "abgelaufen" for a
 * contract still marked as signed after its end date. Dates are calendar days (YYYY-MM-DD).
 */

/** Contracts ending within this many days are flagged in lists and on the detail page. */
export const CONTRACT_ENDING_DAYS = 60;

/** Statuses that no longer need a reminder. */
export const closedContractStatuses = ["beendet", "storniert"] as const;

export type ContractExpiry = { state: "ending"; days: number } | { state: "expired"; days: number } | null;

/** Whole days from `from` to `to` (negative when `to` lies before `from`). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function contractExpiry(
  contract: { status: string; validUntil: string | null },
  today: string,
  windowDays = CONTRACT_ENDING_DAYS,
): ContractExpiry {
  if (!contract.validUntil) return null;
  if ((closedContractStatuses as readonly string[]).includes(contract.status)) return null;
  const days = daysBetween(today, contract.validUntil);
  if (days < 0) return contract.status === "unterzeichnet" ? { state: "expired", days: -days } : null;
  return days <= windowDays ? { state: "ending", days } : null;
}

export function expiryLabel(expiry: NonNullable<ContractExpiry>): string {
  if (expiry.state === "expired") return expiry.days === 1 ? "seit gestern abgelaufen" : `seit ${expiry.days} Tagen abgelaufen`;
  if (expiry.days === 0) return "endet heute";
  if (expiry.days === 1) return "endet morgen";
  return `endet in ${expiry.days} Tagen`;
}

/** Red for the last two weeks, amber before; an expired contract is a neutral reminder. */
export function expiryTone(expiry: NonNullable<ContractExpiry>): Tone {
  if (expiry.state === "expired") return "neutral";
  return expiry.days <= 14 ? "red" : "amber";
}
