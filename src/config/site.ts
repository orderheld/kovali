/**
 * Central company, contact and legal data for KOVALI.
 *
 * Everything that can change when the legal form changes (sole proprietorship
 * today, GmbH later) lives here. Pages, footer, imprint and structured data
 * read from this file only.
 *
 * Values with `confirmed: false` must be verified before going live.
 * `npm run check:launch` lists them.
 */

export interface Confirmable<T> {
  value: T;
  confirmed: boolean;
  note?: string;
}

export type LegalForm = "einzelunternehmen" | "gmbh";

export const legalFormLabel: Record<LegalForm, string> = {
  einzelunternehmen: "Einzelunternehmen",
  gmbh: "Gesellschaft mit beschränkter Haftung (GmbH)",
};

export const site = {
  brand: "KOVALI",
  tagline: "Business & Technology Consulting",
  claim: "From Requirements to Value.",
  description:
    "KOVALI ist ein Schweizer Partner für Business Analysis, Requirements Engineering, Application Management und Test Management in komplexen IT-Projekten.",
  locale: "de-CH",

  /** Active logo direction: "signature" | "tech" | "minimal" (see brand/README.md). */
  logoDirection: "signature",

  /** Public base URL. Set NEXT_PUBLIC_SITE_URL in Vercel; the fallback is only used locally. */
  url: {
    value: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kovali.ch",
    confirmed: false,
    note: "Domain noch nicht registriert bzw. bestätigt.",
  } satisfies Confirmable<string>,

  legal: {
    form: "einzelunternehmen" as LegalForm,
    /** Exact name as registered (Handelsregister / Zefix). */
    entityName: {
      value: "Webnova Solutions F. Demir",
      confirmed: true,
      note: "Von Ferhat Demir bestätigt (13.10.2026). Gross- und Kleinschreibung mit Zefix abgleichen.",
    } satisfies Confirmable<string>,
    owner: "Ferhat Demir",
    /** e.g. "CHE-123.456.789". If there is none, keep null and set confirmed: true. */
    uid: { value: null, confirmed: false, note: "UID eintragen oder bestätigen, dass keine besteht." } as Confirmable<string | null>,
    /** e.g. "CHE-123.456.789 MWST", only if VAT-registered */
    vatNumber: { value: null, confirmed: false, note: "Nur bei MWST-Pflicht eintragen." } as Confirmable<string | null>,
    /** e.g. "Handelsregister des Kantons Solothurn", only if registered */
    commercialRegister: {
      value: null,
      confirmed: false,
      note: "Nur bei Eintrag im Handelsregister angeben.",
    } as Confirmable<string | null>,
  },

  contact: {
    person: "Ferhat Demir",
    role: "Gründer und fachlicher Ansprechpartner",
    email: {
      value: "info@kovali.ch",
      confirmed: true,
      note: "Von Ferhat Demir bestätigt (13.10.2026).",
    } satisfies Confirmable<string>,
    /** Leave null to hide the phone number on the website. */
    phone: {
      value: null,
      confirmed: false,
      note: "Optional. Leer lassen, wenn keine Telefonnummer veröffentlicht werden soll.",
    } as Confirmable<string | null>,
    address: {
      street: "Bettlachstrasse 45",
      postalCode: "2540",
      city: "Grenchen",
      region: "SO",
      country: "Schweiz",
      countryCode: "CH",
    },
  },

  /** Regions in which the services are offered. */
  areaServed: ["Schweiz"],
  languages: ["Deutsch", "Französisch", "Englisch"],

  social: {
    linkedin: null as string | null,
  },
} as const;

/** Display name of the contracting party, e.g. in the imprint. */
export function legalEntityName(): string {
  return site.legal.entityName.value;
}

export function absoluteUrl(path = "/"): string {
  const base = site.url.value.replace(/\/$/, "");
  return path === "/" ? base : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** All values that still need confirmation, for the launch check. */
export function unconfirmedFields(): { field: string; value: unknown; note?: string }[] {
  const entries: [string, Confirmable<unknown>][] = [
    ["Domain (url)", site.url],
    ["Firmenname (legal.entityName)", site.legal.entityName],
    ["UID (legal.uid)", site.legal.uid],
    ["MWST-Nummer (legal.vatNumber)", site.legal.vatNumber],
    ["Handelsregister (legal.commercialRegister)", site.legal.commercialRegister],
    ["E-Mail (contact.email)", site.contact.email],
    ["Telefon (contact.phone)", site.contact.phone],
  ];
  return entries
    .filter(([, c]) => !c.confirmed)
    .map(([field, c]) => ({ field, value: c.value, note: c.note }));
}
