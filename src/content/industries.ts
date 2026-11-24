import type { Industry, IndustryId } from "./types";

/**
 * Industries. "experience" entries are sectors from Ferhat Demir's own practice and are
 * always attributed to him; "target" entries are markets KOVALI addresses. Never present a
 * target market as experience, and never name former employers, projects, systems or
 * periods here.
 */
export const industries: Industry[] = [
  {
    id: "oeffentliche-verwaltung",
    name: "Öffentliche Verwaltung",
    kind: "experience",
    summary: "Fachapplikationen mit vielen Benutzergruppen und strengen Vorgaben zu Datenschutz und Berechtigungen.",
    points: [
      "Anforderungen vieler Beteiligter zusammenführen und gewichten",
      "Datenschutz und Informationssicherheit als prüfbare Anforderungen",
      "Agile Weiterentwicklung von Fachapplikationen",
    ],
    services: ["business-analysis", "application-management"],
  },
  {
    id: "logistik-transport",
    name: "Logistik und Transport",
    kind: "experience",
    summary:
      "Abläufe von der Planung bis zur Zustellung über mehrere gekoppelte Systeme: Fällt eine Schnittstelle aus, bleibt die Sendung liegen.",
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
      "Kasse, Zahlterminal und Zahlungsdienstleister: Eine neue Zahlungsart betrifft jedes System in dieser Kette.",
    points: [
      "Schnittstellen zu Zahlungsdienstleistern und Drittsystemen",
      "Sicherheits- und Compliance-Vorgaben im Zahlungsverkehr",
      "Tests und fachliche Abnahme vor jeder Einführung",
    ],
    services: ["business-analysis", "test-management"],
  },
  {
    id: "finanzdienstleistungen",
    name: "Banken und Finanzdienstleister",
    kind: "target",
    summary:
      "Zahlungsprozesse und regulatorische Vorgaben, die sich in Anforderungen und Tests nachweisen lassen müssen.",
    points: [
      "Zahlungsprozesse und Schnittstellen zu Zahlungsdienstleistern",
      "Compliance- und Datenschutzvorgaben als prüfbare Anforderungen",
      "Strukturierte Test- und Abnahmeverfahren",
    ],
    services: ["business-analysis", "test-management"],
  },
  {
    id: "versicherungen",
    name: "Versicherungen",
    kind: "target",
    summary: "Applikationen mit langen Lebenszyklen und hohen Anforderungen an Datenschutz.",
    points: [
      "Fachliche Analyse und Modellierung von Geschäftsprozessen",
      "Weiterentwicklung bestehender Fachapplikationen",
      "Integrations- und Regressionstests über mehrere Systeme",
    ],
    services: ["business-analysis", "test-management", "application-management"],
  },
  {
    id: "it-dienstleister",
    name: "IT-Dienstleistungsunternehmen",
    kind: "target",
    summary:
      "Beratungen und IT-Dienstleister, die für ein Kundenmandat Business Analysis oder Test als Subunternehmen vergeben.",
    points: [
      "Einsatz als Subunternehmen im Kundenmandat",
      "Klar abgegrenzte Teilprojekte mit definiertem Ergebnis",
      "Kenntnis der Abläufe und Vorgaben grosser Organisationen",
    ],
    services: ["business-analysis", "test-management", "test-engineering"],
  },
];

export function getIndustry(id: IndustryId): Industry | undefined {
  return industries.find((i) => i.id === id);
}
