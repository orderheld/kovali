import type { FaqItem, TitledText } from "./types";

/**
 * Content for /fachleute: independent specialists who work through their own company (GmbH or
 * AG) and want to take on subcontracted mandates of KOVALI (spec addendum 3, decided by Ferhat
 * Demir on 13.10.2026). KOVALI is the contract party and works with specialists only through
 * their company: no employment, no staff leasing, no placement with third parties (the last two
 * would need a permit under the AVG). No open mandates are claimed, and no prices appear here.
 */
export const specialists = {
  intro:
    "Sie arbeiten mit Ihrer eigenen GmbH oder AG in Business Analysis, Requirements Engineering, Application Management oder im Test und möchten Mandate als Subunternehmen von KOVALI übernehmen? Senden Sie Ihr Profil. Ferhat Demir liest es und meldet sich, wenn ein passendes Mandat ansteht.",

  focusTitle: "Schwerpunkte, für die KOVALI Profile entgegennimmt",
  focusText:
    "Offene Mandate gibt es derzeit keine. Kommt eines dazu, schauen wir zuerst in die Profile, die bereits eingegangen sind.",

  focus: [
    { title: "Business Analysis", text: "Geschäftsprozesse analysieren und Anforderungen mit den Fachbereichen erheben." },
    { title: "Requirements Engineering", text: "Anforderungen spezifizieren und über den ganzen Lebenszyklus verwalten." },
    { title: "Application Management", text: "Business-Applikationen im Betrieb fachlich betreuen und Releases begleiten." },
    { title: "Testmanagement", text: "Testkonzept, Testplanung, Fehlerprozess und Abnahme verantworten." },
    { title: "Test Engineering", text: "Testfälle aus Anforderungen ableiten und Fehler nachvollziehbar dokumentieren." },
  ] satisfies TitledText[],

  stepsTitle: "So geht es nach Ihrem Profil weiter",
  steps: [
    {
      title: "Profil senden",
      text: "Lebenslauf als PDF, Ihr Schwerpunkt, Ihre Verfügbarkeit und Ihre GmbH oder AG. Ein Anschreiben braucht es nicht.",
    },
    {
      title: "Prüfung Ihres Profils",
      text: "Ferhat Demir liest Ihr Profil und gleicht es mit Anfragen für Mandate von KOVALI ab.",
    },
    {
      title: "Gespräch bei Passung",
      text: "Passt Ihr Profil zu einem Mandat, melden wir uns für ein Gespräch über Aufgabe, Zeitraum und Konditionen.",
    },
    {
      title: "Nur mit Ihrer Zustimmung",
      text: "Für ein konkretes Mandat, in dem KOVALI Auftragnehmer ist, fragen wir Sie vorher, ob wir Ihr Profil in der Offerte verwenden dürfen.",
    },
  ] satisfies TitledText[],

  notesTitle: "Gut zu wissen",
  notes: [
    "KOVALI vergibt Mandate nur an Firmen: Ihre GmbH oder AG arbeitet als Subunternehmen von KOVALI. Ist Ihre Firma noch in Gründung, können Sie Ihr Profil trotzdem senden. Einen Auftrag erhält sie erst nach dem Eintrag im Handelsregister. Eine Anstellung bietet KOVALI nicht an.",
    "Die Zusammenarbeit erfolgt in Mandaten, für die KOVALI selbst verantwortlich ist. KOVALI vermittelt keine Stellen an Dritte und verleiht kein Personal.",
    "Ihr Profil wird höchstens sechs Monate aufbewahrt und danach gelöscht. Auf Wunsch löschen wir es jederzeit früher.",
  ],

  /** Shown instead of the form while it is inactive (no e-mail delivery configured). */
  emailInstructions:
    "Senden Sie Ihren Lebenslauf als PDF per E-Mail. Nennen Sie kurz Ihren Schwerpunkt, Ihre Verfügbarkeit und Ihre GmbH oder AG. Ist die Firma noch in Gründung, schreiben Sie das dazu.",

  faqTitle: "Fragen von Fachleuten",
  faq: [
    {
      question: "Brauche ich eine eigene GmbH oder AG?",
      answer:
        "Ja. KOVALI vergibt Mandate nur an Firmen: Ihre GmbH oder AG arbeitet als Subunternehmen von KOVALI. Ist Ihre Firma noch in Gründung, geben Sie das im Profil an. Einen Auftrag erhält sie erst nach dem Eintrag im Handelsregister. Eine Anstellung bietet KOVALI nicht an.",
    },
    {
      question: "Wird mein Profil an andere Firmen weitergegeben?",
      answer:
        "Nur mit Ihrer Zustimmung und nur für ein konkretes Mandat, in dem KOVALI selbst Auftragnehmer ist. Dann steht Ihr Profil in der Offerte von KOVALI. KOVALI vermittelt keine Stellen an Dritte.",
    },
    {
      question: "Wie lange wird mein Profil aufbewahrt?",
      answer:
        "Höchstens sechs Monate. Danach wird es gelöscht, auf Wunsch auch früher. Eine kurze E-Mail genügt. Details stehen in der [Datenschutzerklärung](/datenschutz).",
    },
  ] satisfies FaqItem[],
} as const;
