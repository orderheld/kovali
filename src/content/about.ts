import { site } from "@/config/site";

/** "Deutsch, Französisch und Englisch" from `site.languages`. */
function listJoin(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

/**
 * Copy of the company page "Über uns" (/unternehmen). It replaces the former pages
 * "Für Unternehmen", "Warum KOVALI" and "Branchen" (redesign 2026-11, Ferhat Demir: clean,
 * reduced, targeted). The team is named by roles only; the only person named is Ferhat Demir
 * as Geschäftsführer. No prices, no team size, no team certificates. The brand comes only
 * from `site.brand`.
 */
export const about = {
  meta: {
    title: "Über uns – Team, Arbeitsweise und Zusammenarbeit",
    description: `${site.brand} ist ein Beratungsunternehmen für IT-Projekte in der Schweiz. Lernen Sie unser Team, unsere Arbeitsweise und die Formen der Zusammenarbeit kennen.`,
  },

  banner: {
    title: "Über uns",
    lead: "Wer wir sind, wie wir arbeiten und wie Sie mit uns zusammenarbeiten können.",
  },

  intro: {
    kicker: "Unternehmen",
    title: "Wer wir sind",
    paragraphs: [
      `${site.brand} ist ein Beratungsunternehmen für IT-Projekte in der Schweiz. Wir übernehmen Requirements Engineering, Business Analysis, Testmanagement und Test Engineering. Wir arbeiten vor Ort, remote oder hybrid in der ganzen Schweiz.`,
      `Wir arbeiten direkt für Unternehmen und öffentliche Organisationen. Für Beratungen und IT-Dienstleister arbeiten wir als Subunternehmen in deren Kundenmandat. Unsere Arbeitssprachen sind ${listJoin(site.languages)}.`,
    ],
    /** Label of the name meaning below the paragraphs; shown only while `site.nameMeaning` is set. */
    nameMeaningLabel: "Wofür unser Name steht",
  },

  /** Roles only, never names, no numbers. Ferhat Demir has his own block below. Icons are chosen in the page. */
  team: {
    kicker: "Team",
    title: "Unser Team",
    text: "Analyse und Test liegen bei uns in einem Team. Wer im Mandat arbeitet, steht mit Namen in der Offerte.",
    roles: [
      {
        id: "business-analysts",
        title: "Business Analysts und Requirements Engineers",
        text: "Business Analysts und Requirements Engineers klären mit Ihren Fachbereichen, was die Software leisten muss. Daraus entstehen die Anforderungen, mit denen Entwicklung und Test arbeiten.",
      },
      {
        id: "test-manager",
        title: "Test Manager",
        text: "Test Manager legen fest, was wann getestet wird, und führen den Fehlerprozess bis zur Abnahme.",
      },
      {
        id: "test-engineers",
        title: "Test Engineers",
        text: "Test Engineers leiten Testfälle aus den Anforderungen ab und führen sie durch. Jeder gefundene Fehler lässt sich anhand ihres Berichts nachstellen.",
      },
    ],
  },

  approach: {
    kicker: "Arbeitsweise",
    title: "Wie wir arbeiten",
    steps: [
      {
        title: "Klären",
        text: "Wir klären die Anforderungen mit Ihren Fachbereichen und legen die Akzeptanzkriterien fest, bevor programmiert wird.",
      },
      {
        title: "Priorisieren",
        text: "Wir wägen Nutzen und Aufwand ab und legen mit Ihnen die Reihenfolge im Backlog fest.",
      },
      {
        title: "Prüfen",
        text: "Wir testen gegen die Akzeptanzkriterien und begleiten die Tests bis zur Abnahme.",
      },
      {
        title: "Übergeben",
        text: "Wir übergeben Unterlagen, Anforderungs- und Teststand und offene Punkte so, dass Ihr Team ohne uns weiterarbeiten kann.",
      },
    ],
  },

  /** Target of the links /unternehmen#zusammenarbeit. Icons are chosen in the page. */
  collaboration: {
    id: "zusammenarbeit",
    kicker: "Mandate",
    title: "Zusammenarbeit",
    models: [
      {
        title: "Direktmandat",
        text: "Sie beauftragen uns direkt. Das passt für Unternehmen und öffentliche Organisationen mit eigenem Projekt.",
      },
      {
        title: "Subunternehmen im Kundenmandat",
        text: "Sie sind eine Beratung oder ein IT-Dienstleister und bleiben Vertragspartner Ihres Kunden. Wir arbeiten in Ihrem Auftrag im Mandat mit.",
      },
      {
        title: "Abgegrenztes Teilmandat",
        text: "Sie beauftragen uns direkt mit einem festgelegten Ergebnis. Das kann eine Ist-Analyse, ein Fachkonzept, eine Teststrategie oder ein Abnahmetest sein.",
      },
    ],
    /** Heading of the terms below the three models. */
    termsTitle: "Vertrag und Abrechnung",
    /** No amounts: the hourly rate is named in the written offer only (Ferhat Demir, 14.10.2026). */
    terms: [
      "Aufgaben, Ergebnisse und Verantwortlichkeiten halten wir vor dem Start schriftlich fest. Wir rechnen monatlich nach Aufwand ab. Den Stundensatz nennen wir in der schriftlichen Offerte.",
      "Wir erbringen Leistungen in eigener Verantwortung, im Auftrag oder Werkvertrag. Personalverleih und Stellenvermittlung bieten wir nicht an.",
    ],
  },

  contact: {
    kicker: "Ihr Ansprechpartner",
    /** Id of the H2, the anchor of the Person JSON-LD (/unternehmen#ferhat-demir). */
    headingId: "ferhat-demir",
  },
} as const;
