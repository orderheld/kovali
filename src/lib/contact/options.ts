import type { ServiceSlug } from "@/content/types";

// Options of the contact form. Shared by the client form and the server validation.

/** How a company wants to work with KOVALI. What it needs is asked separately (serviceChoices). */
export const requestTypes = [
  // The values stay as they are: /unternehmen links to ?anfrage=contracting, and stored requests use them.
  { value: "contracting", label: "Subunternehmen im Kundenmandat", description: "KOVALI übernimmt eine offene Aufgabe im Mandat Ihres Kunden." },
  { value: "projekt", label: "Projekt oder Teilmandat", description: "Ein abgegrenztes Vorhaben mit klarem Ergebnis." },
  { value: "kooperation", label: "Wiederkehrende Zusammenarbeit", description: "Sie vergeben regelmässig Aufgaben an KOVALI, zum Beispiel in grösseren Mandaten." },
  { value: "allgemeine-anfrage", label: "Allgemeine Anfrage", description: "Eine Frage oder ein erstes Kennenlernen." },
] as const;

// Service names are repeated here (instead of importing all service content) to keep the client bundle small.
const serviceNames = [
  { value: "business-analysis", label: "Business Analysis & Requirements Engineering" },
  { value: "test-management", label: "Testmanagement" },
  { value: "test-engineering", label: "Test Engineering" },
  { value: "application-management", label: "Application Management" },
] as const satisfies readonly { value: ServiceSlug; label: string }[];

/** Choices of the multi-select "Gewünschte Leistungen": the four disciplines and "Noch offen". */
export const serviceChoices = [...serviceNames, { value: "offen", label: "Noch offen" }] as const;

/**
 * Single service value as stored in contact_requests.service (store.ts): the one selected
 * discipline, "mehrere" for several, "offen" for none. Derived from the selection (schema.ts).
 */
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

export const durationOptions = [
  { value: "bis-3-monate", label: "Bis 3 Monate" },
  { value: "3-6-monate", label: "3 bis 6 Monate" },
  { value: "6-12-monate", label: "6 bis 12 Monate" },
  { value: "ueber-12-monate", label: "Länger als 12 Monate" },
  { value: "offen", label: "Noch offen" },
] as const;

/** Labels with a non-breaking space before the percent sign. */
export const workloadOptions = [
  { value: "bis-40", label: "Bis 40\u00a0%" },
  { value: "50-70", label: "50 bis 70\u00a0%" },
  { value: "80-100", label: "80 bis 100\u00a0%" },
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
export type ServiceChoice = Values<typeof serviceChoices>;
export type ServiceOption = Values<typeof serviceOptions>;

export const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as [Values<T>, ...Values<T>[]];

export function labelOf(list: readonly { value: string; label: string }[], value: string | undefined): string {
  return list.find((o) => o.value === value)?.label ?? "–";
}

/** Labels of the selected services in the order of the form, e.g. for the e-mail. */
export function serviceLabels(selected: readonly string[]): string {
  const labels = serviceChoices.filter((o) => selected.includes(o.value)).map((o) => o.label);
  return labels.length > 0 ? labels.join(", ") : "–";
}
