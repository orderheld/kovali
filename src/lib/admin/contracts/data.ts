import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { likePattern, PAGE_SIZE } from "../data/query";
import { getDb } from "../db/client";
import { candidates, companies, contacts, contracts, mandates, submissions } from "../db/schema";
import { displayNo, todayIso } from "../format";
import { kovaliParty } from "../party";
import { getTemplate, isTemplateId } from "./templates";
import type { CompanyInfo, ContactInfo, ContractContext, MandateInfo, ParentInfo, PersonInfo, PrefillContext, TemplateId } from "./types";

/** Database access of the contracts module: lists, detail, the context for documents, form options. */

export type ContractRow = typeof contracts.$inferSelect;

function listFilter({ q, status, template }: { q?: string; status?: string; template?: string }) {
  const pattern = likePattern(q);
  return and(
    status ? eq(contracts.status, status) : undefined,
    template ? eq(contracts.template, template) : undefined,
    pattern
      ? or(
          ilike(contracts.number, pattern),
          ilike(contracts.title, pattern),
          ilike(companies.name, pattern),
          ilike(companies.legalName, pattern),
          ilike(sql`${candidates.firstName} || ' ' || ${candidates.lastName}`, pattern),
        )
      : undefined,
  );
}

export async function listContracts(filter: { q?: string; status?: string; template?: string; page: number }) {
  const db = await getDb();
  const where = listFilter(filter);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: contracts.id,
        number: contracts.number,
        template: contracts.template,
        title: contracts.title,
        status: contracts.status,
        validFrom: contracts.validFrom,
        validUntil: contracts.validUntil,
        signedAt: contracts.signedAt,
        companyId: contracts.companyId,
        companyName: companies.name,
        candidateId: contracts.candidateId,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
      })
      .from(contracts)
      .leftJoin(companies, eq(companies.id, contracts.companyId))
      .leftJoin(candidates, eq(candidates.id, contracts.candidateId))
      .where(where)
      .orderBy(desc(contracts.createdAt), desc(contracts.id))
      .limit(PAGE_SIZE)
      .offset((filter.page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(contracts)
      .leftJoin(companies, eq(companies.id, contracts.companyId))
      .leftJoin(candidates, eq(candidates.id, contracts.candidateId))
      .where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

/** Number of contracts per status, with the search and template filter applied. */
export async function statusCounts(filter: { q?: string; template?: string }): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: contracts.status, n: count() })
    .from(contracts)
    .leftJoin(companies, eq(companies.id, contracts.companyId))
    .leftJoin(candidates, eq(candidates.id, contracts.candidateId))
    .where(listFilter(filter))
    .groupBy(contracts.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function getContract(id: number): Promise<ContractRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return row ?? null;
}

const companyColumns = {
  id: companies.id,
  name: companies.name,
  legalName: companies.legalName,
  legalForm: companies.legalForm,
  uid: companies.uid,
  street: companies.street,
  postalCode: companies.postalCode,
  city: companies.city,
  country: companies.country,
  kind: companies.kind,
};

async function loadCompany(id: number | null): Promise<CompanyInfo | null> {
  if (!id) return null;
  const db = await getDb();
  const [row] = await db.select(companyColumns).from(companies).where(eq(companies.id, id)).limit(1);
  return row ?? null;
}

async function loadContact(id: number | null): Promise<(ContactInfo & { companyId: number }) | null> {
  if (!id) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id, companyId: contacts.companyId, firstName: contacts.firstName, lastName: contacts.lastName, role: contacts.role })
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  return row ? { id: row.id, companyId: row.companyId, name: [row.firstName, row.lastName].filter(Boolean).join(" "), role: row.role } : null;
}

async function loadCandidate(id: number | null) {
  if (!id) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      street: candidates.street,
      postalCode: candidates.postalCode,
      city: candidates.city,
      country: candidates.country,
      companyId: candidates.companyId,
      rateAmount: candidates.rateAmount,
      rateUnit: candidates.rateUnit,
    })
    .from(candidates)
    .where(eq(candidates.id, id))
    .limit(1);
  return row ? { ...row, ref: displayNo.candidate(row.id) } : null;
}

async function loadMandate(id: number | null) {
  if (!id) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: mandates.id,
      title: mandates.title,
      reference: mandates.reference,
      endClient: mandates.endClient,
      companyId: mandates.companyId,
      contactId: mandates.contactId,
      companyName: companies.name,
      companyLegalName: companies.legalName,
      location: mandates.location,
      remote: mandates.remote,
      workload: mandates.workload,
      startDate: mandates.startDate,
      endDate: mandates.endDate,
      rateSell: mandates.rateSell,
      rateUnit: mandates.rateUnit,
      portalRate: mandates.portalRate,
      portalRateUnit: mandates.portalRateUnit,
      description: mandates.description,
    })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(eq(mandates.id, id))
    .limit(1);
  return row ? { ...row, ref: displayNo.mandate(row.id), companyName: row.companyLegalName || row.companyName } : null;
}

async function loadParent(id: number | null): Promise<(ParentInfo & { companyId: number | null; status: string }) | null> {
  if (!id) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: contracts.id,
      number: contracts.number,
      title: contracts.title,
      template: contracts.template,
      validFrom: contracts.validFrom,
      signedAt: contracts.signedAt,
      companyId: contracts.companyId,
      status: contracts.status,
    })
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return row ?? null;
}

function toPerson(c: NonNullable<Awaited<ReturnType<typeof loadCandidate>>>): PersonInfo {
  return { id: c.id, firstName: c.firstName, lastName: c.lastName, street: c.street, postalCode: c.postalCode, city: c.city, country: c.country, ref: c.ref };
}

function toMandate(m: NonNullable<Awaited<ReturnType<typeof loadMandate>>>): MandateInfo {
  return { id: m.id, ref: m.ref, title: m.title, reference: m.reference, endClient: m.endClient, companyName: m.companyName };
}

/** Linked records as they are now; the document always shows the current names and addresses. */
export async function loadContractContext(row: ContractRow): Promise<ContractContext> {
  const [parent, contact, candidate, mandate] = await Promise.all([
    loadParent(row.parentId),
    loadContact(row.contactId),
    loadCandidate(row.candidateId),
    loadMandate(row.mandateId),
  ]);
  // An Einzelauftrag is made with the client of its Rahmenvertrag.
  const company = await loadCompany(row.companyId ?? parent?.companyId ?? null);
  return {
    number: row.number,
    title: row.title,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    signedAt: row.signedAt,
    kovali: kovaliParty(),
    company,
    contact: contact ? { id: contact.id, name: contact.name, role: contact.role } : null,
    candidate: candidate ? toPerson(candidate) : null,
    mandate: mandate ? toMandate(mandate) : null,
    parent: parent ? { id: parent.id, number: parent.number, title: parent.title, template: parent.template, validFrom: parent.validFrom, signedAt: parent.signedAt } : null,
  };
}

/** Einzelaufträge under a Rahmenvertrag. */
export async function listChildren(parentId: number) {
  const db = await getDb();
  return db
    .select({
      id: contracts.id,
      number: contracts.number,
      title: contracts.title,
      template: contracts.template,
      status: contracts.status,
      validFrom: contracts.validFrom,
      validUntil: contracts.validUntil,
    })
    .from(contracts)
    .where(eq(contracts.parentId, parentId))
    .orderBy(desc(contracts.createdAt), desc(contracts.id));
}

/** Choices for the link selects of the contract form; small lists, filtered on the client. */
export async function contractFormOptions() {
  const db = await getDb();
  const [companyRows, contactRows, candidateRows, mandateRows, parentRows] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name, legalName: companies.legalName, kind: companies.kind, status: companies.status })
      .from(companies)
      .orderBy(asc(sql`lower(${companies.name})`)),
    db
      .select({
        id: contacts.id,
        companyId: contacts.companyId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        role: contacts.role,
        isSignatory: contacts.isSignatory,
      })
      .from(contacts)
      .orderBy(desc(contacts.isSignatory), asc(sql`lower(${contacts.lastName})`)),
    db
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, companyId: candidates.companyId, status: candidates.status })
      .from(candidates)
      .orderBy(asc(sql`lower(${candidates.lastName})`), asc(sql`lower(${candidates.firstName})`)),
    db
      .select({ id: mandates.id, title: mandates.title, companyId: mandates.companyId, company: companies.name })
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .orderBy(desc(mandates.createdAt)),
    db
      .select({ id: contracts.id, number: contracts.number, title: contracts.title, companyId: contracts.companyId, status: contracts.status })
      .from(contracts)
      .where(and(eq(contracts.template, "rahmenvertrag"), ne(contracts.status, "storniert")))
      .orderBy(desc(contracts.createdAt)),
  ]);
  return {
    companies: companyRows.map((c) => ({
      value: c.id,
      label: c.status === "inaktiv" ? `${c.name} (inaktiv)` : c.name,
      name: c.legalName || c.name,
      kind: c.kind,
    })),
    contacts: contactRows.map((c) => ({
      value: c.id,
      companyId: c.companyId,
      label: `${[c.firstName, c.lastName].filter(Boolean).join(" ")}${c.role ? `, ${c.role}` : ""}${c.isSignatory ? " · zeichnungsberechtigt" : ""}`,
      isSignatory: c.isSignatory,
    })),
    candidates: candidateRows.map((c) => ({
      value: c.id,
      label: `${c.lastName} ${c.firstName} (${displayNo.candidate(c.id)}${c.status === "archiviert" ? ", archiviert" : ""})`,
      name: `${c.firstName} ${c.lastName}`,
      companyId: c.companyId,
    })),
    mandates: mandateRows.map((m) => ({
      value: m.id,
      label: `${displayNo.mandate(m.id)} ${m.title}${m.company ? ` (${m.company})` : ""}`,
      title: m.title,
      companyId: m.companyId,
    })),
    parents: parentRows.map((p) => ({ value: p.id, label: `${p.number} ${p.title}`, number: p.number, companyId: p.companyId, status: p.status })),
  };
}

export type ContractFormOptions = Awaited<ReturnType<typeof contractFormOptions>>;

/** Link values and dates of the form, as stored in the contracts table. */
export interface CommonValues {
  title: string;
  companyId: number | null;
  contactId: number | null;
  candidateId: number | null;
  mandateId: number | null;
  parentId: number | null;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
}

export interface PrefillParams {
  firma?: number | null;
  kontakt?: number | null;
  kandidat?: number | null;
  mandat?: number | null;
  rahmen?: number | null;
}

async function signatoryOf(companyId: number | null): Promise<number | null> {
  if (!companyId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isSignatory, true)))
    .orderBy(asc(contacts.id))
    .limit(1);
  return row?.id ?? null;
}

async function latestFramework(companyId: number | null): Promise<number | null> {
  if (!companyId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(and(eq(contracts.companyId, companyId), eq(contracts.template, "rahmenvertrag"), inArray(contracts.status, ["unterzeichnet", "versendet", "entwurf"])))
    .orderBy(sql`case ${contracts.status} when 'unterzeichnet' then 0 when 'versendet' then 1 else 2 end`, desc(contracts.createdAt))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Values for a new contract opened from another record (?firma=, ?kontakt=, ?kandidat=,
 * ?mandat=, ?rahmen=): links, dates and the template's own suggestions.
 */
export async function loadPrefill(templateId: TemplateId, params: PrefillParams): Promise<{ common: CommonValues; data: Record<string, unknown> }> {
  const template = getTemplate(templateId);
  if (!template || !isTemplateId(templateId)) throw new Error("Unbekannte Vorlage");
  const links = template.links;
  const [candidate, mandate, explicitCompany] = await Promise.all([
    loadCandidate(links.candidate !== "hidden" ? (params.kandidat ?? null) : null),
    loadMandate(links.mandate !== "hidden" ? (params.mandat ?? null) : null),
    loadCompany(params.firma ?? null),
  ]);

  let parent = links.parent !== "hidden" ? await loadParent(params.rahmen ?? null) : null;
  if (parent && parent.template !== "rahmenvertrag") parent = null;
  if (!parent && links.parent !== "hidden") {
    parent = await loadParent(await latestFramework(explicitCompany?.id ?? mandate?.companyId ?? null));
  }

  // Which company the contract is made with depends on the template.
  let companyId: number | null = null;
  if (templateId === "subunternehmer") {
    // The specialist's own firm, never the client of the mandate.
    companyId = explicitCompany?.kind === "subunternehmer" ? explicitCompany.id : (candidate?.companyId ?? null);
  } else if (templateId === "einzelauftrag") {
    companyId = parent?.companyId ?? null;
  } else if (links.company !== "hidden") {
    companyId = explicitCompany?.id ?? mandate?.companyId ?? null;
  }
  const company = companyId === explicitCompany?.id ? explicitCompany : await loadCompany(companyId);
  if (company && template.companyKinds.length && !template.companyKinds.includes(company.kind) && templateId !== "einzelauftrag") {
    companyId = null;
  }

  let contactId: number | null = null;
  if (links.contact !== "hidden" && companyId) {
    const explicit = await loadContact(params.kontakt ?? null);
    const fromMandate = mandate?.companyId === companyId ? await loadContact(mandate.contactId) : null;
    contactId =
      explicit?.companyId === companyId ? explicit.id : templateId === "subunternehmer" ? await signatoryOf(companyId) : ((await signatoryOf(companyId)) ?? fromMandate?.id ?? null);
  }

  let submission: PrefillContext["submission"] = null;
  if (candidate && mandate) {
    const db = await getDb();
    const [row] = await db
      .select({ rateBuy: submissions.rateBuy, rateSell: submissions.rateSell, rateUnit: submissions.rateUnit, profileVariant: submissions.profileVariant })
      .from(submissions)
      .where(and(eq(submissions.mandateId, mandate.id), eq(submissions.candidateId, candidate.id)))
      .limit(1);
    submission = row ?? null;
  }

  const prefill: PrefillContext = {
    company: companyId ? company : null,
    candidate: candidate ? { ...toPerson(candidate), rateAmount: candidate.rateAmount, rateUnit: candidate.rateUnit } : null,
    mandate: mandate
      ? {
          ...toMandate(mandate),
          location: mandate.location,
          remote: mandate.remote,
          workload: mandate.workload,
          startDate: mandate.startDate,
          endDate: mandate.endDate,
          rateSell: mandate.rateSell,
          rateUnit: mandate.rateUnit,
          portalRate: mandate.portalRate,
          portalRateUnit: mandate.portalRateUnit,
          description: mandate.description,
        }
      : null,
    submission,
    parent: parent ? { id: parent.id, number: parent.number, title: parent.title, template: parent.template, validFrom: parent.validFrom, signedAt: parent.signedAt } : null,
  };

  const usesMandateDates = templateId === "einzelauftrag" || templateId === "subunternehmer" || templateId === "beratung";
  const data = Object.fromEntries(Object.entries(template.prefill?.(prefill) ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== ""));
  return {
    common: {
      title: "",
      companyId,
      contactId,
      candidateId: candidate?.id ?? null,
      mandateId: mandate?.id ?? null,
      parentId: parent?.id ?? null,
      validFrom: template.dates.validFrom === null ? null : usesMandateDates ? (mandate?.startDate ?? null) : templateId === "rahmenvertrag" ? todayIso() : null,
      validUntil: template.dates.validUntil === null ? null : usesMandateDates ? (mandate?.endDate ?? null) : null,
      notes: null,
    },
    data,
  };
}

/** Facts for the checks in the Server Actions. */
export const linkLookup = { loadCompany, loadContact, loadCandidate, loadMandate, loadParent };
