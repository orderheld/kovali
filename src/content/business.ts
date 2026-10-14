import { site, vatClause } from "@/config/site";
import { formatChf, formatNumber } from "@/lib/utils";
import type { FaqItem, ServiceSlug, TitledText } from "./types";

const { min, max } = site.offer.hourly.value;

/**
 * " Es dauert rund 30 Minuten und ist kostenlos." once Ferhat Demir confirms the first call,
 * built from the confirmed values; otherwise empty.
 */
const firstCall = site.offer.firstCall;
const firstCallSentence = firstCall.confirmed
  ? ` Es dauert rund ${formatNumber(firstCall.value.minutes)} Minuten${firstCall.value.free ? " und ist kostenlos" : ""}.`
  : "";

/**
 * Content for /unternehmen: consultancies, IT service providers and companies with an open
 * task in Business Analysis or Test. Experience figures and industries are Ferhat Demir's
 * personal experience and are named as his, never as KOVALI's.
 */
export const business = {
  intro:
    "Sie betreuen ein Kundenmandat oder planen ein IT-Projekt, und eine Aufgabe in Business Analysis, Requirements Engineering, Testmanagement oder Application Management ist offen? KOVALI übernimmt sie als Subunternehmen im Mandat Ihres Kunden oder direkt in Ihrem Projekt.",

  tasks: {
    title: "Welche Aufgaben KOVALI in Ihrem Mandat übernimmt",
    items: [
      {
        title: "Business Analysis und Requirements Engineering",
        text: "Geschäftsprozesse analysieren, Anforderungen erheben und als User Stories mit Akzeptanzkriterien festhalten.",
        slug: "business-analysis",
      },
      {
        title: "Testmanagement",
        text: "Testkonzept schreiben, Tests koordinieren und bis zur Abnahme berichten, welche Fehler noch offen sind.",
        slug: "test-management",
      },
      {
        title: "Test Engineering",
        text: "Testfälle aus Anforderungen ableiten, durchführen und Fehler nachvollziehbar dokumentieren.",
        slug: "test-engineering",
      },
      {
        title: "Application Management (fachlich)",
        text: "Change Requests bewerten, Releases begleiten und Incidents bis zur fachlichen Ursache verfolgen.",
        slug: "application-management",
      },
    ] satisfies (TitledText & { slug: ServiceSlug })[],
  },

  methods: {
    title: "Womit KOVALI arbeitet",
    caption: "Methoden und Werkzeuge, mit denen KOVALI arbeitet, und wofür",
    head: { method: "Methode oder Werkzeug", use: "Wofür" },
    rows: [
      { method: "BPMN und UML", use: "Abläufe, Use Cases und Systemverhalten modellieren" },
      {
        method: "User Stories und Akzeptanzkriterien",
        use: "Anforderungen so schreiben, dass Entwicklung und Test damit arbeiten können",
      },
      {
        method: "Schnittstellenspezifikation",
        use: "Datenflüsse, Feld-Mappings und Fehlerfälle zwischen Systemen beschreiben",
      },
      { method: "Scrum, Kanban, SAFe", use: "In agilen Teams mitarbeiten, Refinements vorbereiten, Releases planen" },
      {
        method: "Jira und Confluence, Xray, Zephyr",
        use: "Anforderungen, Testfälle, Fehler und Releases dokumentieren; Workflows und Berechtigungen einrichten",
      },
      { method: "SQL", use: "Testdaten prüfen und Fehler direkt in der Datenbank nachvollziehen" },
    ],
    industriesTitle: "Branchen aus der Praxis von Ferhat Demir",
    certificatesLine:
      "Zertifikate: IREB CPRE und ISTQB CTFL, beide von Ferhat Demir, Geschäftsführer. [Warum KOVALI](/warum-kovali#geschaeftsleitung)",
  },

  contracts: {
    title: "Vertragsformen",
    text: "Aufgaben, Ergebnisse und Verantwortlichkeiten vereinbaren wir vor dem Start schriftlich.",
    caption: "Vertragsformen: wer mit wem einen Vertrag hat und wofür die Form typisch ist",
    head: { form: "Vertragsform", parties: "Wer mit wem einen Vertrag hat", typical: "Typisch für" },
    rows: [
      {
        form: "Subunternehmen im Kundenmandat",
        parties: "Sie bleiben Vertragspartner Ihres Kunden. KOVALI arbeitet in Ihrem Auftrag.",
        typical: "Eine offene Aufgabe in einem laufenden Kundenmandat",
      },
      {
        form: "Abgegrenztes Teilmandat",
        parties: "Direkt mit KOVALI, mit festgelegtem Ergebnis",
        typical: "Ist-Analyse, Fachkonzept, Teststrategie oder Abnahmetest",
      },
      {
        form: "Direktmandat",
        parties: "Direkt mit KOVALI, ohne Dritte dazwischen",
        typical: "Unternehmen und öffentliche Organisationen mit eigenem Projekt",
      },
    ],
  },

  /** Truthful scope statement: no staffing or placement permits are claimed. */
  scopeNote:
    "KOVALI erbringt Leistungen in eigener Verantwortung auf Basis von Auftrags- oder Werkverträgen. Personalverleih und Stellenvermittlung bietet KOVALI nicht an.",

  requestSteps: {
    title: "So läuft eine Anfrage ab",
    items: [
      {
        title: "Anfrage",
        text: "Sie beschreiben Aufgabe, Zeitraum, Pensum und Einsatzort per Formular oder E-Mail. Ein vorhandenes Anforderungsprofil genügt.",
      },
      {
        title: "Erstgespräch",
        text: `In einem kurzen Gespräch klären wir Aufgaben, Umfeld und Zeitrahmen.${firstCallSentence}`,
      },
      {
        title: "Offerte",
        text: "Sie erhalten eine schriftliche Offerte mit Aufgabe, Stundensatz, Pensum, Laufzeit und Spesenregelung. Wer im Mandat arbeitet, steht darin mit Namen.",
      },
      {
        title: "Start im Mandat",
        text: "In der ersten Woche: Einarbeitung, Gespräche mit den wichtigsten Ansprechpersonen und eine Liste offener Fragen. Was bis wann vorliegen soll, ist vorher vereinbart.",
      },
      {
        title: "Übergabe",
        text: "Zum Schluss übergeben wir Unterlagen, Anforderungs- und Teststand und offene Punkte so, dass Ihr Team ohne uns weiterarbeiten kann.",
      },
    ] satisfies TitledText[],
  },

  /** Panel for specialists next to the contact person (spec addendum 3: own GmbH or AG only). */
  specialistsPanel: {
    label: "Für Fachleute",
    title: "Sie arbeiten mit Ihrer eigenen GmbH oder AG in Business Analysis oder im Test?",
    text: "Senden Sie Ihr Profil für kommende Mandate. Ihre Firma arbeitet darin als Subunternehmen von KOVALI.",
    link: { label: "Zur Seite für Fachleute", href: "/fachleute" },
  },

  faqTitle: "Fragen von Unternehmen",
  faq: [
    {
      question: "Was kostet ein Einsatz?",
      answer: `Die Richtwerte liegen bei ${formatChf(min)} bis ${formatNumber(max)} pro Stunde, ${vatClause()}. Den verbindlichen Satz nennt die Offerte. Details und ein Rechenbeispiel finden Sie unter [Preise](/preise).`,
    },
    {
      question: "Arbeitet KOVALI auch als Subunternehmen?",
      answer:
        "Ja. KOVALI arbeitet als Subunternehmen im Mandat einer Beratung oder eines IT-Dienstleisters. Der Vertrag mit dem Endkunden bleibt bei diesem Unternehmen.",
    },
    {
      question: "In welchen Sprachen ist eine Zusammenarbeit möglich?",
      answer: "Auf Deutsch, Französisch und Englisch, in Workshops, Dokumentation und im Projektalltag.",
    },
    {
      question: "Sind Einsätze vor Ort, remote oder hybrid möglich?",
      answer: "Alle drei Varianten sind möglich. Einsatzort und Remote-Anteil vereinbaren wir je Mandat.",
    },
    {
      question: "Welche Angaben braucht KOVALI für eine erste Einschätzung?",
      answer:
        "Aufgabe, Zeitraum, Pensum, Einsatzort und die wichtigsten fachlichen oder technischen Anforderungen. Ein vorhandenes Anforderungsprofil können Sie direkt in die Anfrage kopieren.",
    },
  ] satisfies FaqItem[],

  cta: {
    title: "Sie haben ein Mandat mit offener Aufgabe?",
    text: "Senden Sie das Anforderungsprofil oder eine kurze Beschreibung. Ferhat Demir meldet sich mit einer ersten Einschätzung zu Passung und Verfügbarkeit.",
  },
} as const;
