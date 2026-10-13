import type { Article } from "../types";

export const article: Article = {
  slug: "was-macht-ein-business-analyst",
  title: "Was macht ein Business Analyst?",
  metaTitle: "Business Analyst: Aufgaben, Ergebnisse und Rolle",
  description:
    "Welche Aufgaben hat ein Business Analyst? Ziele klären, Prozesse analysieren, Anforderungen erheben und die Abnahme begleiten: ein Überblick aus der Praxis.",
  keyword: "Business Analyst Aufgaben",
  category: "Grundlagen",
  publishedAt: "2026-10-13",
  readingMinutes: 5,
  excerpt:
    "Ein Business Analyst klärt, welches Problem ein Vorhaben lösen soll und welche Lösung dem Unternehmen tatsächlich nützt. Der Beitrag beschreibt Aufgaben, Ergebnisse und Abgrenzungen aus der Praxis.",
  relatedServices: ["business-analysis", "test-management"],
  blocks: [
    { type: "h2", id: "rolle-im-kern", text: "Die Rolle im Kern" },
    {
      type: "p",
      text: "Ein Business Analyst sorgt dafür, dass ein Vorhaben das richtige Problem löst und dass die gewählte Lösung im Betrieb tatsächlich Nutzen bringt. Er arbeitet an der Schnittstelle zwischen Fachbereich, IT und Management und übersetzt Bedürfnisse in Anforderungen, die sich umsetzen, prüfen und priorisieren lassen. Der BABOK Guide des International Institute of Business Analysis (IIBA) beschreibt Business Analysis sinngemäss als Praxis, Veränderungen zu ermöglichen, indem Bedürfnisse definiert und Lösungen empfohlen werden, die für Stakeholder einen Wert schaffen.",
    },
    {
      type: "p",
      text: "Im Alltag heisst das: Ein Business Analyst klärt zuerst das «Warum» und das «Was», bevor andere über das «Wie» entscheiden. Er arbeitet nicht nur am Projektanfang, sondern begleitet ein Vorhaben oft bis zur Einführung. Je nach Organisation heisst die Rolle auch Business Engineer, Fachanalyst oder IT-Business-Analyst.",
    },
    { type: "h2", id: "zentrale-aufgaben", text: "Die zentralen Aufgaben" },
    {
      type: "p",
      text: "Die Aufgaben verschieben sich je nach Projektphase und Vorgehensmodell. Einige Tätigkeiten kommen aber in nahezu jedem Mandat vor.",
    },
    { type: "h3", text: "Ausgangslage und Ziele klären" },
    {
      type: "p",
      text: "Am Anfang steht die Frage, welches Problem gelöst oder welche Chance genutzt werden soll. Der Business Analyst grenzt den Umfang ab, beschreibt den heutigen Zustand und formuliert gemeinsam mit den Verantwortlichen messbare Ziele. Ohne diese Klärung entstehen später Diskussionen über Anforderungen, die eigentlich Diskussionen über Ziele sind.",
    },
    { type: "h3", text: "Stakeholder identifizieren und einbinden" },
    {
      type: "p",
      text: "Eine Stakeholder-Analyse zeigt, wer betroffen ist, wer entscheidet und wer die fachlichen Details kennt. Sie macht sichtbar, wessen Sicht noch fehlt und wo Interessen kollidieren. Der Business Analyst plant Interviews, Workshops und Reviews so, dass die richtigen Personen zur richtigen Zeit beteiligt sind.",
    },
    { type: "h3", text: "Prozesse und Daten analysieren" },
    {
      type: "p",
      text: "Viele Anforderungen ergeben sich erst aus dem Verständnis der Abläufe. Der Business Analyst modelliert Ist- und Soll-Prozesse, etwa mit BPMN, und identifiziert Medienbrüche, Doppelerfassungen und unklare Zuständigkeiten. Ebenso wichtig sind die Daten: welche Informationen wo entstehen, wer sie pflegt und welche Systeme sie nutzen.",
    },
    { type: "h3", text: "Anforderungen erheben, dokumentieren und priorisieren" },
    {
      type: "p",
      text: "Aus Zielen und Prozessen leitet der Business Analyst fachliche Anforderungen ab, zum Beispiel als Use Cases, als User Stories mit Akzeptanzkriterien oder als Geschäftsregeln. Er achtet darauf, dass jede Anforderung eindeutig, prüfbar und auf ein Ziel zurückführbar ist. Gemeinsam mit Product Owner oder Auftraggeber priorisiert er nach Nutzen, Risiko und Abhängigkeiten.",
    },
    { type: "h3", text: "Lösungsoptionen bewerten" },
    {
      type: "p",
      text: "Nicht jedes Problem verlangt eine neue Software. Der Business Analyst vergleicht Optionen wie eine Prozessanpassung, die Konfiguration einer bestehenden Anwendung, Standardsoftware oder eine Eigenentwicklung und legt Vor- und Nachteile offen. Das Ergebnis ist eine Entscheidungsgrundlage. Die Entscheidung selbst trifft der Auftraggeber.",
    },
    { type: "h3", text: "Umsetzung und Abnahme begleiten" },
    {
      type: "p",
      text: "Während der Entwicklung beantwortet der Business Analyst fachliche Fragen, klärt Abweichungen und führt Änderungen an den Anforderungen nach. Er arbeitet eng mit dem Test Management zusammen, damit die Testfälle die fachlichen Erwartungen abdecken. Nach der Einführung prüft er, ob die ursprünglichen Ziele erreicht wurden.",
    },
    { type: "h2", id: "typische-ergebnisse", text: "Typische Ergebnisse" },
    {
      type: "p",
      text: "Welche Artefakte entstehen, hängt vom Vorhaben und vom Vorgehensmodell ab. Häufig gehören dazu:",
    },
    {
      type: "ul",
      items: [
        "Problem- und Zielbeschreibung mit Abgrenzung des Umfangs",
        "Stakeholder-Analyse und Kommunikationsplan",
        "Ist- und Soll-Prozessmodelle, etwa in BPMN",
        "Fachliches Glossar und Datenmodell",
        "Anforderungsspezifikation oder strukturiertes Product Backlog mit Akzeptanzkriterien",
        "Bewertung von Lösungsoptionen als Entscheidungsgrundlage",
        "Fachliche Abnahmekriterien als Grundlage für den Test",
      ],
    },
    {
      type: "p",
      text: "Entscheidend ist nicht der Umfang der Dokumentation, sondern ob die Beteiligten damit arbeiten können. Ein schlankes, aktuelles Backlog ist nützlicher als ein umfangreiches Pflichtenheft, das nach wenigen Monaten niemand mehr liest.",
    },
    {
      type: "callout",
      title: "Woran Sie gute Business Analysis erkennen",
      text: "Die Ziele sind messbar formuliert, und jede Anforderung lässt sich auf ein Ziel zurückführen und testen. Fachbereich und IT verwenden dieselben Begriffe. Entscheidungen über den Umfang sind dokumentiert und begründet.",
    },
    { type: "h2", id: "abgrenzung-zu-anderen-rollen", text: "Abgrenzung zu anderen Rollen" },
    {
      type: "p",
      text: "In Projekten überschneiden sich Rollen. Eine klare Abgrenzung verhindert, dass Aufgaben doppelt erledigt werden oder liegen bleiben.",
    },
    {
      type: "ul",
      items: [
        "Projektleitung: verantwortet Termine, Kosten, Ressourcen und Risiken. Der Business Analyst liefert ihr die fachliche Grundlage.",
        "Product Owner: verantwortet in Scrum den Wert des Produkts und die Reihenfolge im Product Backlog. Der Business Analyst unterstützt mit Analyse, Refinement und Akzeptanzkriterien, die Entscheidung bleibt beim Product Owner.",
        "Requirements Engineer: konzentriert sich auf das systematische Ermitteln, Dokumentieren, Prüfen und Verwalten von Anforderungen an ein System. Die Unterschiede beschreibt der Beitrag [Business Analysis vs. Requirements Engineering](/insights/business-analysis-vs-requirements-engineering).",
        "Lösungsarchitektur: entscheidet über die technische Umsetzung. Der Business Analyst beschreibt, was die Lösung fachlich leisten muss.",
      ],
    },
    {
      type: "p",
      text: "Scrum kennt die Rolle des Business Analyst nicht ausdrücklich. In agilen Teams ist sie dennoch verbreitet, häufig als Teil des Entwicklungsteams oder als enge Unterstützung des Product Owner. Auch SAFe sieht keine eigene Rolle dafür vor, die Tätigkeiten fallen aber auf mehreren Ebenen an.",
    },
    { type: "h2", id: "faehigkeiten", text: "Fähigkeiten, auf die es ankommt" },
    {
      type: "p",
      text: "Methodenkenntnis ist die Grundlage. Im Alltag entscheiden aber oft andere Fähigkeiten über die Qualität der Arbeit.",
    },
    {
      type: "ul",
      items: [
        "Analytisches Denken: Zusammenhänge erkennen, Widersprüche aufdecken, Annahmen von Fakten trennen.",
        "Moderation: Workshops leiten und zu Ergebnissen führen, auch wenn Interessen auseinandergehen.",
        "Präzises Schreiben: Anforderungen so formulieren, dass Fachbereich, Entwicklung und Test sie gleich verstehen.",
        "Domänenwissen: die Fachsprache und die Regeln der Branche kennen, etwa im Versicherungs- oder Bankenumfeld.",
        "Neutralität: Optionen fair darstellen, auch wenn eine davon den Erwartungen einzelner Beteiligter widerspricht.",
      ],
    },
    {
      type: "p",
      text: "Als Nachweis der Methodenkompetenz gelten die Zertifizierungen des IIBA (ECBA, CCBA, CBAP) sowie für das Anforderungshandwerk der IREB CPRE. Ein Zertifikat ersetzt keine Projekterfahrung, schafft aber ein gemeinsames Vokabular im Team.",
    },
    { type: "h2", id: "unterstuetzung", text: "Business Analysis mit KOVALI" },
    {
      type: "p",
      text: "KOVALI unterstützt Unternehmen in der Schweiz bei der Business Analysis: von der Klärung der Ausgangslage über die Prozessanalyse bis zu Anforderungen, mit denen Entwicklung und Test arbeiten können. Mehr zum Vorgehen finden Sie unter [Business Analysis & Requirements Engineering](/leistungen/business-analysis). Für ein erstes Gespräch über Ihr Vorhaben erreichen Sie uns über die [Kontaktseite](/kontakt).",
    },
  ],
};
