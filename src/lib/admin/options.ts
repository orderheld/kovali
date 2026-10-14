import type { OwnerType } from "./owner";

/**
 * Labels and allowed values of every fixed-choice field in the admin area. The database has
 * matching check constraints (db/migrations.ts). Shared by forms, server validation and tables.
 * Entries marked `legacy` are values old rows may still hold: they keep their label but are not
 * offered in forms (use `offered()` for choices and validation).
 */

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";

export interface Option<V extends string = string> {
  value: V;
  label: string;
  tone?: Tone;
  description?: string;
  /** Still valid in the database for old rows, but no longer offered. */
  legacy?: boolean;
}

function options<const V extends string>(list: readonly Option<V>[]) {
  return list;
}

export function labelOf(list: readonly Option[], value: string | null | undefined): string {
  if (!value) return "–";
  return list.find((o) => o.value === value)?.label ?? value;
}

export function toneOf(list: readonly Option[], value: string | null | undefined): Tone {
  return list.find((o) => o.value === value)?.tone ?? "neutral";
}

export function valuesOf<V extends string>(list: readonly Option<V>[]): [V, ...V[]] {
  return list.map((o) => o.value) as [V, ...V[]];
}

/** The entries offered in forms: without legacy values. */
export function offered<V extends string>(list: readonly Option<V>[]): Option<V>[] {
  return list.filter((o) => !o.legacy);
}

// --- Firmen -----------------------------------------------------------------

export const companyKinds = options([
  { value: "auftraggeber", label: "Vermittler / Auftraggeber", tone: "blue", description: "Schreibt Vakanzen aus oder setzt dich ein, z. B. GHR Group oder Coopers Group." },
  { value: "endkunde", label: "Endkunde", tone: "violet", description: "Kunde, bei dem du arbeitest." },
  { value: "partner", label: "Partner", tone: "amber" },
  { value: "sonstige", label: "Sonstige", tone: "neutral" },
  { value: "subunternehmer", label: "Subunternehmer", tone: "neutral", legacy: true },
]);

export const companyStatuses = options([
  { value: "aktiv", label: "Aktiv", tone: "green" },
  { value: "inaktiv", label: "Inaktiv", tone: "neutral" },
]);

export const salutations = options([
  { value: "frau", label: "Frau" },
  { value: "herr", label: "Herr" },
]);

// --- Gemeinsam ---------------------------------------------------------------

export const remoteOptions = options([
  { value: "vor_ort", label: "Vor Ort" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "offen", label: "Offen" },
]);

export const rateUnits = options([
  { value: "stunde", label: "pro Stunde" },
  { value: "tag", label: "pro Tag" },
]);

// --- Aufträge ----------------------------------------------------------------

export const assignmentStatuses = options([
  { value: "geplant", label: "Geplant", tone: "blue" },
  { value: "laufend", label: "Laufend", tone: "green" },
  { value: "beendet", label: "Beendet", tone: "neutral" },
]);

/** How Ferhat is paid for an assignment (assignments.billing). */
export const billingModels = options([
  { value: "rechnung", label: "Rechnung über Einzelfirma", description: "Du stellst Rechnung und zahlst Sozialversicherungen und Vorsorge selbst." },
  { value: "lohn", label: "Lohn über Payroll", description: "Die Firma stellt dich an und zahlt dir einen Lohn mit Abzügen." },
]);

/** Payroll only: what the agreed rate means (assignments.rate_basis). */
export const rateBases = options([
  { value: "brutto", label: "Bruttolohn inkl. Ferien, Feiertage, 13. Monatslohn", description: "Der Satz ist dein Stundenlohn brutto, alle Zuschläge schon drin." },
  { value: "kostensatz", label: "Kostensatz der Firma", description: "Der Satz ist, was die Firma pro Stunde insgesamt für dich ausgibt." },
]);

// --- Vakanzen (Tabelle mandates) ----------------------------------------------

export const mandateKinds = options([
  { value: "ausschreibung", label: "Ausschreibung", description: "Ein Vermittler hat die Vakanz ausgeschrieben, du bewirbst dich." },
  { value: "anfrage", label: "Anfrage", description: "Ein Vermittler oder Kunde fragt dich direkt an." },
  { value: "direkt", label: "Direkt beim Kunden", description: "Ohne Vermittler." },
]);

/** Application pipeline of a vacancy. The values come from the former mandate module. */
export const mandateStatuses = options([
  { value: "neu", label: "Entdeckt", tone: "blue" },
  { value: "in_bearbeitung", label: "In Vorbereitung", tone: "amber" },
  { value: "angeboten", label: "Beworben", tone: "violet" },
  { value: "interview", label: "Interview", tone: "violet" },
  { value: "gewonnen", label: "Zusage", tone: "green" },
  { value: "verloren", label: "Absage", tone: "red" },
  { value: "zurueckgezogen", label: "Zurückgezogen", tone: "neutral" },
  { value: "pausiert", label: "Pausiert", tone: "neutral" },
]);

/** Vacancies still in progress. */
export const openMandateStatuses = ["neu", "in_bearbeitung", "angeboten", "interview"] as const;

export const mandatePriorities = options([
  { value: "hoch", label: "Hoch", tone: "red" },
  { value: "normal", label: "Normal", tone: "neutral" },
  { value: "tief", label: "Tief", tone: "neutral" },
]);

export const mandateSources = options([
  { value: "portal", label: "Portal des Vermittlers" },
  { value: "e_mail", label: "E-Mail" },
  { value: "telefon", label: "Telefon" },
  { value: "netzwerk", label: "Netzwerk" },
  { value: "website", label: "Website" },
  { value: "sonstige", label: "Sonstige" },
]);

// --- Verträge ---------------------------------------------------------------

/** Kind of a filed contract (contracts.template). */
export const contractKinds = options([
  { value: "rahmenvertrag", label: "Rahmenvertrag" },
  { value: "einzelauftrag", label: "Einzelauftrag" },
  { value: "arbeitsvertrag", label: "Arbeitsvertrag" },
  { value: "nda", label: "Geheimhaltungsvereinbarung (NDA)" },
  { value: "auftragsbestaetigung", label: "Auftragsbestätigung" },
  { value: "sonstiges", label: "Sonstiger Vertrag" },
  { value: "subunternehmer", label: "Subunternehmervertrag", legacy: true },
  { value: "beratung", label: "Beratungsvertrag", legacy: true },
  { value: "einwilligung", label: "Einwilligung", legacy: true },
]);

export const contractStatuses = options([
  { value: "entwurf", label: "In Prüfung", tone: "neutral" },
  { value: "versendet", label: "Zur Unterschrift", tone: "amber" },
  { value: "unterzeichnet", label: "Unterzeichnet", tone: "green" },
  { value: "beendet", label: "Beendet", tone: "neutral" },
  { value: "storniert", label: "Hinfällig", tone: "red" },
]);

// --- Dokumente und Notizen --------------------------------------------------

export const documentKinds = options([
  { value: "ausschreibung", label: "Ausschreibung" },
  { value: "bewerbung", label: "Bewerbung" },
  { value: "cv", label: "Lebenslauf" },
  { value: "offerte", label: "Offerte" },
  { value: "vertrag", label: "Vertrag" },
  { value: "rapport", label: "Rapport" },
  { value: "rechnung", label: "Rechnung" },
  { value: "lohnabrechnung", label: "Lohnabrechnung" },
  { value: "korrespondenz", label: "Korrespondenz" },
  { value: "sonstiges", label: "Sonstiges" },
  { value: "zeugnis", label: "Arbeitszeugnis", legacy: true },
  { value: "diplom", label: "Diplom", legacy: true },
  { value: "zertifikat", label: "Zertifikat", legacy: true },
  { value: "anforderung", label: "Anforderungsprofil", legacy: true },
  { value: "einwilligung", label: "Einwilligung", legacy: true },
]);

export type DocumentKind = (typeof documentKinds)[number]["value"];

/** Kinds offered when uploading to a record, the most common first. */
export const documentKindsByOwner: Record<OwnerType, readonly DocumentKind[]> = {
  mandate: ["ausschreibung", "bewerbung", "cv", "offerte", "korrespondenz", "sonstiges"],
  assignment: ["vertrag", "rapport", "rechnung", "lohnabrechnung", "korrespondenz", "sonstiges"],
  contract: ["vertrag", "sonstiges"],
  company: ["vertrag", "korrespondenz", "sonstiges"],
};

/** The document kinds of one owner type as options, in the order of documentKindsByOwner. */
export function documentKindOptions(owner: OwnerType): Option<DocumentKind>[] {
  return documentKindsByOwner[owner].map((value) => documentKinds.find((k) => k.value === value)!);
}

export const activityKinds = options([
  { value: "notiz", label: "Notiz" },
  { value: "anruf", label: "Anruf" },
  { value: "e_mail", label: "E-Mail" },
  { value: "termin", label: "Termin" },
  { value: "system", label: "System" },
]);
