import type { FaqItem, TitledText } from "./types";

/** Content for /partner: IT service providers, consultancies and contracting partners. */
export const partner = {
  intro:
    "Sie betreuen ein Kundenmandat und suchen einen erfahrenen Business Analyst, Requirements Engineer oder Test Manager? KOVALI unterstützt IT-Dienstleister, Beratungsunternehmen und Contracting-Partner als selbständiger Auftragnehmer im Mandat Ihres Kunden.",

  roles: [
    { title: "Business Analyst", text: "Geschäftsprozesse analysieren, Anforderungen erheben und fachliche Lösungen definieren." },
    { title: "Requirements Engineer", text: "Anforderungen strukturiert spezifizieren, abstimmen und über den Lebenszyklus verwalten." },
    { title: "Application Manager (fachlich)", text: "Business-Applikationen weiterentwickeln, Change Requests steuern und Releases begleiten." },
    { title: "Test Manager", text: "Teststrategie, Testplanung, Defect Management und Abnahme verantworten." },
    { title: "Test Engineer", text: "Testfälle aus Anforderungen ableiten, durchführen und dokumentieren." },
    { title: "IT-Consultant", text: "Fachbereiche und IT in Projekten mit vielen Schnittstellen und Anspruchsgruppen verbinden." },
  ] satisfies TitledText[],

  models: [
    {
      title: "Subunternehmen im Kundenmandat",
      text: "KOVALI arbeitet als Subunternehmen in Ihrem Mandat. Sie bleiben Vertragspartner Ihres Kunden, KOVALI liefert die vereinbarte Leistung.",
    },
    {
      title: "Klar abgegrenztes Teilmandat",
      text: "Ein Teilprojekt mit definiertem Ergebnis, zum Beispiel Ist-Analyse, Fachkonzept, Teststrategie oder Abnahmetest.",
    },
    {
      title: "Direktmandat",
      text: "Unternehmen und öffentliche Organisationen beauftragen KOVALI direkt, ohne Vermittlung über Dritte.",
    },
  ] satisfies TitledText[],

  /** Truthful scope statement: no staffing or placement permits are claimed. */
  scopeNote:
    "KOVALI erbringt Leistungen als selbständiger Auftragnehmer auf Basis von Auftrags- oder Werkverträgen. Personalverleih und private Arbeitsvermittlung bietet KOVALI derzeit nicht an.",

  requestSteps: [
    {
      title: "Bedarf schildern",
      text: "Rolle, Aufgaben, Zeitraum, Pensum, Einsatzort oder Remote-Anteil und Branche des Kunden. Ein Anforderungsprofil genügt.",
    },
    {
      title: "Passung klären",
      text: "Sie erhalten eine persönliche Rückmeldung zu Passung, Verfügbarkeit und offenen Fragen zum Mandat.",
    },
    {
      title: "Rahmen vereinbaren",
      text: "Konditionen, Vertragsform und Verantwortlichkeiten werden schriftlich festgehalten.",
    },
    {
      title: "Start im Mandat",
      text: "Strukturierter Einstieg mit Übergabe, Stakeholder-Übersicht und klaren ersten Ergebnissen.",
    },
  ] satisfies TitledText[],

  specialists: {
    title: "Für Spezialistinnen und Spezialisten",
    text: "KOVALI baut ein Netzwerk erfahrener Fachleute in Business Analysis, Requirements Engineering und Test auf, um künftig auch grössere Mandate gemeinsam abdecken zu können. Wenn Sie als selbständige Fachperson an einer späteren Zusammenarbeit interessiert sind, freut sich KOVALI über eine kurze Nachricht mit Ihrem Profil.",
    note: "Aktuell sind keine Stellen ausgeschrieben.",
  },

  faq: [
    {
      question: "Arbeitet KOVALI auch als Subunternehmen?",
      answer:
        "Ja. Die Zusammenarbeit als Subunternehmen im Mandat eines IT-Dienstleisters oder Beratungsunternehmens ist ein vorgesehenes Modell. Die Vertragsbeziehung zum Endkunden bleibt bei Ihnen.",
    },
    {
      question: "In welchen Sprachen ist eine Zusammenarbeit möglich?",
      answer: "Auf Deutsch, Französisch und Englisch, in Workshops, Dokumentation und im Projektalltag.",
    },
    {
      question: "Sind Einsätze vor Ort, remote oder hybrid möglich?",
      answer:
        "Alle drei Varianten sind möglich. Einsatzort und Remote-Anteil werden je Mandat vereinbart.",
    },
    {
      question: "Welche Angaben braucht KOVALI für eine erste Einschätzung?",
      answer:
        "Rolle, Aufgaben, Zeitraum, Pensum, Einsatzort und die wichtigsten fachlichen oder technischen Anforderungen. Ein vorhandenes Anforderungsprofil können Sie direkt in die Anfrage kopieren.",
    },
  ] satisfies FaqItem[],
} as const;
