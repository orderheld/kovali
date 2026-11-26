import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to know the custom font sizes from globals.css; otherwise it reads
 * `text-h1` as a colour and drops it next to `text-ink`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["hero", "h1", "title", "h2", "h3", "lead", "body"] },
  },
});

/**
 * A card whose heading link covers the whole card (`after:absolute after:inset-0`): the focus
 * ring is drawn around the card instead of around the link text.
 */
export const cardFocus =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-blue [&_a:focus-visible]:outline-none";

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
