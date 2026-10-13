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
    title: "Erfahrung in komplexen Landschaften",
    text: "Projekte in Bundesverwaltung, Transport, Logistik, Detailhandel und Zahlungsverkehr, mit vielen Schnittstellen und Anspruchsgruppen.",
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

export const certifications = [
  {
    id: "ireb-cpre-fl",
    short: "IREB CPRE FL",
    name: "Certified Professional for Requirements Engineering – Foundation Level",
    issuer: "International Requirements Engineering Board (IREB), geprüft durch SAQ Swiss Association for Quality",
    year: "2024",
  },
  {
    id: "istqb-ctfl",
    short: "ISTQB CTFL",
    name: "Certified Tester – Foundation Level",
    issuer: "International Software Testing Qualifications Board (ISTQB), geprüft durch SAQ Swiss Association for Quality",
    year: "2024",
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
    items: ["Jira", "Confluence", "Xray", "Zephyr", "SQL", "Microsoft 365"],
  },
] as const;

/** Key facts shown below the hero. Only verifiable statements. */
export const facts = [
  { value: "10+", label: "Jahre im IT-Umfeld" },
  { value: "5+", label: "Jahre Business Analysis und Requirements Engineering" },
  { value: "2", label: "Zertifizierungen: IREB CPRE und ISTQB" },
  { value: "3", label: "Projektsprachen: Deutsch, Französisch, Englisch" },
] as const;

export const founder = {
  name: "Ferhat Demir",
  role: "Gründer, Business Analyst, Requirements Engineer und IT-Consultant",
  summary: [
    "Ferhat Demir verbindet über fünf Jahre Erfahrung in Business Analysis und Requirements Engineering mit mehr als zehn Jahren Praxis im IT-Umfeld grosser Schweizer Organisationen, seit 2016.",
    "Seine Stärke liegt darin, komplexe fachliche Anforderungen zu verstehen, strukturiert aufzubereiten und zwischen Fachbereichen, IT, Entwicklungsteams und weiteren Anspruchsgruppen zu vermitteln.",
  ],
  languages: [
    { name: "Deutsch", level: "Muttersprache" },
    { name: "Französisch", level: "sehr gut (C1)" },
    { name: "Englisch", level: "gut (B2)" },
  ],
  experience: [
    {
      period: "2023–2026",
      organisation: "Bundesamt für Sport BASPO",
      role: "Business Analyst, Nationale Datenbank Sport / Jugend+Sport",
      points: [
        "Verantwortung für definierte Fachbereiche einer nationalen Fachapplikation mit Webapplikation und Mobile App",
        "Anforderungen von Kantonen, Verbänden und Fachstellen erhoben, konsolidiert und priorisiert",
        "Epics, User Stories, Akzeptanzkriterien, UML Use Cases, Fachkonzepte und technische Spezifikationen",
        "Schnittstellen zu Personenregister, eIAM und TrainingPlus, inklusive Datenflüssen und Feld-Mappings",
        "Zusätzlich Release-Koordination und fachliche Leitung der Migration auf das interne Jira-System",
      ],
    },
    {
      period: "2022–2023",
      organisation: "Coop",
      role: "Business Analyst, EFT und Kassensysteme",
      points: [
        "Analyse und Weiterentwicklung von Zahlungs-, EFT- und Kassenprozessen",
        "Anforderungen für die Einführung von TWINT im Kassenumfeld",
        "Begleitung der OmniPOS-Pilotierung und des Rollouts",
        "Schnittstellen zwischen Kassensystemen und Zahlungsdienstleistern",
      ],
    },
    {
      period: "2020–2022",
      organisation: "Die Schweizerische Post",
      role: "ICT Test Engineer / Test Manager",
      points: [
        "Test Management und Test Engineering für logistische IT-Systeme",
        "End-to-End-Prozesse von der Tourenplanung bis zur Zustellung, inklusive mobiler Zustellapplikationen",
        "Integrations- und Funktionstests, User Stories und Akzeptanzkriterien",
        "Koordination von Testaktivitäten in einer SAFe-Organisation",
      ],
    },
    {
      period: "2016–2020",
      organisation: "SBB Informatik",
      role: "Junior User Service Manager, Dokumentenmanagement",
      points: [
        "Application Management für Dokumentenmanagement auf Basis von OpenText",
        "Anforderungen, Change Requests und Use Cases aus verschiedenen Fachbereichen",
        "Test- und Release-Begleitung in Kanban-basierter Zusammenarbeit",
      ],
    },
  ],
  /** Required note: former employers are not KOVALI references. */
  employerNote:
    "Die genannten Organisationen sind Stationen der persönlichen Berufserfahrung von Ferhat Demir und keine Referenzkunden von KOVALI.",
} as const;

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
