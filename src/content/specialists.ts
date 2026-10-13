import type { FaqItem, TitledText } from "./types";

/**
 * Content for /fachleute: specialists who send their profile for work in KOVALI mandates.
 * Truthful scope: no open positions are claimed, and KOVALI neither places candidates
 * with third parties nor lends staff (both would need a permit under the AVG).
 */
export const specialists = {
  intro:
    "Sie arbeiten in Business Analysis, Requirements Engineering, Application Management oder im Test und sind offen für neue Mandate? Senden Sie Ihr Profil. Wir prüfen es persönlich und melden uns, wenn ein passendes Mandat ansteht.",

  focus: [
    { title: "Business Analysis", text: "Geschäftsprozesse analysieren, Anforderungen erheben und fachliche Lösungen definieren." },
    { title: "Requirements Engineering", text: "Anforderungen spezifizieren, abstimmen und über den Lebenszyklus verwalten." },
    { title: "Application Management", text: "Business-Applikationen fachlich betreuen, Changes steuern und Releases begleiten." },
    { title: "Test Management", text: "Teststrategie, Testplanung, Defect Management und Abnahme verantworten." },
    { title: "Test Engineering", text: "Testfälle aus Anforderungen ableiten, durchführen und Fehler präzise analysieren." },
  ] satisfies TitledText[],

  steps: [
    {
      title: "Profil senden",
      text: "Lebenslauf als PDF, Ihr Schwerpunkt und Ihre Verfügbarkeit. Ein Anschreiben braucht es nicht.",
    },
    {
      title: "Persönliche Prüfung",
      text: "Wir prüfen Ihr Profil persönlich und gleichen es mit Mandatsanfragen von Unternehmen ab.",
    },
    {
      title: "Gespräch bei Passung",
      text: "Passt Ihr Profil zu einem Mandat, melden wir uns für ein Gespräch über Rolle, Zeitraum und Konditionen.",
    },
    {
      title: "Nur mit Ihrer Zustimmung",
      text: "Einem Auftraggeber wird Ihr Profil nur vorgestellt, wenn Sie dem für das konkrete Mandat zugestimmt haben.",
    },
  ] satisfies TitledText[],

  notes: [
    "Aktuell sind keine Stellen ausgeschrieben. Profile werden für kommende Mandate geprüft.",
    "Die Zusammenarbeit erfolgt in Mandaten, für die KOVALI selbst verantwortlich ist. KOVALI vermittelt keine Stellen an Dritte und verleiht kein Personal.",
    "Ihr Profil wird höchstens sechs Monate aufbewahrt und danach gelöscht. Auf Wunsch löschen wir es jederzeit früher.",
  ],

  faq: [
    {
      question: "Muss ich selbständig sein?",
      answer:
        "Nein. Im Formular geben Sie an, ob Sie als Selbständige oder Selbständiger im Subunternehmen arbeiten oder eine Anstellung suchen. Welche Form möglich ist, hängt vom einzelnen Mandat ab.",
    },
    {
      question: "Wird mein Profil an andere Firmen weitergegeben?",
      answer:
        "Nur mit Ihrer Zustimmung und nur für ein konkretes Mandat, in dem KOVALI selbst Auftragnehmer ist. KOVALI vermittelt keine Stellen an Dritte.",
    },
    {
      question: "Wie lange wird mein Profil aufbewahrt?",
      answer:
        "Höchstens sechs Monate. Danach wird es gelöscht, auf Wunsch auch früher. Eine kurze E-Mail genügt. Details stehen in der [Datenschutzerklärung](/datenschutz).",
    },
  ] satisfies FaqItem[],
} as const;
