import type { ServiceSlug } from "@/content/types";

// Options of the contact form. Shared by the client form and the server validation.

/** How a company wants to work with KOVALI. What it needs is asked separately (serviceOptions). */
export const requestTypes = [
  { value: "contracting", label: "Contracting", description: "Eine Rolle im Mandat Ihres Kunden besetzen, als Subunternehmen." },
  { value: "projekt", label: "Projekt oder Teilmandat", description: "Ein abgegrenztes Vorhaben mit klarem Ergebnis." },
  { value: "kooperation", label: "Kooperation", description: "Regelmässig zusammenarbeiten, zum Beispiel bei grösseren Mandaten." },
  { value: "allgemeine-anfrage", label: "Allgemeine Anfrage", description: "Eine Frage oder ein erstes Kennenlernen." },
] as const;

// Service names are repeated here (instead of importing all service content) to keep the client bundle small.
const serviceNames = [
  { value: "business-analysis", label: "Business Analysis & Requirements Engineering" },
  { value: "application-management", label: "Application Management" },
  { value: "test-management", label: "Test Management" },
  { value: "test-engineering", label: "Test Engineering" },
] as const satisfies readonly { value: ServiceSlug; label: string }[];

export const serviceOptions = [
  ...serviceNames,
  { value: "mehrere", label: "Mehrere Leistungen" },
  { value: "offen", label: "Noch offen" },
] as const;

export const startOptions = [
  { value: "sofort", label: "So bald wie möglich" },
  { value: "1-monat", label: "Innerhalb eines Monats" },
  { value: "1-3-monate", label: "In ein bis drei Monaten" },
  { value: "spaeter", label: "In mehr als drei Monaten" },
  { value: "offen", label: "Noch offen" },
] as const;

export const workModes = [
  { value: "vor-ort", label: "Vor Ort" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
] as const;

/** Optional requirement profile in the contact form (PDF or Word). Stays below Vercel's 4.5 MB request limit. */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const ATTACHMENT_MAX_LABEL = "4 MB";

type Values<T extends readonly { value: string }[]> = T[number]["value"];
export type RequestType = Values<typeof requestTypes>;
export type ServiceOption = Values<typeof serviceOptions>;

export const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as [Values<T>, ...Values<T>[]];

export function labelOf(list: readonly { value: string; label: string }[], value: string | undefined): string {
  return list.find((o) => o.value === value)?.label ?? "–";
}
