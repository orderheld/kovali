import { services, serviceHref } from "./services";

export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Leistungen", href: "/leistungen" },
  { label: "Branchen", href: "/branchen" },
  { label: "Für Partner", href: "/partner" },
  { label: "Über uns", href: "/ueber-uns" },
  { label: "Insights", href: "/insights" },
];

export const primaryCta: NavItem = { label: "Projekt anfragen", href: "/kontakt" };

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Leistungen",
    items: services.map((s) => ({ label: s.name, href: serviceHref(s.slug) })),
  },
  {
    title: "Unternehmen",
    items: [
      { label: "Branchen", href: "/branchen" },
      { label: "Für Partner", href: "/partner" },
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
