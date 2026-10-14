import { serviceHref, services } from "./services";

export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Leistungen", href: "/leistungen" }, // H1 there: IT Consulting
  { label: "Warum KOVALI", href: "/warum-kovali" },
  { label: "Preise", href: "/preise" },
  { label: "Für Unternehmen", href: "/unternehmen" },
  { label: "Für Fachleute", href: "/fachleute" },
];

/** The mobile menu also lists the pages the desktop header leaves to the footer. */
export const mobileNav: NavItem[] = [
  ...mainNav,
  { label: "Branchen", href: "/branchen" },
  { label: "Insights", href: "/insights" },
];

/** Neutral on purpose: the site has two audiences (companies and specialists), each with its own entry. */
export const primaryCta: NavItem = { label: "Kontakt", href: "/kontakt" };

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "IT Consulting",
    items: [
      { label: "Übersicht", href: "/leistungen" },
      // `services` is already in the order of the chain from requirement to operation.
      ...services.map((s) => ({ label: s.name, href: serviceHref(s.slug) })),
      { label: "Preise", href: "/preise" },
    ],
  },
  {
    title: "KOVALI",
    items: [
      { label: "Warum KOVALI", href: "/warum-kovali" },
      { label: "Für Unternehmen", href: "/unternehmen" },
      { label: "Für Fachleute", href: "/fachleute" },
      { label: "Branchen", href: "/branchen" },
      { label: "Insights", href: "/insights" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];

export const legalNav: NavItem[] = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
];
