import type { Industry, IndustryId } from "./types";

/**
 * Industries. "experience" entries are backed by the founder's professional
 * history; "target" entries are markets KOVALI addresses with transferable skills.
 * Never present a target market as proven experience.
 */
export const industries: Industry[] = [
  {
    id: "oeffentliche-verwaltung",
    name: "Öffentliche Verwaltung",
    kind: "experience",
    summary:
      "Nationale Fachapplikationen mit vielen Anspruchsgruppen: Bund, Kantone, Verbände und Fachstellen.",
    points: [
      "Anforderungen zahlreicher Stakeholder konsolidieren und priorisieren",
      "Schnittstellen zu Bundesdiensten wie eIAM und Personenregistern",
      "Datenschutz, Informationssicherheit und rollenbasierte Berechtigungen",
      "Agile Entwicklung von Webapplikationen und Mobile Apps",
    ],
    basis: "Berufserfahrung beim Bundesamt für Sport BASPO, 2023–2026",
    services: ["business-analysis", "requirements-engineering", "application-management"],
  },
  {
    id: "logistik-transport",
    name: "Logistik und Transport",
    kind: "experience",
    summary:
      "Grosse IT-Organisationen mit durchgängigen Prozessen von der Planung bis zur Zustellung.",
    points: [
      "End-to-End-Prozesse von der Tourenplanung bis zur Zustellung",
      "Mobile Zustellanwendungen und Scanlösungen",
      "Dokumentenmanagement und revisionssichere Archivierung",
      "Zusammenarbeit in SAFe- und Kanban-Organisationen",
    ],
    basis: "Berufserfahrung bei der Schweizerischen Post, 2020–2022, und bei SBB Informatik, 2016–2020",
    services: ["test-management", "test-engineering", "application-management"],
  },
  {
    id: "detailhandel-zahlungsverkehr",
    name: "Detailhandel und Zahlungsverkehr",
    kind: "experience",
    summary: "Kassensysteme, elektronischer Zahlungsverkehr und die Einführung neuer Zahlungsmittel.",
    points: [
      "Electronic Funds Transfer (EFT) und Kassenprozesse",
      "Einführung von TWINT im Kassenumfeld",
      "Pilotierung und Rollout neuer Kassensysteme",
      "Schnittstellen zu Zahlungsdienstleistern",
    ],
    basis: "Berufserfahrung bei Coop, 2022–2023",
    services: ["business-analysis", "requirements-engineering", "test-management"],
  },
  {
    id: "finanzdienstleistungen",
    name: "Banken und Finanzdienstleister",
    kind: "target",
    summary:
      "Regulierte Umgebungen, in denen Anforderungen nachvollziehbar und Tests belastbar sein müssen.",
    points: [
      "Zahlungsprozesse und Schnittstellen zu Zahlungsdienstleistern",
      "Compliance- und Datenschutzvorgaben als prüfbare Anforderungen",
      "Strukturierte Test- und Abnahmeverfahren",
    ],
    basis: "Übertragbare Kompetenzen aus Zahlungsverkehr, Bundesverwaltung und Qualitätssicherung",
    services: ["business-analysis", "requirements-engineering", "test-management"],
  },
  {
    id: "versicherungen",
    name: "Versicherungen",
    kind: "target",
    summary:
      "Komplexe Applikationslandschaften mit langen Lebenszyklen und hohen Anforderungen an Datenschutz.",
    points: [
      "Fachliche Analyse und Modellierung von Geschäftsprozessen",
      "Weiterentwicklung bestehender Fachapplikationen",
      "Integrations- und Regressionstests über mehrere Systeme",
    ],
    basis: "Übertragbare Kompetenzen aus Application Management und Test in grossen Organisationen",
    services: ["business-analysis", "application-management", "test-management"],
  },
  {
    id: "it-dienstleister",
    name: "IT-Dienstleistungsunternehmen",
    kind: "target",
    summary:
      "Consulting-, Contracting- und IT-Dienstleister, die für Kundenmandate spezialisierte Analyse- und Testkompetenz suchen.",
    points: [
      "Einsatz als Subunternehmen im Kundenmandat",
      "Klar abgegrenzte Teilprojekte mit definiertem Ergebnis",
      "Erfahrung in den Strukturen grosser Auftraggeber",
    ],
    basis: "Zusammenarbeit als B2B-Partner, siehe Seite «Für Partner»",
    services: ["business-analysis", "requirements-engineering", "test-management", "test-engineering"],
  },
];

export function getIndustry(id: IndustryId): Industry | undefined {
  return industries.find((i) => i.id === id);
}
