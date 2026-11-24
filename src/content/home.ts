import { responseClause, site } from "@/config/site";

/**
 * Copy for the home page, in the reduced structure of the 2026-11 redesign (Ferhat Demir,
 * 24.11.2026: clean, reduced, targeted, in the manner of a Swiss consulting site): hero,
 * introduction, three strengths, services, articles, closing band. No prices on the site
 * (Ferhat Demir, 14.10.2026). The team is named by roles only, never by person.
 */
export const home = {
  hero: {
    /** H1, set in small capitals above the lead. */
    title: "IT Consulting für Business Analysis und Test",
    lead: "Wir klären, was Ihre Software leisten muss, und prüfen vor dem Go-live, ob sie es tut.",
    primary: { label: "Projekt besprechen", href: "/kontakt" },
  },
  intro: {
    paragraphs: [
      `${site.brand} ist ein Beratungsunternehmen für IT-Projekte in der Schweiz. Wir arbeiten in Business Analysis, Requirements Engineering und Softwaretest.`,
      "Im Team arbeiten Business Analysts, Test Manager und Test Engineers. Wir übernehmen Aufgaben direkt für Unternehmen und öffentliche Organisationen oder als Subunternehmen für Beratungen und IT-Dienstleister.",
    ],
    link: { label: "Über uns", href: "/unternehmen" },
  },
  /** Navy band with three strengths. Icons are chosen in the page. */
  strengths: {
    title: "Worauf Sie sich verlassen können",
    items: [
      {
        title: "Prüfbare Anforderungen",
        text: "Jede User Story bekommt Akzeptanzkriterien, bevor programmiert wird. Daran misst der Test später, ob sie erfüllt ist.",
      },
      {
        title: "Analyse und Test aus einer Hand",
        text: "Business Analysts und Testverantwortliche arbeiten im selben Team. Was im Fachkonzept steht, wird in der Abnahme geprüft.",
      },
      {
        title: "Eine feste Ansprechperson",
        text: "Vom ersten Gespräch bis zur Übergabe sprechen Sie mit derselben Person. Sie erklären Ihr Vorhaben nur einmal.",
      },
    ],
    link: { label: "Mehr über uns", href: "/unternehmen" },
  },
  services: {
    kicker: "Leistungen",
    title: "Was wir in Ihrem Projekt übernehmen",
    link: { label: "Alle Leistungen", href: "/leistungen" },
  },
  insights: {
    kicker: "Insights",
    title: "Fachartikel",
    text: "Was Business Analysis leistet und wann sich externe Unterstützung lohnt.",
    link: { label: "Alle Artikel", href: "/insights" },
  },
} as const;

/**
 * Default closing call to action of `CtaBand` (home and every page without its own copy).
 * The response time appears only once `site.offer.responseWorkingDays` is confirmed.
 */
export const contactCta = {
  title: "Sprechen wir über Ihr Vorhaben",
  text: `Beschreiben Sie kurz Aufgabe, Zeitraum und Pensum. Sie erhalten eine erste Einschätzung${responseClause()}.`,
  primary: { label: "Kontakt aufnehmen", href: "/kontakt" },
} as const;
