import type { Industry, IndustryId } from "./types";

/**
 * Industries. "experience" entries are sectors known from practice; "target" entries
 * are markets KOVALI addresses with transferable skills. Never present a target market
 * as experience, and never name former employers, projects, systems or periods here.
 */
export const industries: Industry[] = [
  {
    id: "oeffentliche-verwaltung",
    name: "Öffentliche Verwaltung",
    kind: "experience",
    summary:
      "Fachapplikationen mit vielen Anspruchsgruppen, strengen Vorgaben und hohen Anforderungen an Nachvollziehbarkeit.",
    points: [
      "Anforderungen zahlreicher Anspruchsgruppen konsolidieren und priorisieren",
      "Schnittstellen zu zentralen Diensten und Registern",
      "Datenschutz, Informationssicherheit und rollenbasierte Berechtigungen",
      "Agile Weiterentwicklung von Fachapplikationen",
    ],
    services: ["business-analysis", "requirements-engineering", "application-management"],
  },
  {
    id: "logistik-transport",
    name: "Logistik und Transport",
    kind: "experience",
    summary: "Durchgängige Prozesse über viele Systeme, Standorte und Partner hinweg.",
    points: [
      "End-to-End-Prozesse über mehrere Systeme und Organisationseinheiten",
      "Mobile Anwendungen im operativen Einsatz",
      "Integrations- und Regressionstests in gekoppelten Systemlandschaften",
      "Zusammenarbeit in SAFe- und Kanban-Organisationen",
    ],
    services: ["test-management", "test-engineering", "application-management"],
  },
  {
    id: "detailhandel-zahlungsverkehr",
    name: "Detailhandel und Zahlungsverkehr",
    kind: "experience",
    summary: "Kassen- und Zahlungsprozesse mit vielen beteiligten Systemen und Partnern.",
    points: [
      "Elektronischer Zahlungsverkehr und Kassenprozesse",
      "Einführung neuer Zahlungsmittel",
      "Pilotierung und schrittweiser Rollout neuer Systeme",
      "Schnittstellen zu Zahlungsdienstleistern",
    ],
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
    basis: "Übertragbare Kompetenzen aus Zahlungsverkehr, öffentlicher Verwaltung und Qualitätssicherung",
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
      "Vertraut mit den Abläufen und Vorgaben grosser Organisationen",
    ],
    basis: "Zusammenarbeit als B2B-Partner, siehe Seite «Für Partner»",
    services: ["business-analysis", "requirements-engineering", "test-management", "test-engineering"],
  },
];

export function getIndustry(id: IndustryId): Industry | undefined {
  return industries.find((i) => i.id === id);
}
