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
      "Fachapplikationen, die Verwaltungsstellen und externe Partner gemeinsam nutzen und die strenge rechtliche Vorgaben erfüllen müssen.",
    points: [
      "Anforderungen vieler Beteiligter zusammenführen und gewichten",
      "Datenschutz und Informationssicherheit als prüfbare Anforderungen",
      "Agile Weiterentwicklung von Fachapplikationen",
    ],
    services: ["business-analysis", "requirements-engineering", "application-management"],
  },
  {
    id: "logistik-transport",
    name: "Logistik und Transport",
    kind: "experience",
    summary: "Gekoppelte Systeme und durchgängige Abläufe, bei denen Störungen sofort im Betrieb spürbar sind.",
    points: [
      "End-to-End-Abläufe über mehrere Systeme hinweg",
      "Tests über gekoppelte Systeme und Schnittstellen",
      "Agile Zusammenarbeit in grossen Organisationen",
    ],
    services: ["test-management", "test-engineering", "application-management"],
  },
  {
    id: "detailhandel-zahlungsverkehr",
    name: "Detailhandel und Zahlungsverkehr",
    kind: "experience",
    summary:
      "Kassen- und Zahlungsprozesse, in denen Verkaufsstellen, Zahlungsdienstleister und interne Systeme zuverlässig zusammenspielen müssen.",
    points: [
      "Schnittstellen zu Zahlungsdienstleistern und externen Partnern",
      "Sicherheits- und Compliance-Vorgaben im Zahlungsverkehr",
      "Tests und fachliche Abnahme vor jeder Einführung",
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
      "Kenntnis der Abläufe und Vorgaben grosser Organisationen",
    ],
    basis: "Übertragbare Kompetenzen aus Analyse und Test in grossen Organisationen",
    services: ["business-analysis", "requirements-engineering", "test-management", "test-engineering"],
  },
];

export function getIndustry(id: IndustryId): Industry | undefined {
  return industries.find((i) => i.id === id);
}
