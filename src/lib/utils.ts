import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to know the custom font sizes from globals.css; otherwise it reads
 * `text-h1` as a colour and drops it next to `text-ink`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["display", "h1", "h2", "h3", "lead", "numeral", "statement"] },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats an ISO date (YYYY-MM-DD) as Swiss German date, e.g. 13. Oktober 2026. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  return `${d}. ${months[m - 1]} ${y}`;
}

const chfNumber = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });

/** Swiss number format with the apostrophe as thousands separator, e.g. 112’000. */
export function formatNumber(n: number): string {
  return chfNumber.format(n);
}

/** Swiss franc amount without decimals, e.g. formatChf(112000) → "CHF 112’000". */
export function formatChf(n: number): string {
  return `CHF ${formatNumber(n)}`;
}
