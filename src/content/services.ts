import type { Service, ServiceSlug } from "./types";

/**
 * The five core services, ordered along the chain from requirement to acceptance.
 * Each entry feeds the overview, its own page (/leistungen/[slug]), metadata and JSON-LD.
 */
export const services: Service[] = [
  {
    slug: "business-analysis",
    code: "01",
    name: "Business Analysis",
    summary:
      "Geschäftsanforderungen verstehen, Prozesse analysieren und fachliche Lösungen so definieren, dass Business und IT dasselbe meinen.",
    h1: "Business Analyst für IT-Projekte in der Schweiz",
    metaTitle: "Business Analyst Schweiz – Business Analysis extern",
    metaDescription:
      "Externer Business Analyst für IT-Projekte in der Schweiz: Anforderungen erheben, Prozesse analysieren, Fachkonzepte und User Stories erstellen.",
    keyword: "Business Analyst Schweiz",
    intro:
      "Viele IT-Projekte scheitern nicht an der Technik, sondern an unklaren Anforderungen. KOVALI analysiert Ihre Geschäftsprozesse, bringt Fachbereiche und IT an einen Tisch und übersetzt Bedürfnisse in präzise, umsetzbare Anforderungen, von der Ist-Analyse bis zur fachlichen Lösungsdefinition.",
    tasks: [
      "Analyse geschäftlicher Anforderungen",
      "Stakeholder Management",
      "Requirements Workshops",
      "Geschäftsprozessanalyse",
      "Business Process Modeling (BPMN)",
      "Ist-/Soll-Analysen",
      "Business Requirements",
      "Fachkonzepte",
      "User Stories und Epics",
      "Akzeptanzkriterien",
      "Change Requests",
      "Fachliche Lösungsdefinition",
    ],
    deliverables: [
      "Ist-/Soll-Analyse mit Handlungsbedarf",
      "Prozessmodelle in BPMN",
      "Fachkonzept mit Lösungsvarianten und Empfehlung",
      "Epics und umsetzungsreife User Stories mit Akzeptanzkriterien",
      "Bewertete Change Requests",
      "Stakeholder-Übersicht und Workshop-Ergebnisse",
    ],
    benefits: [
      {
        title: "Gemeinsames Verständnis",
        text: "Fachbereich, IT und Entwicklung arbeiten mit denselben, eindeutig formulierten Anforderungen.",
      },
      {
        title: "Weniger Nacharbeit",
        text: "Lücken und Widersprüche werden vor der Umsetzung sichtbar, nicht erst im Test oder im Betrieb.",
      },
      {
        title: "Entscheidungen auf Fakten",
        text: "Ist-/Soll-Analysen und Variantenvergleiche machen Nutzen, Aufwand und Risiken transparent.",
      },
      {
        title: "Rasch wirksam",
        text: "Erfahrung in grossen Organisationen und in Scrum- wie SAFe-Umgebungen verkürzt die Einarbeitung.",
      },
    ],
    scenarios: [
      {
        title: "Neue Fachapplikation",
        text: "Anforderungen vieler Anspruchsgruppen zusammenführen, Zielkonflikte klären und Prioritäten festlegen.",
      },
      {
        title: "Ablösung oder Erweiterung eines Systems",
        text: "Auswirkungen auf Prozesse, Schnittstellen und Datenflüsse analysieren, bevor entschieden wird.",
      },
      {
        title: "Agiles Produktteam braucht Verstärkung",
        text: "Backlog schärfen, umsetzungsreife User Stories liefern und Refinements strukturiert vorbereiten.",
      },
      {
        title: "Regulatorische Vorgaben umsetzen",
        text: "Datenschutz-, Sicherheits- und Compliance-Vorgaben in prüfbare fachliche Anforderungen übersetzen.",
      },
    ],
    industries: [
      "oeffentliche-verwaltung",
      "logistik-transport",
      "detailhandel-zahlungsverkehr",
      "finanzdienstleistungen",
      "versicherungen",
    ],
    methods: ["BPMN", "UML", "Use Cases", "User Stories", "Scrum", "SAFe", "Kanban", "Jira", "Confluence"],
    faq: [
      {
        question: "Was macht ein Business Analyst in einem IT-Projekt?",
        answer:
          "Ein Business Analyst erhebt und analysiert die Anforderungen der Fachbereiche, modelliert die Geschäftsprozesse und beschreibt die fachliche Lösung so, dass Entwicklung, Test und Betrieb damit arbeiten können. Bis zur Abnahme bleibt er Ansprechpartner für fachliche Fragen. Mehr dazu im Artikel [Was macht ein Business Analyst?](/insights/was-macht-ein-business-analyst)",
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
        question: "Sind Einsätze vor Ort möglich?",
        answer:
          "Ja. Einsätze sind vor Ort, remote oder hybrid in der ganzen Schweiz möglich. Projektsprachen sind Deutsch, Französisch und Englisch.",
      },
      {
        question: "Kann KOVALI auch über einen IT-Dienstleister beauftragt werden?",
        answer:
          "Ja. Neben Direktmandaten arbeitet KOVALI als Subunternehmen für Consulting- und Contracting-Firmen. Details zur Zusammenarbeit finden Sie unter [Für Partner](/partner).",
      },
    ],
    cta: "Business Analysis anfragen",
  },
  {
    slug: "requirements-engineering",
    code: "02",
    name: "Requirements Engineering",
    summary:
      "Anforderungen systematisch erheben, dokumentieren, validieren und verwalten, nach IREB-Standard und passend zu Ihrem Vorgehen.",
    h1: "Requirements Engineer für IT-Projekte in der Schweiz",
    metaTitle: "Requirements Engineer Schweiz – RE Consulting",
    metaDescription:
      "Requirements Engineering nach IREB: Anforderungen erheben, dokumentieren, validieren und verwalten, inklusive Schnittstellen, Datenflüssen und Use Cases.",
    keyword: "Requirements Engineer Schweiz",
    intro:
      "Gute Anforderungen sind vollständig, eindeutig, prüfbar und abgestimmt. KOVALI erhebt und dokumentiert funktionale und nichtfunktionale Anforderungen nach IREB-Standard, spezifiziert Schnittstellen und Datenflüsse und hält die Anforderungsbasis über den ganzen Projektverlauf konsistent.",
    tasks: [
      "Requirements Elicitation",
      "Requirements Documentation",
      "Requirements Validation",
      "Requirements Management",
      "Funktionale und nichtfunktionale Anforderungen",
      "UML Use Cases",
      "Use-Case-Spezifikationen",
      "Schnittstellenanforderungen",
      "Datenflüsse und Feld-Mappings",
      "Anforderungspriorisierung",
      "Abstimmung zwischen Business und IT",
    ],
    deliverables: [
      "Anforderungsspezifikation mit funktionalen und nichtfunktionalen Anforderungen",
      "Use-Case-Diagramme (UML) und Use-Case-Spezifikationen",
      "Schnittstellenspezifikationen mit Fehlerfällen",
      "Datenflussbeschreibungen und Feld-Mappings",
      "Priorisierter, nachvollziehbarer Anforderungsbestand",
      "Glossar der fachlichen Begriffe",
    ],
    benefits: [
      {
        title: "Prüfbare Anforderungen",
        text: "Jede Anforderung hat Akzeptanzkriterien und lässt sich im Test eindeutig nachweisen.",
      },
      {
        title: "Saubere Schnittstellen",
        text: "Datenflüsse, Feld-Mappings und Fehlerfälle sind beschrieben, bevor Systeme gekoppelt werden.",
      },
      {
        title: "Beherrschte Änderungen",
        text: "Versionierung und Priorisierung halten den Umfang kontrollierbar, auch wenn sich Anforderungen ändern.",
      },
      {
        title: "Zertifizierte Methode",
        text: "Arbeit nach IREB CPRE, dem verbreiteten Standard für Requirements Engineering.",
      },
    ],
    scenarios: [
      {
        title: "Systemintegration",
        text: "Schnittstellen zu Umsystemen, zentralen Diensten oder externen Partnern fachlich spezifizieren.",
      },
      {
        title: "Ausschreibung oder Offertvergleich",
        text: "Anforderungen so beschreiben, dass Anbieter vergleichbar offerieren und Lösungen bewertet werden können.",
      },
      {
        title: "Nichtfunktionale Anforderungen",
        text: "Performance, Sicherheit, Datenschutz und Berechtigungen strukturiert und messbar erfassen.",
      },
      {
        title: "Gewachsene Anforderungsbasis",
        text: "Bestehende Dokumentation konsolidieren, Widersprüche auflösen und den Backlog bereinigen.",
      },
    ],
    industries: [
      "oeffentliche-verwaltung",
      "detailhandel-zahlungsverkehr",
      "logistik-transport",
      "finanzdienstleistungen",
      "versicherungen",
    ],
    methods: ["IREB CPRE", "UML", "Use Cases", "BPMN", "User Stories", "Schnittstellenspezifikation", "Jira", "Confluence"],
    faq: [
      {
        question: "Was ist der Unterschied zwischen Business Analysis und Requirements Engineering?",
        answer:
          "Business Analysis klärt, welches geschäftliche Problem gelöst werden soll und welche Lösung den grössten Nutzen bringt. Requirements Engineering beschreibt die gewählte Lösung in Anforderungen, die vollständig, eindeutig und prüfbar sind, und verwaltet sie über das Projekt. Ausführlich im Artikel [Business Analysis vs. Requirements Engineering](/insights/business-analysis-vs-requirements-engineering).",
      },
      {
        question: "Was bedeutet IREB CPRE?",
        answer:
          "Certified Professional for Requirements Engineering des International Requirements Engineering Board. Das Foundation Level bescheinigt die Grundlagen der Erhebung, Dokumentation, Validierung und Verwaltung von Anforderungen.",
      },
      {
        question: "Wie werden nichtfunktionale Anforderungen erfasst?",
        answer:
          "Strukturiert nach Qualitätsmerkmalen wie Performance, Sicherheit, Verfügbarkeit und Benutzbarkeit, jeweils messbar formuliert, damit sie im Test überprüft werden können.",
      },
      {
        question: "Mit welchen Werkzeugen arbeitet KOVALI?",
        answer:
          "In der Regel mit den Werkzeugen Ihrer Organisation, etwa Jira und Confluence, einschliesslich Testmanagement-Erweiterungen wie Xray oder Zephyr.",
      },
    ],
    cta: "Requirements Engineering anfragen",
  },
  {
    slug: "application-management",
    code: "03",
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
    code: "04",
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
    code: "05",
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
