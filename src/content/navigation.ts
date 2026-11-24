import { serviceHref, services } from "./services";

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Main navigation. "Über uns" lives at /unternehmen (company page with team, way of working
 * and collaboration); /warum-kovali, /ueber-uns and /branchen redirect there.
 */
export const mainNav: NavItem[] = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Über uns", href: "/unternehmen" },
  { label: "Insights", href: "/insights" },
];

/** The site addresses companies only: consultancies, IT service providers and end clients. */
export const primaryCta: NavItem = { label: "Kontakt", href: "/kontakt" };

/** The mobile menu lists the main navigation and the contact page. */
export const mobileNav: NavItem[] = [...mainNav, primaryCta];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Leistungen",
    // `services` is already in the order of the chain from requirement to operation.
    items: services.map((s) => ({ label: s.name, href: serviceHref(s.slug) })),
  },
  {
    title: "Unternehmen",
    items: [
      { label: "Über uns", href: "/unternehmen" },
      { label: "Insights", href: "/insights" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];

export const legalNav: NavItem[] = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
];
