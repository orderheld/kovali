import type { Service, ServiceSlug } from "./types";

/**
 * The four core services, ordered along the chain from requirement to acceptance.
 * Business Analysis and Requirements Engineering form one service (Ferhat Demir, 13.10.2026).
 * Each entry feeds the overview, its own page (/leistungen/[slug]), metadata and JSON-LD.
 */
export const services: Service[] = [
  {
    slug: "business-analysis",
    code: "01",
    name: "Business Analysis & Requirements Engineering",
    summary:
      "Geschäftsprozesse analysieren und Anforderungen nach IREB-Standard erheben, spezifizieren und verwalten, damit Business und IT dasselbe meinen.",
    h1: "Business Analyst und Requirements Engineer für IT-Projekte in der Schweiz",
    metaTitle: "Business Analyst & Requirements Engineer Schweiz",
    metaDescription:
      "Externer Business Analyst und Requirements Engineer für IT-Projekte in der Schweiz: Prozesse analysieren, Anforderungen nach IREB erheben und spezifizieren.",
    keyword: "Business Analyst Schweiz",
    intro:
      "Viele IT-Projekte scheitern nicht an der Technik, sondern an unklaren Anforderungen. KOVALI analysiert Ihre Geschäftsprozesse, bringt Fachbereiche und IT an einen Tisch und hält die Anforderungen nach IREB-Standard vollständig, eindeutig und prüfbar fest. Business Analysis und Requirements Engineering greifen dabei ineinander: von der Ist-Analyse über die fachliche Lösung bis zur abgestimmten, verwalteten Anforderungsbasis.",
    tasks: [
      "Analyse geschäftlicher Anforderungen",
      "Stakeholder Management",
      "Requirements Workshops",
      "Geschäftsprozessanalyse",
      "Business Process Modeling (BPMN)",
      "Ist-/Soll-Analysen",
      "Fachkonzepte und fachliche Lösungsdefinition",
      "User Stories, Epics und Akzeptanzkriterien",
      "Funktionale und nichtfunktionale Anforderungen",
      "UML Use Cases und Use-Case-Spezifikationen",
      "Schnittstellenanforderungen",
      "Datenflüsse und Feld-Mappings",
      "Requirements Validation und Requirements Management",
      "Anforderungspriorisierung",
      "Change Requests",
    ],
    deliverables: [
      "Ist-/Soll-Analyse mit Handlungsbedarf",
      "Prozessmodelle in BPMN",
      "Fachkonzept mit Lösungsvarianten und Empfehlung",
      "Anforderungsspezifikation mit funktionalen und nichtfunktionalen Anforderungen",
      "Epics und umsetzungsreife User Stories mit Akzeptanzkriterien",
      "Use-Case-Diagramme (UML) und Use-Case-Spezifikationen",
      "Schnittstellenspezifikationen mit Datenflüssen, Feld-Mappings und Fehlerfällen",
      "Priorisierter, nachvollziehbarer Anforderungsbestand",
      "Bewertete Change Requests",
    ],
    benefits: [
      {
        title: "Gemeinsames Verständnis",
        text: "Fachbereich, IT und Entwicklung arbeiten mit denselben, eindeutig formulierten Anforderungen.",
      },
      {
        title: "Prüfbare Anforderungen",
        text: "Jede Anforderung hat Akzeptanzkriterien und lässt sich im Test eindeutig nachweisen.",
      },
      {
        title: "Weniger Nacharbeit",
        text: "Lücken und Widersprüche werden vor der Umsetzung sichtbar, nicht erst im Test oder im Betrieb.",
      },
      {
        title: "Beherrschte Änderungen",
        text: "Versionierung und Priorisierung halten den Umfang kontrollierbar, auch wenn sich Anforderungen ändern.",
      },
    ],
    scenarios: [
      {
        title: "Neue Fachapplikation",
        text: "Anforderungen vieler Anspruchsgruppen zusammenführen, Zielkonflikte klären und Prioritäten festlegen.",
      },
      {
        title: "Systemintegration",
        text: "Schnittstellen zu Umsystemen, zentralen Diensten oder externen Partnern fachlich spezifizieren.",
      },
      {
        title: "Agiles Produktteam braucht Verstärkung",
        text: "Backlog schärfen, umsetzungsreife User Stories liefern und Refinements strukturiert vorbereiten.",
      },
      {
        title: "Ausschreibung oder Offertvergleich",
        text: "Anforderungen so beschreiben, dass Anbieter vergleichbar offerieren und Lösungen bewertet werden können.",
      },
    ],
    industries: [
      "oeffentliche-verwaltung",
      "logistik-transport",
      "detailhandel-zahlungsverkehr",
      "finanzdienstleistungen",
      "versicherungen",
    ],
    methods: [
      "IREB CPRE",
      "BPMN",
      "UML",
      "Use Cases",
      "User Stories",
      "Schnittstellenspezifikation",
      "Scrum",
      "SAFe",
      "Kanban",
      "Jira",
      "Confluence",
    ],
    faq: [
      {
        question: "Was macht ein Business Analyst in einem IT-Projekt?",
        answer:
          "Ein Business Analyst erhebt und analysiert die Anforderungen der Fachbereiche, modelliert die Geschäftsprozesse und beschreibt die fachliche Lösung so, dass Entwicklung, Test und Betrieb damit arbeiten können. Bis zur Abnahme bleibt er Ansprechpartner für fachliche Fragen. Mehr dazu im Artikel [Was macht ein Business Analyst?](/insights/was-macht-ein-business-analyst)",
      },
      {
        question: "Ist Business Analysis dasselbe wie Requirements Engineering?",
        answer:
          "Nicht ganz. Business Analysis klärt, welches geschäftliche Problem gelöst werden soll und welche Lösung den grössten Nutzen bringt. Requirements Engineering beschreibt die gewählte Lösung in Anforderungen, die vollständig, eindeutig und prüfbar sind, und verwaltet sie über das Projekt. In der Praxis greifen beide ineinander, deshalb bietet KOVALI sie als eine Leistung an. Ausführlich im Artikel [Business Analysis vs. Requirements Engineering](/insights/business-analysis-vs-requirements-engineering).",
      },
      {
        question: "Was bedeutet IREB CPRE?",
        answer:
          "Certified Professional for Requirements Engineering des International Requirements Engineering Board. Das Foundation Level bescheinigt die Grundlagen der Erhebung, Dokumentation, Validierung und Verwaltung von Anforderungen.",
      },
      {
        question: "Wann lohnt sich ein externer Business Analyst?",
        answer:
          "Wenn intern Kapazität oder Methodenwissen fehlt, ein Vorhaben neutral moderiert werden soll oder ein Projekt kurzfristig Struktur braucht. Ein externer Business Analyst bringt Erfahrung aus anderen Organisationen mit und lässt sich gezielt für eine Projektphase einsetzen.",
      },
      {
        question: "Arbeitet KOVALI agil oder klassisch?",
        answer:
          "Beides. KOVALI arbeitet in Scrum-, Kanban- und SAFe-Umgebungen ebenso wie in klassischen Projekten mit Fachkonzept. Das Vorgehen richtet sich nach Ihrer Organisation.",
      },
      {
        question: "Kann KOVALI auch über einen IT-Dienstleister beauftragt werden?",
        answer:
          "Ja. Neben Direktmandaten arbeitet KOVALI als Subunternehmen für Consulting- und Contracting-Firmen. Details zur Zusammenarbeit finden Sie unter [Für Unternehmen](/unternehmen).",
      },
    ],
    cta: "Business Analysis anfragen",
  },
  {
    slug: "application-management",
    code: "02",
    name: "Application Management",
    summary:
      "Business-Applikationen fachlich betreuen, Änderungen analysieren und Releases begleiten, damit Systeme stabil laufen und sich gezielt weiterentwickeln.",
    h1: "Fachliches Application Management für Business-Applikationen",
    metaTitle: "Application Management Schweiz – fachliche Betreuung",
    metaDescription:
      "Fachliches Application Management in der Schweiz: Änderungsanforderungen analysieren, Releases begleiten, Incidents untersuchen und Applikationen weiterentwickeln.",
    keyword: "Application Management Schweiz",
    intro:
      "Nach dem Go-live beginnt die längste Phase im Lebenszyklus einer Applikation. KOVALI übernimmt die fachliche Betreuung: Änderungswünsche werden analysiert und priorisiert, Releases begleitet, Incidents und Probleme fachlich untersucht. So bleibt die Applikation nah an den Bedürfnissen der Fachbereiche.",
    tasks: [
      "Fachliche Betreuung von Business-Applikationen",
      "Analyse von Änderungsanforderungen",
      "Change- und Release-Begleitung",
      "Koordination zwischen Fachbereichen und IT",
      "Incident- und Problem-Analyse",
      "Anwendungsschnittstellen",
      "Applikationsoptimierung",
      "Kontinuierliche Weiterentwicklung bestehender Systeme",
    ],
    deliverables: [
      "Analysierte und priorisierte Change Requests",
      "Release-Planung, Release Notes und Hotfix-Koordination",
      "Fachliche Incident- und Problemanalysen",
      "Aktuelle Anwendungs- und Prozessdokumentation",
      "Optimierungsvorschläge mit Nutzenbewertung",
    ],
    benefits: [
      {
        title: "Klare Zuständigkeit",
        text: "Fachbereiche haben eine Ansprechstelle, die Applikation, Prozesse und Schnittstellen kennt.",
      },
      {
        title: "Kontrollierte Releases",
        text: "Änderungen werden geplant, getestet und abgestimmt ausgeliefert, Hotfixes eingeschlossen.",
      },
      {
        title: "Ursachen statt Symptome",
        text: "Incidents werden bis zur fachlichen Ursache analysiert, wiederkehrende Probleme nachhaltig gelöst.",
      },
      {
        title: "Gezielte Weiterentwicklung",
        text: "Optimierungen orientieren sich am Nutzen für die Anwenderinnen und Anwender.",
      },
    ],
    scenarios: [
      {
        title: "Fachapplikation im Betrieb",
        text: "Änderungswünsche laufend umsetzen und in regelmässigen Releases ausliefern.",
      },
      {
        title: "Release- und Hotfix-Koordination",
        text: "Auslieferungen planen und mit allen Beteiligten abstimmen, von der Entwicklung bis zum Betrieb.",
      },
      {
        title: "Regulierte Umgebungen",
        text: "Applikationen betreuen, bei denen jede Änderung Vorgaben einhalten und lückenlos dokumentiert sein muss.",
      },
      {
        title: "Werkzeugwechsel",
        text: "Neue Werkzeuge so einführen, dass Abläufe und Zuständigkeiten danach klar geregelt sind.",
      },
    ],
    industries: ["oeffentliche-verwaltung", "logistik-transport", "detailhandel-zahlungsverkehr", "versicherungen"],
    methods: ["Incident Management", "Problem Management", "Change Management", "Release Management", "Kanban", "Jira", "SQL"],
    faq: [
      {
        question: "Was umfasst fachliches Application Management?",
        answer:
          "Die fachliche Betreuung einer Applikation im Betrieb: Anforderungen und Änderungswünsche analysieren, Releases planen und begleiten, Incidents und Probleme fachlich untersuchen und die Applikation weiterentwickeln. Der technische Betrieb wie Hosting und Infrastruktur bleibt beim IT-Betreiber.",
      },
      {
        question: "Übernimmt KOVALI auch den technischen Betrieb?",
        answer:
          "Nein. KOVALI konzentriert sich auf die fachliche Seite und arbeitet eng mit Ihrem technischen Betrieb und Ihren Entwicklungspartnern zusammen.",
      },
      {
        question: "Wie wird die Weiterentwicklung priorisiert?",
        answer:
          "Nach Nutzen, Dringlichkeit und Aufwand, gemeinsam mit Product Owner und Fachbereichen und transparent im Backlog dokumentiert.",
      },
    ],
    cta: "Application Management anfragen",
  },
  {
    slug: "test-management",
    code: "03",
    name: "Test Management",
    summary:
      "Tests konzipieren, planen und koordinieren, Fehler steuern und transparent berichten, bis zur fachlichen Abnahme.",
    h1: "Test Manager für IT-Projekte in der Schweiz",
    metaTitle: "Test Manager Schweiz – Testmanagement für IT-Projekte",
    metaDescription:
      "Testmanagement nach ISTQB: Testkonzept, Testplanung, Koordination, Defect Management und fachliche Abnahme für Integrations- und End-to-End-Tests.",
    keyword: "Test Manager Schweiz",
    intro:
      "Qualität entsteht nicht im letzten Sprint. KOVALI plant und steuert Tests von Anfang an: mit einem Testkonzept, das zu Risiken und Vorgehen passt, klarer Koordination der Beteiligten und einem Reporting, auf dessen Basis über Releases und Abnahmen entschieden werden kann.",
    tasks: [
      "Testkonzeption",
      "Testplanung",
      "Testkoordination",
      "Testfallmanagement",
      "Testdurchführung",
      "Defect Management",
      "Testreporting",
      "Qualitätssicherung",
      "Integrationstests",
      "End-to-End-Tests",
      "Fachliche Abnahmetests",
    ],
    deliverables: [
      "Testkonzept und risikobasierte Teststrategie",
      "Testplan mit Zuständigkeiten und Terminen",
      "Testfallkatalog und Testabdeckung",
      "Fehlerberichte und Defect-Übersicht",
      "Testberichte und Abnahmeprotokolle",
    ],
    benefits: [
      {
        title: "Risikobasiert testen",
        text: "Der Testaufwand fliesst dorthin, wo Fehler am meisten kosten würden.",
      },
      {
        title: "Transparenter Status",
        text: "Teststand, offene Fehler und Qualitätsrisiken sind jederzeit nachvollziehbar.",
      },
      {
        title: "Saubere Abnahmen",
        text: "Abnahmetests mit den Fachbereichen sind vorbereitet, dokumentiert und nachvollziehbar.",
      },
      {
        title: "Koordinierte Beteiligte",
        text: "Fachbereich, Entwicklung und externe Partner testen nach einem gemeinsamen Plan.",
      },
    ],
    scenarios: [
      {
        title: "End-to-End-Prozesse über mehrere Systeme",
        text: "Geschäftsprozesse durchgängig testen, über alle beteiligten Schnittstellen und Kanäle hinweg.",
      },
      {
        title: "Einführung eines neuen Systems",
        text: "Integrations- und Abnahmetests vor dem Rollout und während einer Pilotphase steuern.",
      },
      {
        title: "Release-Tests im agilen Umfeld",
        text: "Regressionstests und Abnahmen im Takt der Sprints oder Program Increments organisieren.",
      },
      {
        title: "Mehrere Entwicklungspartner",
        text: "Wenn mehrere Teams und Lieferanten beteiligt sind, Fehler zentral erfassen, priorisieren und bis zur Behebung verfolgen.",
      },
    ],
    industries: ["logistik-transport", "detailhandel-zahlungsverkehr", "oeffentliche-verwaltung", "finanzdienstleistungen", "versicherungen"],
    methods: ["ISTQB", "Risikobasiertes Testen", "Jira Xray", "Zephyr", "SAFe", "Scrum"],
    faq: [
      {
        question: "Was macht ein Test Manager?",
        answer:
          "Ein Test Manager legt fest, was, wie und wann getestet wird, koordiniert die Testaktivitäten aller Beteiligten, steuert das Fehlermanagement und berichtet über Teststand und Qualitätsrisiken. Am Ende liefert er die Grundlage für die Freigabe- oder Abnahmeentscheidung.",
      },
      {
        question: "Ab wann sollte das Testmanagement starten?",
        answer:
          "So früh wie möglich, idealerweise parallel zur Anforderungsanalyse. Testbare Anforderungen und ein frühes Testkonzept verhindern teure Fehler kurz vor dem Go-live.",
      },
      {
        question: "Unterstützt KOVALI fachliche Abnahmetests?",
        answer:
          "Ja. KOVALI plant Abnahmetests mit den Fachbereichen, bereitet Testfälle und Testdaten vor, begleitet die Durchführung und dokumentiert das Ergebnis.",
      },
      {
        question: "Was bedeutet ISTQB CTFL?",
        answer:
          "Certified Tester Foundation Level des International Software Testing Qualifications Board, der verbreitete Grundlagenstandard für strukturiertes Softwaretesten.",
      },
    ],
    cta: "Test Management anfragen",
  },
  {
    slug: "test-engineering",
    code: "04",
    name: "Test Engineering",
    summary:
      "Testfälle systematisch entwerfen und durchführen, von System- und Integrationstests bis zur Regression, mit präziser Fehleranalyse.",
    h1: "Test Engineering für zuverlässige IT-Systeme",
    metaTitle: "Test Engineering Schweiz – System- und Regressionstests",
    metaDescription:
      "Test Engineering in der Schweiz: Testfalldesign, funktionale System-, Integrations-, Regressions- und End-to-End-Tests, Testdaten und Fehleranalyse.",
    keyword: "Test Engineering Schweiz",
    intro:
      "Test Engineering macht Qualität messbar. KOVALI entwirft Testfälle aus Anforderungen und Risiken, führt funktionale System-, Integrations- und End-to-End-Tests durch und analysiert Fehler so präzise, dass Entwicklungsteams sie rasch beheben können.",
    tasks: [
      "Testfallanalyse und Testfalldesign",
      "Funktionale Systemtests",
      "Integrationstests",
      "Regressionstests",
      "End-to-End-Testverfahren",
      "Testdaten und Testumgebungen",
      "Fehleranalyse",
      "Zusammenarbeit mit Entwicklungsteams",
      "Qualitätssicherung im agilen Umfeld",
    ],
    deliverables: [
      "Testfälle und Testsets, abgeleitet aus Anforderungen",
      "Aufbereitete Testdaten",
      "Testprotokolle mit nachvollziehbaren Ergebnissen",
      "Reproduzierbare Fehlerberichte",
      "Gepflegte Regressionstest-Sets",
    ],
    benefits: [
      {
        title: "Systematisches Testdesign",
        text: "Testfälle werden aus Anforderungen, Grenzwerten und Risiken abgeleitet, nicht zufällig gewählt.",
      },
      {
        title: "Reproduzierbare Fehler",
        text: "Fehlerberichte mit Schritten, Daten und erwartetem Verhalten verkürzen die Behebung.",
      },
      {
        title: "Stabile Releases",
        text: "Regressionstests schützen bestehende Funktionen bei jeder Änderung.",
      },
      {
        title: "Im Team integriert",
        text: "Enge Zusammenarbeit mit Entwicklung und Product Owner im agilen Alltag.",
      },
    ],
    scenarios: [
      {
        title: "Integrationen testen",
        text: "Datenaustausch und Fehlerbehandlung zwischen gekoppelten Systemen prüfen.",
      },
      {
        title: "Web und Mobile",
        text: "Funktionale Tests von Webapplikationen und mobilen Apps über alle relevanten Abläufe.",
      },
      {
        title: "Regression vor dem Release",
        text: "Regressionstest-Sets aufbauen, pflegen und vor jedem Release ausführen.",
      },
      {
        title: "Daten prüfen",
        text: "Testdaten aufbereiten und Ergebnisse direkt in der Datenbank per SQL verifizieren.",
      },
    ],
    industries: ["logistik-transport", "oeffentliche-verwaltung", "detailhandel-zahlungsverkehr", "it-dienstleister"],
    methods: ["ISTQB", "Äquivalenzklassen", "Grenzwertanalyse", "SQL", "Jira Xray", "Zephyr", "Scrum", "SAFe"],
    faq: [
      {
        question: "Was ist der Unterschied zwischen Test Management und Test Engineering?",
        answer:
          "Test Management plant und steuert die Tests, Test Engineering entwirft und führt sie durch. In kleineren Vorhaben übernimmt oft eine Person beides, in grösseren Projekten werden die Rollen getrennt besetzt.",
      },
      {
        question: "Erstellt KOVALI auch automatisierte Tests?",
        answer:
          "Der Schwerpunkt liegt auf fachlichem und funktionalem Testen. Wo Automatisierung sinnvoll ist, wird sie im Testkonzept festgehalten und mit Ihrem Entwicklungsteam abgestimmt.",
      },
      {
        question: "Welche Testarten deckt KOVALI ab?",
        answer:
          "Funktionale Systemtests, Integrationstests, Regressionstests, End-to-End-Tests und fachliche Abnahmetests.",
      },
    ],
    cta: "Test Engineering anfragen",
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function serviceHref(slug: ServiceSlug): string {
  return `/leistungen/${slug}`;
}
