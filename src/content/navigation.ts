import { services, serviceHref } from "./services";

export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Branchen", href: "/branchen" },
  { label: "Für Unternehmen", href: "/unternehmen" },
  { label: "Für Fachleute", href: "/fachleute" },
  { label: "Über uns", href: "/ueber-uns" },
];

/** Neutral on purpose: the site has two audiences (companies and specialists), each with its own entry. */
export const primaryCta: NavItem = { label: "Kontakt", href: "/kontakt" };

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Leistungen",
    items: services.map((s) => ({ label: s.name, href: serviceHref(s.slug) })),
  },
  {
    title: "KOVALI",
    items: [
      { label: "Für Unternehmen", href: "/unternehmen" },
      { label: "Für Fachleute", href: "/fachleute" },
      { label: "Branchen", href: "/branchen" },
      { label: "Über uns", href: "/ueber-uns" },
      { label: "Insights", href: "/insights" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];

export const legalNav: NavItem[] = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
];
