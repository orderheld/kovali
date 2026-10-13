import type { FaqItem, TitledText } from "./types";

/** Content for /unternehmen: consultancies, IT service providers and companies with a need for specialists. */
export const business = {
  intro:
    "Sie betreuen ein Kundenmandat oder planen ein IT-Projekt und suchen einen erfahrenen Business Analyst, Requirements Engineer, Application Manager oder Test Manager? KOVALI arbeitet als Subunternehmen im Mandat Ihres Kunden oder direkt in Ihrem Projekt.",

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
    "KOVALI erbringt Leistungen in eigener Verantwortung auf Basis von Auftrags- oder Werkverträgen. Personalverleih und private Arbeitsvermittlung bietet KOVALI derzeit nicht an.",

  requestSteps: [
    {
      title: "Bedarf schildern",
      text: "Rolle, Aufgaben, Zeitraum, Pensum, Einsatzort oder Remote-Anteil und Branche des Kunden. Ein Anforderungsprofil genügt.",
    },
    {
      title: "Passung klären",
      text: "Wir prüfen die Anfrage persönlich und melden uns mit einer ersten Einschätzung zu Passung und Verfügbarkeit.",
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
