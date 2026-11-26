import { responseClause, site } from "@/config/site";

/**
 * Copy for the home page (design v3, Ferhat Demir 26.11.2026: calm, plain, to the point, with
 * the focus on Requirements Engineering, Business Analysis and Testmanagement and the tools of
 * the trade). No prices on the site (Ferhat Demir, 14.10.2026). The team is named by roles
 * only, never by person.
 */
export const home = {
  meta: {
    title: `${site.brand} | Requirements Engineering und Test in der Schweiz`,
    description: `IT Consulting in der Schweiz: ${site.brand} übernimmt Requirements Engineering, Business Analysis, Testmanagement und Test Engineering in IT-Projekten.`,
  },
  hero: {
    kicker: "IT Consulting in der Schweiz",
    /** H1 of the hero. */
    title: "Requirements Engineering, Business Analysis und Testmanagement",
    lead: "Wir klären mit Ihren Fachbereichen, was eine Software leisten muss, schreiben prüfbare Anforderungen und testen vor dem Go-live, ob sie erfüllt sind.",
    primary: { label: "Projekt besprechen", href: "/kontakt" },
    secondary: { label: "Leistungen ansehen", href: "/leistungen" },
  },
  /** The four core activities of Requirements Engineering, with typical results. */
  requirements: {
    kicker: "Requirements Engineering",
    title: "Klare Anforderungen für Entwicklung und Test",
    text: "Requirements Engineering ist der Kern unserer Arbeit. Wir übernehmen alle vier Tätigkeiten, vom Ermitteln bis zum Anforderungsmanagement, einzeln oder zusammen.",
    activities: [
      {
        title: "Ermitteln",
        text: "In Interviews und Workshops mit Fachbereichen und Stakeholdern erheben wir Ziele, Abläufe und Rahmenbedingungen.",
        results: ["Stakeholder-Übersicht", "Ist-Analyse"],
      },
      {
        title: "Dokumentieren",
        text: "Wir schreiben User Stories mit Akzeptanzkriterien, modellieren Abläufe in BPMN und beschreiben Schnittstellen bis auf Feldebene.",
        results: ["User Stories", "BPMN-Modelle", "Schnittstellen"],
      },
      {
        title: "Prüfen und Abstimmen",
        text: "In Reviews mit Fachbereich, Entwicklung und Test finden wir Lücken und Widersprüche vor der Umsetzung.",
        results: ["Reviews", "Abgestimmte Anforderungen"],
      },
      {
        title: "Verwalten",
        text: "Im Anforderungsmanagement priorisieren wir den Bestand, führen Änderungen über Change Requests und verknüpfen jede Anforderung mit ihren Testfällen.",
        results: ["Priorisiertes Backlog", "Nachverfolgbarkeit"],
      },
    ],
    link: { label: "Mehr zu Requirements Engineering", href: "/leistungen/business-analysis" },
  },
  services: {
    kicker: "Leistungen",
    title: "Was wir in Ihrem Projekt übernehmen",
    link: { label: "Alle Leistungen", href: "/leistungen" },
  },
  /** Three strengths ("Arbeitsweise"). */
  strengths: {
    kicker: "Arbeitsweise",
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
  },
  tools: {
    kicker: "Werkzeuge",
    title: "Wir arbeiten in den Werkzeugen Ihres Projekts",
    text: "Anforderungen, Modelle und Tests führen wir dort, wo Ihr Team bereits arbeitet. Eine Auswahl:",
  },
  team: {
    link: { label: "Mehr über uns", href: "/unternehmen" },
  },
  insights: {
    kicker: "Insights",
    title: "Fachartikel",
    text: "Was Business Analysis und Requirements Engineering leisten und wann sich externe Unterstützung lohnt.",
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
