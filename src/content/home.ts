import { responseClause } from "@/config/site";

/**
 * Copy for the home page (spec 3.1 with addendum 9 and 3). Ferhat Demir's block reads
 * `founder` (company.ts), the disciplines `services.ts`, "So sieht die Arbeit aus"
 * `work-samples.ts`, the price line `priceTeasers.home` (pricing.ts).
 */
export const home = {
  hero: {
    kicker: "IT Consulting",
    title: "Business Analysis, Requirements Engineering und Test für Ihre IT-Projekte",
    lead: "KOVALI arbeitet direkt für Unternehmen oder als Subunternehmen für Beratungen und IT-Dienstleister. Vor Ort, remote oder hybrid in der ganzen Schweiz.",
    /** Accessible name of the list of the four disciplines below the lead. */
    disciplinesLabel: "Disziplinen im IT Consulting",
    /** After "Ferhat Demir, Geschäftsführer · ". */
    byline: "seit über 10 Jahren in der IT",
    primary: { label: "Projekt besprechen", href: "/kontakt" },
    secondary: { label: "Preise ansehen", href: "/preise" },
  },
  services: {
    title: "IT Consulting",
    text: "Sie vergeben eine einzelne Aufgabe, zum Beispiel Business Analysis für ein laufendes Scrum-Team, oder Analyse und Test im selben Mandat.",
    overview: { label: "IT Consulting im Überblick", href: "/leistungen" },
  },
  reasons: {
    title: "Warum KOVALI",
    items: [
      {
        title: "Ein fester Ansprechpartner",
        text: "Ferhat Demir liest Ihre Anfrage und bleibt Ihr Ansprechpartner bis zur Übergabe.",
      },
      {
        title: "Anforderungen, die sich testen lassen",
        text: "Jede User Story bekommt Akzeptanzkriterien, bevor programmiert wird. Daran misst der Test später, ob die Story erfüllt ist.",
      },
      {
        title: "Preise auf der Website",
        text: "Sie wissen vor dem ersten Gespräch, womit Sie rechnen können.",
      },
    ],
    link: { label: "Alle Gründe", href: "/warum-kovali" },
  },
  /**
   * Band for specialists (navy). KOVALI works with specialists only through their own GmbH
   * or AG as its subcontractor (addendum 3): no placement, no staff leasing.
   */
  specialistsBand: {
    title: "Sie arbeiten mit Ihrer eigenen GmbH oder AG in Business Analysis oder im Test?",
    text: "Senden Sie Ihr Profil für Mandate, in denen Ihre Firma als Subunternehmen von KOVALI arbeitet. Verwendet wird es nur mit Ihrer Zustimmung und nur für ein konkretes Mandat.",
    primary: { label: "Profil senden", href: "/fachleute#profil" },
    secondary: { label: "Mehr für Fachleute", href: "/fachleute" },
  },
} as const;

/**
 * Default closing call to action of `CtaBand` (home and every page without its own copy).
 * The response time appears only once `site.offer.responseWorkingDays` is confirmed.
 */
export const contactCta = {
  title: "Worum geht es in Ihrem Projekt?",
  text: `Beschreiben Sie kurz Aufgabe, Zeitraum und Pensum. Sie erhalten eine erste Einschätzung von Ferhat Demir${responseClause()}.`,
  primary: { label: "Projekt beschreiben", href: "/kontakt" },
  secondary: null,
} as const;
