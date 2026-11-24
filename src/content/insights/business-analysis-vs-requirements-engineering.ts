import type { Article } from "../types";

export const article: Article = {
  slug: "business-analysis-vs-requirements-engineering",
  title: "Business Analysis vs. Requirements Engineering",
  metaTitle: "Business Analysis vs. Requirements Engineering",
  description:
    "Unterschied zwischen Business Analysis und Requirements Engineering: Fokus, Leitfrage, Ergebnisse, Zeitpunkt im Projekt und Zertifizierungen im Vergleich.",
  keyword: "Unterschied Business Analysis Requirements Engineering",
  category: "Grundlagen",
  publishedAt: "2026-10-13",
  excerpt:
    "Business Analysis und Requirements Engineering werden oft gleichgesetzt, setzen aber unterschiedliche Schwerpunkte. Der Beitrag vergleicht beide Disziplinen und zeigt, was das für die Planung von Projekten bedeutet.",
  relatedServices: ["business-analysis", "test-management"],
  blocks: [
    { type: "h2", id: "gemeinsamer-kern", text: "Zwei Disziplinen mit gemeinsamem Kern" },
    {
      type: "p",
      text: "Business Analysis und Requirements Engineering werden in Stellenausschreibungen und Projektplänen oft synonym verwendet. Beide befassen sich mit Anforderungen, beide verlangen Gesprächsführung, Modellierung und präzises Formulieren. Trotzdem setzen sie unterschiedliche Schwerpunkte. Wer diese kennt, kann Aufgaben im Projekt gezielter vergeben und Lücken vermeiden.",
    },
    {
      type: "p",
      text: "Die folgenden Abschnitte beschreiben beide Disziplinen anhand der etablierten Standards. Für Business Analysis ist das der BABOK Guide des International Institute of Business Analysis (IIBA), für Requirements Engineering der Certified Professional for Requirements Engineering (CPRE) des International Requirements Engineering Board (IREB). Beide Standards sind herstellerneutral und unabhängig vom Vorgehensmodell anwendbar, also in klassischen wie in agilen Projekten.",
    },
    { type: "h2", id: "business-analysis", text: "Business Analysis: vom Bedarf zur Lösung" },
    {
      type: "p",
      text: "Business Analysis setzt bei der Organisation an. Sie fragt, welches Problem oder welche Chance besteht, welche Veränderung nötig ist und welchen Wert eine Lösung schaffen soll. Software ist dabei nur eine mögliche Antwort. Ebenso kann eine Prozessänderung, eine neue Zuständigkeit oder eine Anpassung des Angebots die passende Lösung sein.",
    },
    {
      type: "p",
      text: "Zu den typischen Tätigkeiten gehören die Analyse der Ausgangslage, Stakeholder- und Prozessanalysen, die Bewertung von Lösungsoptionen und Entscheidungsgrundlagen wie ein Business Case. Der BABOK Guide gliedert das Fachgebiet unter anderem in die Wissensgebiete Strategieanalyse, Anforderungsanalyse und Designdefinition sowie Lösungsbewertung. Business Analysis reicht damit von der Strategie bis zur Frage, ob eine eingeführte Lösung den erwarteten Nutzen bringt. Ihre Ergebnisse richten sich an Auftraggeber und Management ebenso wie an das Projektteam.",
    },
    {
      type: "h2",
      id: "requirements-engineering",
      text: "Requirements Engineering: Anforderungen systematisch beherrschen",
    },
    {
      type: "p",
      text: "Requirements Engineering konzentriert sich auf die Anforderungen an ein System, meist an eine Software oder ein softwareintensives System. Ziel ist, Anforderungen vollständig zu ermitteln, eindeutig zu dokumentieren, zu prüfen und über den gesamten Lebenszyklus zu verwalten. Der Lehrplan des CPRE Foundation Level behandelt dafür unter anderem Ermittlung, Dokumentation, Validierung und Management von Anforderungen.",
    },
    {
      type: "p",
      text: "Typische Ergebnisse sind Anforderungsspezifikationen, Use-Case- und Datenmodelle, User Stories mit Akzeptanzkriterien, Qualitätsanforderungen und Randbedingungen. Hinzu kommt die Nachverfolgbarkeit von Anforderungen bis zu Testfällen und Änderungen. Requirements Engineering legt besonderen Wert auf Qualitätskriterien wie Eindeutigkeit, Prüfbarkeit und Konsistenz.",
    },
    {
      type: "p",
      text: "Das IREB unterscheidet funktionale Anforderungen, Qualitätsanforderungen und Randbedingungen. Gerade Qualitätsanforderungen wie Antwortzeiten, Verfügbarkeit oder Informationssicherheit werden in der Praxis oft zu spät oder zu ungenau beschrieben. Requirements Engineering sorgt dafür, dass auch sie messbar formuliert und prüfbar sind.",
    },
    { type: "h2", id: "vergleich", text: "Der Vergleich im Überblick" },
    {
      type: "p",
      text: "Die Tabelle fasst die wichtigsten Unterschiede zusammen. Sie beschreibt Schwerpunkte, keine starren Grenzen. Im Verlauf eines Projekts verschiebt sich das Gewicht oft von der einen zur anderen Disziplin.",
    },
    {
      type: "table",
      caption: "Business Analysis und Requirements Engineering im Vergleich",
      head: ["Kriterium", "Business Analysis", "Requirements Engineering"],
      rows: [
        [
          "Fokus",
          "Organisation, Geschäftsbedarf und Veränderung",
          "Anforderungen an ein System und deren Qualität",
        ],
        [
          "Leitfrage",
          "Welches Problem lösen wir, und welche Lösung schafft Wert?",
          "Was genau muss das System leisten, und unter welchen Bedingungen?",
        ],
        [
          "Typische Ergebnisse",
          "Problem- und Zielbeschreibung, Prozessmodelle, Bewertung von Lösungsoptionen, Business Case",
          "Anforderungsspezifikation, Use Cases, User Stories mit Akzeptanzkriterien, Qualitätsanforderungen, Nachverfolgbarkeit",
        ],
        [
          "Zeitpunkt im Projekt",
          "Schwerpunkt vor und zu Beginn des Vorhabens, Nutzenprüfung nach der Einführung",
          "Schwerpunkt in Konzeption und Umsetzung, Pflege über den Lebenszyklus des Systems",
        ],
        [
          "Standards und Zertifizierungen",
          "IIBA mit BABOK Guide; Zertifizierungen ECBA, CCBA, CBAP",
          "IREB mit CPRE Foundation Level, Advanced Level und Expert Level",
        ],
      ],
    },
    { type: "h2", id: "ueberschneidungen", text: "Wo sich die Disziplinen überschneiden" },
    {
      type: "p",
      text: "In der Praxis lassen sich beide Disziplinen selten sauber trennen. Die Anforderungsanalyse ist ein Kernbereich des BABOK Guide, und gutes Requirements Engineering beginnt ebenfalls mit Zielen und Stakeholdern. Viele Analystinnen und Analysten arbeiten mit beiden Methodenkoffern und tragen je nach Organisation den einen oder anderen Titel.",
    },
    {
      type: "p",
      text: "Relevant wird die Unterscheidung, wenn Sie Aufgaben in einem Vorhaben vergeben. Ist noch offen, ob und welche Lösung gebraucht wird, liegt der Schwerpunkt auf Business Analysis. Steht die Lösung fest und braucht es eine präzise, prüfbare Grundlage für Entwicklung, Lieferanten oder eine Ausschreibung, liegt er auf Requirements Engineering.",
    },
    {
      type: "p",
      text: "Fehlt eine der beiden Perspektiven, zeigt sich das meist erst spät. Ohne Business Analysis wird unter Umständen eine Lösung sehr präzise spezifiziert, die das eigentliche Problem nicht löst. Ohne Requirements Engineering ist das Ziel zwar klar, doch unscharfe Anforderungen führen in Entwicklung, Test und Abnahme zu Rückfragen und Nacharbeit.",
    },
    { type: "h3", text: "Hinweise für die Planung" },
    {
      type: "ul",
      items: [
        "Strategische Vorhaben, Prozessreorganisationen und Make-or-Buy-Entscheide verlangen vor allem Kompetenz in Business Analysis.",
        "Ausschreibungen, Systemablösungen und regulierte Umfelder profitieren besonders von sauberem Requirements Engineering.",
        "In agilen Teams übernehmen Business Analysts oft beides: Sie klären den Bedarf mit dem Product Owner und formulieren Backlog Items samt Akzeptanzkriterien.",
        "Bei grösseren Vorhaben kann eine Aufteilung sinnvoll sein: eine Person mit Blick auf Ziele und Prozesse, eine weitere mit Fokus auf Spezifikation und Nachverfolgbarkeit.",
        "Im Betrieb einer Anwendung, etwa im Application Management, werden beide Perspektiven bei jeder grösseren Änderung erneut gebraucht.",
      ],
    },
    {
      type: "callout",
      title: "Eine einfache Prüffrage",
      text: "Fragen Sie, welche Entscheidung die Rolle vorbereiten soll. Geht es darum, ob und welche Lösung sinnvoll ist, ist Business Analysis gefragt. Geht es darum, was ein bestimmtes System im Detail leisten muss, steht Requirements Engineering im Vordergrund.",
    },
    { type: "h2", id: "unterstuetzung", text: "Unterstützung in beiden Disziplinen" },
    {
      type: "p",
      text: "Viele Vorhaben brauchen beide Perspektiven, oft in wechselnder Gewichtung über die Projektlaufzeit. KOVALI bietet beides als eine Disziplin an: [Business Analysis & Requirements Engineering](/leistungen/business-analysis). Der Beitrag [Was macht ein Business Analyst?](/insights/was-macht-ein-business-analyst) beschreibt, welche Aufgaben die Rolle im Alltag umfasst. Für eine Einschätzung Ihres Vorhabens erreichen Sie uns über die [Kontaktseite](/kontakt).",
    },
  ],
};
