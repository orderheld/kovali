import { responseClause, site, vatClause } from "@/config/site";
import { hourlyRange } from "./pricing";
import type { FaqItem, TitledText } from "./types";

/**
 * Copy for /warum-kovali (spec 3.4 with addendum 1 and 2). Ferhat Demir's block reads
 * `founder` and `certifications`, the working rules `principles` (all in company.ts).
 * Prices come from `site.offer.hourly` (via pricing.ts); every other offer clause appears only once confirmed.
 */

/**
 * " KOVALI selbst ist ein junges Unternehmen." in the FAQ on the years of experience.
 * Ships only once Ferhat Demir agrees (spec 7, item 13).
 */
const showYoungCompanyNote = false;

/** Only when Ferhat Demir has confirmed the promise and its value is true. */
const customerProtection =
  site.offer.customerProtection.confirmed && site.offer.customerProtection.value
    ? " Deren Kunden spricht KOVALI nicht auf eigene Rechnung an."
    : "";

export const why = {
  showYoungCompanyNote,
  meta: {
    title: "Warum KOVALI – Ansprechpartner, Arbeitsweise, Preise",
    description:
      "Warum KOVALI: Geschäftsführer Ferhat Demir arbeitet seit über 10 Jahren in der IT und ist nach IREB und ISTQB zertifiziert. Arbeitsweise, Abgrenzung, Preise.",
    /** Share cards carry no years of experience (spec 3.0), so they get their own text. */
    shareDescription:
      "Warum KOVALI: Geschäftsführer Ferhat Demir ist nach IREB und ISTQB zertifiziert. Arbeitsweise, Abgrenzung, Preise und Antworten auf häufige Fragen.",
  },
  hero: {
    title: "Was Sie von KOVALI erwarten können",
    lead: "Sie suchen jemanden, der Anforderungen klärt oder Tests steuert, und möchten wissen, mit wem Sie es zu tun haben. Hier steht, wer KOVALI führt, nach welchen Regeln wir arbeiten und was wir nicht anbieten.",
    primary: { label: "Erstgespräch anfragen", href: "/kontakt" },
    secondary: { label: "Preise ansehen", href: "/preise" },
  },
  reasons: {
    title: "Was für KOVALI spricht",
    /** Texts may contain [Label](/pfad) links. */
    items: [
      {
        title: "Ein fester Ansprechpartner",
        text: "Ihr Ansprechpartner ist Ferhat Demir, vom ersten Gespräch bis zur Übergabe. Sie erklären Ihr Vorhaben einmal und nicht bei jedem Wechsel der Zuständigkeit neu.",
      },
      {
        title: "Anforderungen, die sich testen lassen",
        text: "Ferhat Demir hat selbst Testkonzepte geschrieben und Regressionstests durchgeführt. Deshalb bekommt jede Anforderung Akzeptanzkriterien, bevor programmiert wird. Daran misst der Test später, ob sie erfüllt ist.",
      },
      {
        title: "Standards, die Ihre Teams kennen",
        text: "Requirements Engineering nach IREB, Softwaretest nach ISTQB. Ferhat Demir ist in beiden zertifiziert.",
      },
      {
        title: "Deutsch, Französisch, Englisch",
        text: "Workshops und Dokumentation in der Sprache der Beteiligten. Das hilft in Vorhaben über die Sprachgrenze und mit Entwicklungspartnern, die auf Englisch arbeiten.",
      },
      {
        title: "Direkt oder als Subunternehmen",
        text: `Unternehmen und öffentliche Organisationen beauftragen KOVALI direkt. Beratungen und IT-Dienstleister holen KOVALI als Subunternehmen in ihr Kundenmandat, der Vertrag mit dem Endkunden bleibt bei ihnen.${customerProtection}`,
      },
      {
        title: "Preise, die Sie vorher kennen",
        text: "Die Stundensätze stehen auf dieser Website, mit den Faktoren, die sie bestimmen, und einem Rechenbeispiel. Abgerechnet wird monatlich nach geleisteten Stunden. [Preise](/preise)",
      },
    ] satisfies TitledText[],
  },
  principles: {
    title: "So arbeiten wir im Mandat",
    /** Serif closing line; the page sets the claim below it in English (lang="en"). */
    closing:
      "Der Name KOVALI steht für Konzeption, Value Analysis und Lösungsintegration: die Schritte von der Anforderung zur Lösung im Betrieb.",
  },
  exclusions: {
    title: "Was Sie bei KOVALI nicht bekommen",
    // Three items (addendum 2): test automation is Ferhat Demir's business decision, not listed here.
    items: [
      {
        title: "Personalverleih und Stellenvermittlung.",
        text: "KOVALI erbringt Leistungen in eigener Verantwortung, im Auftrag oder Werkvertrag.",
      },
      {
        title: "Softwareentwicklung.",
        text: "KOVALI beschreibt, was gebaut werden soll, und prüft das Ergebnis. Programmiert wird bei Ihnen oder Ihren Entwicklungspartnern.",
      },
      {
        title: "Technischen Betrieb.",
        text: "Hosting, Server und IT-Support bleiben bei Ihrem Betreiber.",
      },
    ] satisfies TitledText[],
  },
  faqTitle: "Fragen zu KOVALI",
  faq: [
    {
      question: "Mit wem arbeite ich zusammen?",
      answer:
        "Ihr Ansprechpartner ist Ferhat Demir, Geschäftsführer. Er führt das Erstgespräch und bleibt bis zur Übergabe Ihr Kontakt. Wer im Mandat arbeitet, steht mit Namen in der Offerte, bevor Sie unterschreiben.",
    },
    {
      question: "Worauf beziehen sich die Jahresangaben?",
      answer: `Auf die persönliche Berufserfahrung von Ferhat Demir: seit über 10 Jahren in der IT, seit 2020 in Business Analysis und Requirements Engineering.${
        showYoungCompanyNote ? " KOVALI selbst ist ein junges Unternehmen." : ""
      }`,
    },
    {
      question: "Was kostet ein Einsatz?",
      answer: `Die Richtwerte liegen bei ${hourlyRange}, ${vatClause()}. Was den Satz bestimmt und wie ein Einsatz von sechs Monaten zu 80\u00A0% gerechnet wird, steht unter [Preise](/preise).`,
    },
    {
      question: "Vermitteln oder verleihen Sie auch Personal?",
      answer:
        "Nein. KOVALI bietet weder Personalverleih noch Stellenvermittlung an. KOVALI arbeitet in eigener Verantwortung im Auftrag oder Werkvertrag, direkt für Unternehmen oder als Subunternehmen für Beratungen und IT-Dienstleister.",
    },
  ] satisfies FaqItem[],
  cta: {
    title: "Sprechen wir über Ihr Vorhaben",
    text: `Beschreiben Sie kurz die gesuchte Unterstützung und den Zeitraum. Ferhat Demir meldet sich mit einer ersten Einschätzung${responseClause()}.`,
    primary: { label: "Erstgespräch anfragen", href: "/kontakt" },
    secondary: { label: "Preise ansehen", href: "/preise" },
  },
};
