import type { Service, ServiceSlug } from "./types";

/**
 * The four disciplines of IT Consulting, in the order shown everywhere (lists,
 * footer, /leistungen): Business Analysis & Requirements Engineering, Testmanagement,
 * Test Engineering, Application Management. Business Analysis and Requirements Engineering
 * form one discipline (Ferhat Demir, 13.10.2026).
 * Each entry feeds the lists, its own page (/leistungen/[slug]), metadata and JSON-LD.
 */
export const services: Service[] = [
  {
    slug: "business-analysis",
    name: "Business Analysis & Requirements Engineering",
    summary:
      "Wenn noch offen ist, was genau gebaut werden soll, oder wenn viele Stellen mitreden. Wir klären Ziele und Abläufe mit Ihren Fachbereichen und schreiben Anforderungen, mit denen Entwicklung und Test arbeiten können.",
    h1: "Business Analyst und Requirements Engineer für IT-Projekte in der Schweiz",
    metaTitle: "Business Analyst & Requirements Engineer Schweiz",
    metaDescription:
      "Externer Business Analyst und Requirements Engineer für IT-Projekte in der Schweiz: Prozesse analysieren, Anforderungen nach IREB erheben und spezifizieren.",
    keyword: "Business Analyst Schweiz",
    intro:
      "Ein Business Analyst klärt, was eine Software leisten muss, bevor sie gebaut wird. Wir erheben die Anforderungen bei Ihren Fachbereichen und modellieren die Abläufe in BPMN. Daraus entstehen User Stories mit Akzeptanzkriterien, die Ihr Entwicklungsteam im nächsten Refinement schätzen kann. Schnittstellen beschreiben wir bis auf Feldebene, mit Fehlerfällen.",
    tasksTitle: "Was unsere Business Analysts übernehmen",
    tasks: [
      "Analyse geschäftlicher Anforderungen",
      "Stakeholder Management und Requirements Workshops",
      "Geschäftsprozessanalyse und Modellierung in BPMN",
      "User Stories, Epics und Akzeptanzkriterien",
      "Fachkonzepte und fachliche Lösungsdefinition",
      "Schnittstellenanforderungen, Datenflüsse und Feld-Mappings",
      "Ist-/Soll-Analysen",
      "Funktionale und nichtfunktionale Anforderungen",
      "UML Use Cases und Use-Case-Spezifikationen",
      "Requirements Management und Change Requests",
    ],
    deliverables: [
      "Ist-/Soll-Analyse mit Handlungsbedarf",
      "Prozessmodelle in BPMN",
      "Fachkonzept mit Lösungsvarianten und Empfehlung",
      "Anforderungsspezifikation mit funktionalen und nichtfunktionalen Anforderungen",
      "Epics und umsetzungsreife User Stories mit Akzeptanzkriterien",
      "Schnittstellenspezifikationen mit Datenflüssen, Feld-Mappings und Fehlerfällen",
      "Priorisierter Anforderungsbestand",
    ],
    faqTitle: "Fragen zu Business Analysis",
    faq: [
      {
        question: "Was macht ein Business Analyst in einem IT-Projekt?",
        answer:
          "Ein Business Analyst erhebt die Anforderungen der Fachbereiche und modelliert die Geschäftsprozesse. Er beschreibt die fachliche Lösung, mit der Entwicklung und Test arbeiten. Bis zur Abnahme beantwortet er die fachlichen Fragen. Mehr dazu im Artikel [Was macht ein Business Analyst?](/insights/was-macht-ein-business-analyst)",
      },
      {
        question: "Ist Business Analysis dasselbe wie Requirements Engineering?",
        answer:
          "Nicht ganz. Business Analysis klärt, welches geschäftliche Problem gelöst werden soll und welche Lösung den grössten Nutzen bringt. Requirements Engineering beschreibt die gewählte Lösung in prüfbaren Anforderungen und pflegt sie bis zum Ende des Projekts. In der Praxis greifen beide ineinander, deshalb bieten wir sie als eine Disziplin an. Ausführlich im Artikel [Business Analysis vs. Requirements Engineering](/insights/business-analysis-vs-requirements-engineering).",
      },
      {
        question: "Wann lohnt sich ein externer Business Analyst?",
        answer:
          "Wenn intern die Zeit oder das Methodenwissen fehlt oder wenn ein Vorhaben jemanden braucht, der zwischen den Fachbereichen neutral moderiert. Ein externer Business Analyst lässt sich für eine einzelne Projektphase beauftragen.",
      },
      {
        question: "Agil oder klassisch?",
        answer:
          "Beides. Wir arbeiten in Scrum-, Kanban- und SAFe-Umgebungen ebenso wie in klassischen Projekten mit Fachkonzept. Das Vorgehen richtet sich nach Ihrer Organisation.",
      },
      {
        question: "Ist eine Beauftragung über einen IT-Dienstleister möglich?",
        answer:
          "Ja. Neben Direktmandaten arbeiten wir als Subunternehmen für Beratungen und IT-Dienstleister. Personalverleih und Stellenvermittlung bieten wir nicht an. Details zur Zusammenarbeit finden Sie unter [Über uns](/unternehmen#zusammenarbeit).",
      },
    ],
    ctaTitle: "Brauchen Sie einen Business Analyst?",
    cta: "Business Analyst anfragen",
  },
  {
    slug: "test-management",
    name: "Testmanagement",
    summary:
      "Wenn ein Go-live ansteht oder mehrere Lieferanten beteiligt sind. Wir legen fest, was wann getestet wird, und führen den Fehlerprozess bis zur Abnahme.",
    h1: "Test Manager für IT-Projekte in der Schweiz",
    metaTitle: "Test Manager Schweiz – Testmanagement für IT-Projekte",
    metaDescription:
      "Testmanagement nach ISTQB: Testkonzept, Testplanung, Koordination, Defect Management und fachliche Abnahme für Integrations- und End-to-End-Tests.",
    keyword: "Test Manager Schweiz",
    intro:
      "Ein Test Manager legt fest, was vor einem Release getestet wird und welcher Fehler ein Release stoppt. Wir schreiben das Testkonzept und koordinieren Fachbereich und Entwicklungspartner im Test. Am Ende steht der Testbericht, auf dessen Grundlage Sie freigeben.",
    tasksTitle: "Was zum Testmanagement gehört",
    tasks: [
      "Testkonzeption",
      "Testplanung",
      "Testkoordination",
      "Defect Management",
      "Testreporting",
      "Fachliche Abnahmetests",
      "Integrationstests",
      "End-to-End-Tests",
      "Testfallmanagement",
      "Testdurchführung",
    ],
    deliverables: [
      "Testkonzept und risikobasierte Teststrategie",
      "Testplan mit Zuständigkeiten und Terminen",
      "Testfallkatalog und Testabdeckung",
      "Fehlerberichte und Defect-Übersicht",
      "Testberichte und Abnahmeprotokolle",
    ],
    faqTitle: "Fragen zum Testmanagement",
    faq: [
      {
        question: "Was macht ein Test Manager?",
        answer:
          "Ein Test Manager legt fest, was, wann und von wem getestet wird. Er koordiniert die Beteiligten im Test und führt den Fehlerprozess. Sein Testbericht zeigt, welche Fehler noch offen sind, und ist die Grundlage für Freigabe und Abnahme.",
      },
      {
        question: "Ab wann sollte das Testmanagement starten?",
        answer:
          "Sobald die ersten Anforderungen feststehen. Dann lassen sich die Testfälle direkt aus den Akzeptanzkriterien ableiten, und das Testkonzept liegt vor, bevor das erste Release in den Test geht.",
      },
      {
        question: "Gehören fachliche Abnahmetests dazu?",
        answer:
          "Ja. Wir planen die Abnahmetests mit den Fachbereichen und bereiten Testfälle und Testdaten vor. Während der Durchführung sind wir dabei und halten das Ergebnis im Abnahmeprotokoll fest.",
      },
    ],
    ctaTitle: "Steht ein Release an?",
    cta: "Testmanagement anfragen",
  },
  {
    slug: "test-engineering",
    name: "Test Engineering",
    summary:
      "Wenn Ihrem Team Testkapazität fehlt. Unsere Test Engineers leiten Testfälle aus den Anforderungen ab und führen sie durch. Jeder gefundene Fehler lässt sich anhand des Berichts nachstellen.",
    h1: "Test Engineering für zuverlässige IT-Systeme",
    metaTitle: "Test Engineering Schweiz – System- und Regressionstests",
    metaDescription:
      "Test Engineering in der Schweiz: Testfalldesign, funktionale System-, Integrations-, Regressions- und End-to-End-Tests, Testdaten und Fehleranalyse.",
    keyword: "Test Engineering Schweiz",
    intro:
      "Wir leiten Testfälle aus Ihren Anforderungen ab und führen System-, Integrations- und Regressionstests durch. Ergebnisse prüfen wir bei Bedarf per SQL direkt in der Datenbank. Jeder Fehlerbericht enthält Schritte, Testdaten und das erwartete Verhalten.",
    tasksTitle: "Welche Tests wir übernehmen",
    tasks: [
      "Testfallanalyse und Testfalldesign",
      "Funktionale Systemtests",
      "Integrationstests",
      "Regressionstests",
      "End-to-End-Tests",
      "Fehleranalyse",
      "Testdaten und Testumgebungen",
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
    faqTitle: "Fragen zum Test Engineering",
    faq: [
      {
        question: "Was ist der Unterschied zwischen Testmanagement und Test Engineering?",
        answer:
          "Testmanagement plant und steuert die Tests, Test Engineering entwirft sie und führt sie durch. In kleineren Vorhaben macht oft eine Person beides, in grösseren Projekten sind die Aufgaben auf zwei Personen verteilt.",
      },
      {
        question: "Gehören automatisierte Tests dazu?",
        answer:
          "Der Schwerpunkt liegt auf fachlichem und funktionalem Testen. Wo Automatisierung sinnvoll ist, wird sie im Testkonzept festgehalten und mit Ihrem Entwicklungsteam abgestimmt.",
      },
      {
        question: "Welche Testarten gehören dazu?",
        answer:
          "Funktionale Systemtests, Integrationstests, Regressionstests, End-to-End-Tests und fachliche Abnahmetests.",
      },
    ],
    ctaTitle: "Fehlt Ihrem Team Testkapazität?",
    cta: "Test Engineering anfragen",
  },
  {
    slug: "application-management",
    name: "Application Management",
    summary:
      "Wenn eine Applikation im Betrieb laufend Änderungen braucht. Wir bewerten Änderungswünsche und stimmen Releases mit Entwicklung und Betrieb ab.",
    h1: "Fachliches Application Management für Business-Applikationen",
    metaTitle: "Application Management Schweiz – fachliche Betreuung",
    metaDescription:
      "Fachliches Application Management in der Schweiz: Änderungsanforderungen analysieren, Releases begleiten, Incidents untersuchen und Applikationen weiterentwickeln.",
    keyword: "Application Management Schweiz",
    intro:
      "Wir betreuen Ihre Applikation fachlich im Betrieb. Wir prüfen und priorisieren Change Requests und stimmen Releases und Hotfixes mit Entwicklung und Betrieb ab. Bei Incidents suchen wir die fachliche Ursache. Hosting und technischer Betrieb bleiben bei Ihrem Betreiber.",
    tasksTitle: "Was fachliches Application Management umfasst",
    tasks: [
      "Fachliche Betreuung von Business-Applikationen",
      "Analyse von Änderungsanforderungen",
      "Change- und Release-Begleitung",
      "Incident- und Problemanalyse",
      "Koordination zwischen Fachbereichen und IT",
      "Weiterentwicklung bestehender Systeme",
      "Anwendungsschnittstellen",
      "Applikationsoptimierung",
    ],
    deliverables: [
      "Analysierte und priorisierte Change Requests",
      "Release-Planung, Release Notes und Hotfix-Koordination",
      "Fachliche Incident- und Problemanalysen",
      "Aktuelle Anwendungs- und Prozessdokumentation",
      "Optimierungsvorschläge mit Nutzenbewertung",
    ],
    faqTitle: "Fragen zum Application Management",
    faq: [
      {
        question: "Was umfasst fachliches Application Management?",
        answer:
          "Die fachliche Betreuung einer Applikation im Betrieb: Änderungswünsche analysieren, Releases planen und begleiten, Incidents und Probleme fachlich untersuchen. Der technische Betrieb wie Hosting und Infrastruktur bleibt beim IT-Betreiber.",
      },
      {
        question: "Gehört der technische Betrieb dazu?",
        answer:
          "Nein. Wir übernehmen die fachliche Seite und arbeiten dabei mit Ihrem technischen Betrieb und Ihren Entwicklungspartnern zusammen.",
      },
      {
        question: "Wie wird die Weiterentwicklung priorisiert?",
        answer:
          "Nach Nutzen, Dringlichkeit und Aufwand. Entschieden wird gemeinsam mit Product Owner und Fachbereichen, die Reihenfolge steht im Backlog.",
      },
    ],
    ctaTitle: "Braucht Ihre Applikation fachliche Betreuung?",
    cta: "Application Management anfragen",
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function serviceHref(slug: ServiceSlug): string {
  return `/leistungen/${slug}`;
}
