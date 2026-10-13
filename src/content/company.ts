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
    title: "Erfahrung in komplexen IT-Landschaften",
    text: "Vorhaben mit vielen Schnittstellen, Umsystemen und Anspruchsgruppen, in der öffentlichen Verwaltung ebenso wie in der Privatwirtschaft.",
  },
  {
    title: "Zertifizierte Methodik",
    text: "IREB CPRE und ISTQB CTFL schaffen eine gemeinsame Sprache mit Fachbereichen, Entwicklung und Test.",
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
    name: "Certified Professional for Requirements Engineering – Foundation Level",
    text: "Anforderungen werden nach dem Standard des International Requirements Engineering Board (IREB) erhoben, dokumentiert und geprüft.",
  },
  {
    id: "istqb-ctfl",
    short: "ISTQB CTFL",
    name: "Certified Tester – Foundation Level",
    text: "Tests werden nach dem Standard des International Software Testing Qualifications Board (ISTQB) geplant, entworfen und ausgewertet.",
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
    items: ["Jira und Confluence", "Xray und Zephyr für das Testmanagement", "SQL für Datenanalysen"],
  },
] as const;

/** Key facts shown below the hero: the offer, not the founder's career. */
export const facts = [
  { value: "5", label: "Leistungen von der Anforderung bis zur Abnahme" },
  { value: "2", label: "Methodenstandards: IREB CPRE und ISTQB" },
  { value: "3", label: "Projektsprachen: Deutsch, Französisch, Englisch" },
  { value: "CH", label: "Vor Ort, remote oder hybrid in der ganzen Schweiz" },
] as const;

/**
 * Founder, shown briefly on Über uns. Deliberately no CV details: no former
 * employers, projects, periods, job titles or language levels (Ferhat Demir, 13.10.2026).
 */
export const founder = {
  name: "Ferhat Demir",
  role: "Gründer",
  summary: [
    "Ferhat Demir hat KOVALI gegründet, um Analyse, Anforderungen und Test als durchgängige Leistung anzubieten, von der ersten Anforderung bis zur abgenommenen Lösung.",
    "Seine Erfahrung stammt aus IT-Vorhaben in grossen Schweizer Organisationen, in der öffentlichen Verwaltung ebenso wie in der Privatwirtschaft. Als Ansprechpartner klärt er neue Anfragen persönlich.",
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

/** Location statements for Über uns and Kontakt (no claims about specific clients). */
export const location = {
  title: "Sitz in Grenchen, tätig in der ganzen Schweiz",
  text: "KOVALI hat seinen Sitz in Grenchen im Kanton Solothurn, an der Sprachgrenze zwischen Deutschschweiz und Romandie. Solothurn, Biel/Bienne, Bern und das Mittelland sind rasch erreichbar. Mandate werden in der ganzen Schweiz vor Ort, remote oder hybrid umgesetzt.",
};
