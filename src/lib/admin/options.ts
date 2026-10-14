/**
 * Labels and allowed values of every fixed-choice field in the admin area and the candidate
 * portal. The database has matching check constraints (db/migrations.ts). Shared by forms,
 * server validation, tables and documents.
 */

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";

export interface Option<V extends string = string> {
  value: V;
  label: string;
  tone?: Tone;
  description?: string;
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

// --- Firmen -----------------------------------------------------------------

export const companyKinds = options([
  { value: "auftraggeber", label: "Auftraggeber", tone: "blue", description: "Gibt KOVALI Mandate, z. B. ein IT-Dienstleister oder Direktkunde." },
  { value: "endkunde", label: "Endkunde", tone: "violet", description: "Kunde hinter einem Auftraggeber." },
  { value: "subunternehmer", label: "Subunternehmer", tone: "green", description: "Eigene Firma einer Fachperson, die KOVALI beauftragt." },
  { value: "partner", label: "Partner", tone: "amber" },
  { value: "sonstige", label: "Sonstige", tone: "neutral" },
]);

export const companyStatuses = options([
  { value: "aktiv", label: "Aktiv", tone: "green" },
  { value: "inaktiv", label: "Inaktiv", tone: "neutral" },
]);

export const salutations = options([
  { value: "frau", label: "Frau" },
  { value: "herr", label: "Herr" },
]);

// --- Kandidaten -------------------------------------------------------------

export const disciplines = options([
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements-engineering", label: "Requirements Engineering" },
  { value: "projektleitung", label: "Projektleitung" },
  { value: "product-owner", label: "Product Owner" },
  { value: "scrum-agile", label: "Scrum Master / Agile Coach" },
  { value: "test-management", label: "Test Management" },
  { value: "test-engineering", label: "Test Engineering / Automation" },
  { value: "application-management", label: "Application Management" },
  { value: "sap", label: "SAP-Beratung" },
  { value: "entwicklung", label: "Softwareentwicklung" },
  { value: "architektur", label: "Architektur" },
  { value: "data", label: "Data / BI" },
  { value: "cloud-devops", label: "Cloud / DevOps" },
  { value: "security", label: "IT-Security" },
  { value: "andere", label: "Andere" },
]);

export const seniorities = options([
  { value: "junior", label: "Junior" },
  { value: "professional", label: "Professional" },
  { value: "senior", label: "Senior" },
  { value: "expert", label: "Expert / Lead" },
]);

export const engagements = options([
  { value: "selbstaendig", label: "Selbständig / eigene Firma", description: "Einsatz als Subunternehmen von KOVALI." },
  { value: "anstellung", label: "Sucht Anstellung" },
  { value: "offen", label: "Offen" },
]);

export const candidateStatuses = options([
  { value: "neu", label: "Neu", tone: "blue" },
  { value: "aktiv", label: "Aktiv", tone: "green" },
  { value: "im_einsatz", label: "Im Einsatz", tone: "violet" },
  { value: "nicht_verfuegbar", label: "Nicht verfügbar", tone: "amber" },
  { value: "archiviert", label: "Archiviert", tone: "neutral" },
]);

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

export const candidateSources = options([
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "empfehlung", label: "Empfehlung" },
  { value: "netzwerk", label: "Eigenes Netzwerk" },
  { value: "portal", label: "Jobportal" },
  { value: "direkt", label: "Direkt beworben" },
  { value: "sonstige", label: "Sonstige" },
]);

export const workPermits = options([
  { value: "ch", label: "Schweizer Bürger/in" },
  { value: "c", label: "Niederlassung C" },
  { value: "b", label: "Aufenthalt B" },
  { value: "g", label: "Grenzgänger G" },
  { value: "l", label: "Kurzaufenthalt L" },
  { value: "eu-meldung", label: "EU/EFTA, Meldeverfahren" },
  { value: "keine", label: "Keine Bewilligung" },
]);

export const languageLevels = options([
  { value: "muttersprache", label: "Muttersprache" },
  { value: "c2", label: "C2 – verhandlungssicher" },
  { value: "c1", label: "C1 – fliessend" },
  { value: "b2", label: "B2 – gut" },
  { value: "b1", label: "B1 – erweiterte Grundkenntnisse" },
  { value: "a2", label: "A2 – Grundkenntnisse" },
]);

export const documentKinds = options([
  { value: "cv", label: "Lebenslauf" },
  { value: "zeugnis", label: "Arbeitszeugnis" },
  { value: "diplom", label: "Diplom" },
  { value: "zertifikat", label: "Zertifikat" },
  { value: "vertrag", label: "Vertrag (unterzeichnet)" },
  { value: "anforderung", label: "Anforderungsprofil" },
  { value: "einwilligung", label: "Einwilligung" },
  { value: "sonstiges", label: "Sonstiges" },
]);

// --- Mandate und Vorschläge -------------------------------------------------

export const mandateKinds = options([
  { value: "anfrage", label: "Anfrage", description: "Eine Firma fragt KOVALI direkt an." },
  { value: "ausschreibung", label: "Ausschreibung", description: "KOVALI bewirbt sich auf ein Mandat eines Providers oder Portals." },
  { value: "direkt", label: "Direktmandat", description: "Beratung durch KOVALI selbst." },
]);

export const mandateStatuses = options([
  { value: "neu", label: "Neu", tone: "blue" },
  { value: "in_bearbeitung", label: "In Bearbeitung", tone: "amber" },
  { value: "angeboten", label: "Angeboten", tone: "violet" },
  { value: "interview", label: "Interview", tone: "violet" },
  { value: "gewonnen", label: "Gewonnen", tone: "green" },
  { value: "verloren", label: "Verloren", tone: "red" },
  { value: "zurueckgezogen", label: "Zurückgezogen", tone: "neutral" },
  { value: "pausiert", label: "Pausiert", tone: "neutral" },
]);

/** Mandates still being worked on. */
export const openMandateStatuses = ["neu", "in_bearbeitung", "angeboten", "interview"] as const;

export const mandatePriorities = options([
  { value: "hoch", label: "Hoch", tone: "red" },
  { value: "normal", label: "Normal", tone: "neutral" },
  { value: "tief", label: "Tief", tone: "neutral" },
]);

export const mandateSources = options([
  { value: "website", label: "Website" },
  { value: "e_mail", label: "E-Mail" },
  { value: "portal", label: "Partnerportal" },
  { value: "telefon", label: "Telefon" },
  { value: "netzwerk", label: "Netzwerk" },
  { value: "sonstige", label: "Sonstige" },
]);

export const portalVisibilities = options([
  { value: "keine", label: "Nicht im Portal" },
  { value: "ausgewaehlt", label: "Nur ausgewählte Kandidaten" },
  { value: "alle", label: "Alle aktiven Kandidaten" },
]);

export const submissionStatuses = options([
  { value: "vorgemerkt", label: "Vorgemerkt", tone: "neutral" },
  { value: "einwilligung_offen", label: "Einwilligung offen", tone: "amber" },
  { value: "vorgeschlagen", label: "Vorgeschlagen", tone: "blue" },
  { value: "interview", label: "Interview", tone: "violet" },
  { value: "angebot", label: "Angebot", tone: "violet" },
  { value: "zusage", label: "Zusage", tone: "green" },
  { value: "absage", label: "Absage", tone: "red" },
  { value: "zurueckgezogen", label: "Zurückgezogen", tone: "neutral" },
]);

export const profileVariants = options([
  { value: "anonym", label: "Anonymisiert" },
  { value: "namentlich", label: "Mit Namen" },
]);

export const shareResponses = options([
  { value: "offen", label: "Noch keine Antwort", tone: "neutral" },
  { value: "interessiert", label: "Interessiert", tone: "green" },
  { value: "kein_interesse", label: "Kein Interesse", tone: "neutral" },
]);

/** How a candidate consented to the hand-over for one mandate (submissions.consent_method). */
export const consentMethods = options([
  { value: "schriftlich", label: "Schriftlich" },
  { value: "email", label: "E-Mail" },
  { value: "muendlich", label: "Mündlich (mit Notiz)", description: "Telefon oder Gespräch; wann und wie in der Notiz festhalten." },
  { value: "portal", label: "Kandidatenportal" },
  { value: "vertrag", label: "Unterzeichnete Einwilligung" },
]);

/**
 * Methods Ferhat records by hand. Portal consent is written by the portal, a signed consent
 * by the contracts module; neither is chosen in a form.
 */
export const manualConsentMethods = consentMethods.filter((m) => m.value === "schriftlich" || m.value === "email" || m.value === "muendlich");

// --- Verträge ---------------------------------------------------------------

export const contractStatuses = options([
  { value: "entwurf", label: "Entwurf", tone: "neutral" },
  { value: "versendet", label: "Versendet", tone: "amber" },
  { value: "unterzeichnet", label: "Unterzeichnet", tone: "green" },
  { value: "beendet", label: "Beendet", tone: "neutral" },
  { value: "storniert", label: "Storniert", tone: "red" },
]);

// --- Aktivitäten und Portal ---------------------------------------------------

export const activityKinds = options([
  { value: "notiz", label: "Notiz" },
  { value: "anruf", label: "Anruf" },
  { value: "e_mail", label: "E-Mail" },
  { value: "termin", label: "Termin" },
  { value: "system", label: "System" },
]);

export const changeSections = options([
  { value: "profil", label: "Profil und Kurzbeschreibung" },
  { value: "kompetenzen", label: "Kompetenzen und Zertifikate" },
  { value: "werdegang", label: "Werdegang und Projekte" },
  { value: "ausbildung", label: "Ausbildung" },
  { value: "sprachen", label: "Sprachen" },
  { value: "verfuegbarkeit", label: "Verfügbarkeit und Konditionen" },
  { value: "stammdaten", label: "Stammdaten (Änderungswunsch)" },
]);

export const changeStatuses = options([
  { value: "offen", label: "Nicht bestätigt", tone: "amber" },
  { value: "bestaetigt", label: "Bestätigt", tone: "green" },
  { value: "abgelehnt", label: "Abgelehnt", tone: "red" },
  { value: "zurueckgezogen", label: "Zurückgezogen", tone: "neutral" },
]);

export const accountStatuses = options([
  { value: "eingeladen", label: "Eingeladen", tone: "amber" },
  { value: "aktiv", label: "Aktiv", tone: "green" },
  { value: "gesperrt", label: "Gesperrt", tone: "red" },
]);
