import { site } from "@/config/site";
import type { TitledText } from "./types";

/** Brand philosophy: the three elements behind the name KOVALI. */
export const philosophy = [
  {
    code: "KO",
    name: "Konzeption",
    verb: "Verstehen und strukturieren",
    text: "Ziele, Anspruchsgruppen und Prozesse klären, Anforderungen erheben und die fachliche Lösung konzipieren.",
  },
  {
    code: "VA",
    name: "Value Analysis",
    verb: "Bewerten und priorisieren",
    text: "Nutzen, Aufwand und Risiken bewerten, Varianten vergleichen und Prioritäten nachvollziehbar festlegen.",
  },
  {
    code: "LI",
    name: "Lösungsintegration",
    verb: "Umsetzen und absichern",
    text: "Die Lösung in Systeme und Prozesse integrieren, testen, abnehmen und sicher in den Betrieb überführen.",
  },
] as const;

export const reasons: TitledText[] = [
  {
    title: "Spezialisiert statt generalistisch",
    text: "Der Fokus liegt auf der Strecke von der Anforderung bis zur Abnahme: Analyse, Anforderungen, Betreuung und Test aus einer Hand.",
  },
  {
    title: "Praxis in grossen Organisationen",
    text: "Viele Schnittstellen, Umsysteme und Anspruchsgruppen sind der Normalfall, im öffentlichen Sektor wie in der Privatwirtschaft.",
  },
  {
    title: "Zertifizierte Methodik",
    text: "Anerkannte Standards nach IREB und ISTQB schaffen eine gemeinsame Sprache mit Fachbereichen, Entwicklung und Test.",
  },
  {
    title: "Business und IT verbinden",
    text: "Vermittlung zwischen Fachbereichen, Product Ownern, Entwicklungsteams und externen Partnern, auf Deutsch, Französisch und Englisch.",
  },
];

/** Method standards KOVALI works by. Shown as company methodology, not as personal certificate data. */
export const certifications = [
  {
    id: "ireb-cpre-fl",
    short: "IREB CPRE",
    name: "Requirements Engineering nach IREB-Standard",
    text: "Anforderungen werden nach dem Standard des International Requirements Engineering Board erhoben, dokumentiert und geprüft.",
    credential: "Certified Professional for Requirements Engineering – Foundation Level",
  },
  {
    id: "istqb-ctfl",
    short: "ISTQB CTFL",
    name: "Softwaretest nach ISTQB-Standard",
    text: "Tests werden nach dem Standard des International Software Testing Qualifications Board geplant, entworfen und ausgewertet.",
    credential: "Certified Tester – Foundation Level",
  },
] as const;

export const competencies = [
  {
    group: "Analyse und Modellierung",
    items: ["Business Process Analysis", "BPMN", "UML", "Use Cases", "Datenfluss- und Schnittstellenanalyse"],
  },
  {
    group: "Anforderungen",
    items: ["Epics und User Stories", "Akzeptanzkriterien", "Schnittstellenspezifikation", "Nichtfunktionale Anforderungen", "Stakeholder Workshops"],
  },
  {
    group: "Vorgehen",
    items: ["Scrum", "Kanban", "SAFe", "Agile Requirements Engineering", "Release-Koordination"],
  },
  {
    group: "Qualität und Betrieb",
    items: ["Testing und Qualitätssicherung", "Defect Management", "Application Lifecycle Management", "Incident- und Problem-Analyse"],
  },
  {
    group: "Werkzeuge",
    items: ["Jira und Confluence", "Xray und Zephyr", "SQL"],
  },
] as const;

/** Key facts shown below the hero: the offer, not the founder's career. */
export const facts = [
  { value: "4", label: "Leistungen, einzeln oder kombiniert buchbar" },
  { value: "2", label: "Methodenstandards: IREB und ISTQB" },
  { value: "3", label: "Projektsprachen: Deutsch, Französisch, Englisch" },
  { value: "CH", label: "Vor Ort, remote oder hybrid in der ganzen Schweiz" },
] as const;

/**
 * Ferhat Demir, shown briefly on Über uns. Deliberately no CV details: no former
 * employers, projects, periods, job titles or language levels (Ferhat Demir, 13.10.2026).
 */
export const founder = {
  name: "Ferhat Demir",
  role: site.contact.title,
  summary: [
    "Ferhat Demir leitet KOVALI. Sein Anspruch: Analyse, Spezifikation, Betreuung und Test eines IT-Vorhabens kommen aus einer Hand.",
    "Sein Schwerpunkt liegt auf Vorhaben mit vielen Schnittstellen und Anspruchsgruppen, in denen Fachbereich und IT eine gemeinsame Sprache brauchen.",
  ],
} as const;

/** Working languages of KOVALI mandates. */
export const projectLanguages = ["Deutsch", "Französisch", "Englisch"] as const;

/** How KOVALI works with clients (Über uns). */
export const principles: TitledText[] = [
  {
    title: "Erst verstehen, dann spezifizieren",
    text: "Bevor Anforderungen geschrieben werden, sind Ziel, Umfang und Anspruchsgruppen geklärt. Das spart Diskussionen in späteren Phasen.",
  },
  {
    title: "Ergebnisse, die weiterverwendet werden",
    text: "Fachkonzepte, User Stories und Testfälle sind so aufgebaut, dass Entwicklung, Test und Betrieb direkt damit arbeiten können.",
  },
  {
    title: "Transparenz über offene Punkte",
    text: "Annahmen, Risiken und Entscheidungsbedarf werden früh sichtbar gemacht, statt am Ende eines Projekts aufzutauchen.",
  },
  {
    title: "Die Sprache der Beteiligten sprechen",
    text: "Fachbereich, Entwicklung und Management brauchen unterschiedliche Sichten auf dieselbe Sache. KOVALI übersetzt zwischen ihnen.",
  },
];
