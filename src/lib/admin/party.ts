import { legalFormLabel, site } from "@/config/site";

/**
 * KOVALI (Ferhat's own firm), from src/config/site.ts. When the GmbH replaces the sole
 * proprietorship, the admin picks up the new name, UID and register there.
 */
export interface Party {
  name: string;
  legalForm: string;
  owner: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  uid: string | null;
  vatNumber: string | null;
  commercialRegister: string | null;
  /** Person who signs for KOVALI, with title. */
  signatory: { name: string; title: string };
}

export function kovaliParty(): Party {
  const a = site.contact.address;
  return {
    name: site.legal.entityName.value,
    legalForm: legalFormLabel[site.legal.form],
    owner: site.legal.owner,
    street: a.street,
    postalCode: a.postalCode,
    city: a.city,
    country: a.country,
    email: site.contact.email.value,
    uid: site.legal.uid.value,
    vatNumber: site.legal.vatNumber.value,
    commercialRegister: site.legal.commercialRegister.value,
    signatory: { name: site.contact.person, title: site.contact.title },
  };
}

/** KOVALI is VAT-registered once it has a VAT number in site.ts; invoices then carry 8.1 % VAT on top. */
export function kovaliVatRegistered(): boolean {
  return Boolean(kovaliParty().vatNumber);
}

/** One line for document headers and party blocks, e.g. "Webnova Solutions F. Demir (KOVALI), Bettlachstrasse 45, 2540 Grenchen". */
export function partyLine(p: Party = kovaliParty()): string {
  return `${p.name} (${site.brand}), ${p.street}, ${p.postalCode} ${p.city}`;
}
