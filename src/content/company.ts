import type { StaticImageData } from "next/image";
import { site } from "@/config/site";
import type { TitledText } from "./types";

/**
 * Ferhat Demir's personal certificates, shown as "Zertifikate von Ferhat Demir" (spec 3.4).
 * Personal attribution still needs his OK (spec 7, item 9).
 */
export const certifications = [
  {
    id: "ireb-cpre-fl",
    short: "IREB CPRE",
    text: "Zertifikat des International Requirements Engineering Board. Anforderungen in Ihren Unterlagen folgen einem Aufbau, den viele Entwicklungs- und Testteams kennen.",
    credential: "Certified Professional for Requirements Engineering, Foundation Level",
  },
  {
    id: "istqb-ctfl",
    short: "ISTQB CTFL",
    text: "Zertifikat des International Software Testing Qualifications Board. Testkonzepte und Testberichte verwenden die Begriffe, mit denen auch Ihre Testteams arbeiten.",
    credential: "Certified Tester, Foundation Level",
  },
] as const;

export interface ExperienceFigure {
  /** Lower bound as shown, e.g. "10+". Hard-coded so prerendered pages need no `new Date()`. */
  value: string;
  label: string;
  /** Start month (YYYY-MM) the figure counts from, for checking it stays true. */
  since: string;
}

/**
 * Ferhat Demir, Geschäftsführer. Every experience figure on the site is his personal
 * experience and is shown with `experienceNote`, never as KOVALI's. Deliberately no CV
 * details: no former employers, projects, periods, job titles or language levels
 * (Ferhat Demir, 13.10.2026).
 */
export const founder: {
  name: string;
  role: string;
  /** Static import of src/assets/ferhat-demir.jpg once the photo exists; null shows the "FD" monogram. */
  portrait: StaticImageData | null;
  experience: readonly ExperienceFigure[];
  experienceNote: string;
  /** Running-text version of the figures, for bylines and contact cards. */
  experienceLine: string;
  /** Short paragraph for the compact person block (home). */
  intro: string;
  /** Two paragraphs for the full person block (Warum KOVALI). */
  summary: readonly string[];
  /** Certificates and working languages in one sentence (compact person block). */
  credentialsLine: string;
  /** Fact list of the full person block. */
  facts: readonly { label: string; value: string }[];
} = {
  name: "Ferhat Demir",
  role: site.contact.title,
  portrait: null,
  experience: [
    { value: "10+", label: "Jahre in der IT", since: "2016-08" },
    // "5+" as in his CV ("über fünf Jahre"), decided by the thread lead (spec addendum 1).
    { value: "5+", label: "Jahre in Business Analysis und Requirements Engineering", since: "2020-03" },
  ],
  experienceNote: `Persönliche Berufserfahrung von Ferhat Demir, ${site.contact.title}.`,
  experienceLine: "seit über 10 Jahren in der IT, seit 2020 in Business Analysis und Requirements Engineering",
  intro:
    "Ferhat Demir arbeitet seit über 10 Jahren in der IT und seit 2020 in Business Analysis und Requirements Engineering. Er hat Anforderungen mit Fachbereichen erhoben, Schnittstellen bis auf Feldebene beschrieben und Tests bis zur Abnahme begleitet, in der öffentlichen Verwaltung, in der Logistik und im Detailhandel mit Zahlungsverkehr.",
  summary: [
    "Ferhat Demir arbeitet seit über 10 Jahren in der IT und seit 2020 in Business Analysis und Requirements Engineering. Er hat Anforderungen mit Fachbereichen erhoben, Schnittstellen bis auf Feldebene beschrieben, Testkonzepte geschrieben und Tests bis zur Abnahme begleitet.",
    "Gearbeitet hat er in grossen Schweizer Organisationen: in der öffentlichen Verwaltung, in der Logistik und im Detailhandel mit Zahlungsverkehr. Viele Anspruchsgruppen, gekoppelte Systeme und strenge Vorgaben zu Datenschutz und Informationssicherheit gehörten dort zum Alltag.",
  ],
  credentialsLine:
    "Zertifiziert nach IREB (CPRE Foundation Level) und ISTQB (Certified Tester Foundation Level). Arbeitssprachen: Deutsch, Französisch und Englisch.",
  facts: [
    {
      label: "Schwerpunkte",
      value: "Business Analysis, Requirements Engineering, Testmanagement, Application Management",
    },
    { label: "Arbeitssprachen", value: "Deutsch, Französisch, Englisch" },
    { label: "Einsatz", value: "Vor Ort, remote oder hybrid in der ganzen Schweiz" },
  ],
};

/** Working rules of KOVALI in a mandate (Warum KOVALI, "So arbeiten wir im Mandat"). */
export const principles: TitledText[] = [
  {
    title: "Keine User Story ohne Akzeptanzkriterien",
    text: "Bevor eine Story ins Refinement geht, steht fest, woran der Test sie misst.",
  },
  {
    title: "Offene Punkte mit Namen und Datum",
    text: "Annahmen und offene Entscheide stehen in einer Liste mit verantwortlicher Person und Termin, nicht verstreut in Protokollen.",
  },
  {
    title: "Schnittstellen bis aufs Feld",
    text: "Jede Schnittstelle bekommt ein Feld-Mapping mit Datentypen, Pflichtfeldern und Fehlerfällen.",
  },
  {
    title: "Zwei Fassungen, wo nötig",
    text: "Das Fachkonzept in der Sprache des Fachbereichs, die User Stories in der Sprache des Entwicklungsteams.",
  },
  {
    title: "Übergabe ohne Lücken",
    text: "Unterlagen entstehen in Ihren Werkzeugen, zum Beispiel in Jira und Confluence. Am Ende übergeben wir Anforderungs- und Teststand und die offenen Punkte so, dass Ihr Team ohne uns weiterarbeiten kann.",
  },
];
