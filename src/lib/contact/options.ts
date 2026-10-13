import type { ServiceSlug } from "@/content/types";

/** Options of the contact form. Shared by the client form and the server validation. */
export const requestTypes = [
  { value: "it-consulting-mandat", label: "IT-Consulting-Mandat" },
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements-engineering", label: "Requirements Engineering" },
  { value: "application-management", label: "Application Management" },
  { value: "test-management-engineering", label: "Test Management / Test Engineering" },
  { value: "b2b-kooperation", label: "B2B-Kooperation" },
  { value: "allgemeine-anfrage", label: "Allgemeine Anfrage" },
] as const;

// Service names are repeated here (instead of importing all service content) to keep the client bundle small.
const serviceNames = [
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements-engineering", label: "Requirements Engineering" },
  { value: "application-management", label: "Application Management" },
  { value: "test-management", label: "Test Management" },
  { value: "test-engineering", label: "Test Engineering" },
] as const satisfies readonly { value: ServiceSlug; label: string }[];

export const serviceOptions = [
  ...serviceNames,
  { value: "mehrere", label: "Mehrere Leistungen" },
  { value: "offen", label: "Noch offen, Beratung gewünscht" },
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

type Values<T extends readonly { value: string }[]> = T[number]["value"];
export type RequestType = Values<typeof requestTypes>;
export type ServiceOption = Values<typeof serviceOptions>;

export const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as [Values<T>, ...Values<T>[]];

export function labelOf(list: readonly { value: string; label: string }[], value: string | undefined): string {
  return list.find((o) => o.value === value)?.label ?? "–";
}

/** Maps ?leistung= to the matching request type, so one link preselects both fields. */
export function requestTypeForService(service: string): RequestType | undefined {
  switch (service) {
    case "business-analysis":
    case "requirements-engineering":
    case "application-management":
      return service;
    case "test-management":
    case "test-engineering":
      return "test-management-engineering";
    default:
      return undefined;
  }
}
