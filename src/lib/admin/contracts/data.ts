import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { outerColumn, PAGE_SIZE } from "../data/query";
import { everyWord } from "../data/words";
import { getDb } from "../db/client";
import { assignments, companies, contacts, contracts, documents, mandates } from "../db/schema";
import { addDaysIso, displayNo, todayIso } from "../format";
import { closedContractStatuses, CONTRACT_ENDING_DAYS } from "./expiry";
import { nextContractNumber } from "./numbering";

/** Queries of the contract filing cabinet (/admin/vertraege): list, detail, form choices. */

export interface ContractFilter {
  q?: string;
  /** contracts.template, the kind of contract. */
  kind?: string;
  /** Only open contracts that end within CONTRACT_ENDING_DAYS. */
  ending?: boolean;
}

/**
 * Search text condition for contracts: every word in number, title, notes, notice period or
 * the company's name. The list and the global search (/admin/suche) both use it, so "Alle
 * anzeigen" there leads to the same hits. The query must left-join companies on
 * contracts.company_id.
 */
export function contractSearchWhere(q: string | null | undefined): SQL | undefined {
  return everyWord(q, (pattern) =>
    or(
      ilike(contracts.number, pattern),
      ilike(contracts.title, pattern),
      ilike(contracts.notes, pattern),
      ilike(contracts.noticePeriod, pattern),
      ilike(companies.name, pattern),
      ilike(companies.legalName, pattern),
    ),
  );
}

/** Open contracts whose validity ends between today and today + `days`. */
export function endingWhere(today: string, days = CONTRACT_ENDING_DAYS): SQL {
  return and(
    notInArray(contracts.status, [...closedContractStatuses]),
    gte(contracts.validUntil, today),
    lte(contracts.validUntil, addDaysIso(today, days)),
  )!;
}

function filterWhere({ q, kind, ending }: ContractFilter, today: string): SQL | undefined {
  return and(kind ? eq(contracts.template, kind) : undefined, ending ? endingWhere(today) : undefined, contractSearchWhere(q));
}

/** Contracts that need attention first (in review, out for signature), then by start, newest first. */
const listOrder = [
  sql`case ${contracts.status} when 'entwurf' then 0 when 'versendet' then 1 when 'unterzeichnet' then 2 else 3 end`,
  sql`coalesce(${contracts.validFrom}, ${contracts.signedAt}, ${contracts.createdAt}::date) desc`,
  desc(contracts.id),
];

export async function listContracts(filter: ContractFilter & { status?: string; page: number }, today = todayIso()) {
  const db = await getDb();
  const where = and(filterWhere(filter, today), filter.status ? eq(contracts.status, filter.status) : undefined);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: contracts.id,
        number: contracts.number,
        title: contracts.title,
        kind: contracts.template,
        status: contracts.status,
        validFrom: contracts.validFrom,
        validUntil: contracts.validUntil,
        signedAt: contracts.signedAt,
        companyId: contracts.companyId,
        companyName: companies.name,
        assignmentId: contracts.assignmentId,
        assignmentTitle: assignments.title,
        files: sql<number>`(select count(*) from ${documents} where ${documents.contractId} = ${outerColumn(contracts.id)})`.mapWith(Number),
      })
      .from(contracts)
      .leftJoin(companies, eq(companies.id, contracts.companyId))
      .leftJoin(assignments, eq(assignments.id, contracts.assignmentId))
      .where(where)
      .orderBy(...listOrder)
      .limit(PAGE_SIZE)
      .offset((filter.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(contracts).leftJoin(companies, eq(companies.id, contracts.companyId)).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export type ContractListRow = Awaited<ReturnType<typeof listContracts>>["rows"][number];

/** Number of contracts per status, with the same search and filters as the list. */
export async function contractStatusCounts(filter: ContractFilter, today = todayIso()): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: contracts.status, n: count() })
    .from(contracts)
    .leftJoin(companies, eq(companies.id, contracts.companyId))
    .where(filterWhere(filter, today))
    .groupBy(contracts.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/** Kinds that occur in the database, also old ones no longer offered (for the list filter). */
export async function usedContractKinds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.selectDistinct({ kind: contracts.template }).from(contracts);
  return rows.map((r) => r.kind);
}

/** Open contracts ending within `days`, soonest first (dashboard, list notice). */
export async function listEndingContracts(today = todayIso(), days = CONTRACT_ENDING_DAYS, limit = 10) {
  const db = await getDb();
  return db
    .select({
      id: contracts.id,
      number: contracts.number,
      title: contracts.title,
      kind: contracts.template,
      status: contracts.status,
      validUntil: contracts.validUntil,
      noticePeriod: contracts.noticePeriod,
      companyName: companies.name,
    })
    .from(contracts)
    .leftJoin(companies, eq(companies.id, contracts.companyId))
    .where(endingWhere(today, days))
    .orderBy(asc(contracts.validUntil), asc(contracts.id))
    .limit(limit);
}

export async function countEndingContracts(today = todayIso(), days = CONTRACT_ENDING_DAYS): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(contracts).where(endingWhere(today, days));
  return row?.n ?? 0;
}

export async function getContract(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return row ?? null;
}

const parents = alias(contracts, "parent");

/** A contract with the names of everything it links to. */
export async function getContractDetail(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      contract: contracts,
      company: { id: companies.id, name: companies.name, legalName: companies.legalName },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        role: contacts.role,
        email: contacts.email,
        phone: contacts.phone,
      },
      assignment: { id: assignments.id, title: assignments.title, status: assignments.status, endClient: assignments.endClient },
      mandate: { id: mandates.id, title: mandates.title, status: mandates.status },
      parent: { id: parents.id, number: parents.number, title: parents.title, status: parents.status },
    })
    .from(contracts)
    .leftJoin(companies, eq(companies.id, contracts.companyId))
    .leftJoin(contacts, eq(contacts.id, contracts.contactId))
    .leftJoin(assignments, eq(assignments.id, contracts.assignmentId))
    .leftJoin(mandates, eq(mandates.id, contracts.mandateId))
    .leftJoin(parents, eq(parents.id, contracts.parentId))
    .where(eq(contracts.id, id))
    .limit(1);
  if (!row) return null;
  // Drizzle returns the nested object with null fields when a left join finds nothing.
  return {
    ...row.contract,
    company: row.company?.id ? row.company : null,
    contact: row.contact?.id ? row.contact : null,
    assignment: row.assignment?.id ? row.assignment : null,
    mandate: row.mandate?.id ? row.mandate : null,
    parent: row.parent?.id ? row.parent : null,
  };
}

export type ContractDetail = NonNullable<Awaited<ReturnType<typeof getContractDetail>>>;

/** Contracts filed under a Rahmenvertrag. */
export async function listChildContracts(parentId: number) {
  const db = await getDb();
  return db
    .select({
      id: contracts.id,
      number: contracts.number,
      title: contracts.title,
      kind: contracts.template,
      status: contracts.status,
      validFrom: contracts.validFrom,
      validUntil: contracts.validUntil,
    })
    .from(contracts)
    .where(eq(contracts.parentId, parentId))
    .orderBy(sql`${contracts.validFrom} desc nulls last`, desc(contracts.id));
}

export async function countContractDocuments(contractId: number): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(documents).where(eq(documents.contractId, contractId));
  return row?.n ?? 0;
}

/** The number the next contract of `year` will get (shown in the form; the insert decides). */
export async function upcomingContractNumber(year: number): Promise<string> {
  const db = await getDb();
  const rows = await db
    .select({ number: contracts.number })
    .from(contracts)
    .where(sql`${contracts.number} like ${`V-${year}-%`}`);
  return nextContractNumber(
    year,
    rows.map((r) => r.number),
  );
}

/**
 * Choices of the contract form. Contacts, assignments and Rahmenverträge carry their company,
 * so the form can narrow them down to the chosen company.
 */
export async function contractFormOptions(excludeId?: number) {
  const db = await getDb();
  const [companyRows, contactRows, assignmentRows, frameworkRows] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name, status: companies.status })
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
      .orderBy(desc(contacts.isSignatory), asc(sql`lower(${contacts.lastName})`), asc(contacts.id)),
    db
      .select({
        id: assignments.id,
        title: assignments.title,
        status: assignments.status,
        companyId: assignments.companyId,
        contactId: assignments.contactId,
        company: companies.name,
      })
      .from(assignments)
      .leftJoin(companies, eq(companies.id, assignments.companyId))
      .orderBy(sql`case ${assignments.status} when 'laufend' then 0 when 'geplant' then 1 else 2 end`, sql`${assignments.startDate} desc nulls last`, desc(assignments.id)),
    db
      .select({ id: contracts.id, number: contracts.number, title: contracts.title, companyId: contracts.companyId, status: contracts.status })
      .from(contracts)
      .where(and(eq(contracts.template, "rahmenvertrag"), ne(contracts.status, "storniert"), excludeId ? ne(contracts.id, excludeId) : undefined))
      .orderBy(desc(contracts.validFrom), desc(contracts.id)),
  ]);
  return {
    companies: companyRows.map((c) => ({ value: c.id, label: c.status === "inaktiv" ? `${c.name} (inaktiv)` : c.name })),
    contacts: contactRows.map((c) => ({
      value: c.id,
      companyId: c.companyId,
      isSignatory: c.isSignatory,
      label: `${[c.firstName, c.lastName].filter(Boolean).join(" ")}${c.role ? `, ${c.role}` : ""}${c.isSignatory ? " (zeichnungsberechtigt)" : ""}`,
    })),
    assignments: assignmentRows.map((a) => ({
      value: a.id,
      companyId: a.companyId,
      contactId: a.contactId,
      title: a.title,
      label: `${displayNo.assignment(a.id)} ${a.title}${a.company ? ` (${a.company})` : ""}${a.status === "beendet" ? ", beendet" : ""}`,
    })),
    frameworks: frameworkRows.map((p) => ({
      value: p.id,
      companyId: p.companyId,
      label: `${p.number} ${p.title}${p.status === "beendet" ? " (beendet)" : ""}`,
    })),
  };
}

export type ContractFormOptions = Awaited<ReturnType<typeof contractFormOptions>>;

/** The values of the contract form (new or existing contract). */
export interface ContractFormValues {
  title: string;
  kind: string | null;
  status: string;
  companyId: number | null;
  contactId: number | null;
  assignmentId: number | null;
  parentId: number | null;
  validFrom: string | null;
  validUntil: string | null;
  signedAt: string | null;
  noticePeriod: string | null;
  notes: string | null;
}

export const emptyContractValues: ContractFormValues = {
  title: "",
  kind: null,
  status: "entwurf",
  companyId: null,
  contactId: null,
  assignmentId: null,
  parentId: null,
  validFrom: null,
  validUntil: null,
  signedAt: null,
  noticePeriod: null,
  notes: null,
};

async function signatoryOf(companyId: number): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isSignatory, true)))
    .orderBy(asc(contacts.id))
    .limit(1);
  return row?.id ?? null;
}

/** The newest Rahmenvertrag of a company that still applies. */
async function currentFramework(companyId: number): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(and(eq(contracts.companyId, companyId), eq(contracts.template, "rahmenvertrag"), inArray(contracts.status, ["unterzeichnet", "versendet", "entwurf"])))
    .orderBy(sql`case ${contracts.status} when 'unterzeichnet' then 0 when 'versendet' then 1 else 2 end`, sql`${contracts.validFrom} desc nulls last`, desc(contracts.id))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Values for a new contract opened from another record: ?auftrag= (an assignment: its
 * company, contact, title and period; Einzelauftrag or, on payroll, Arbeitsvertrag),
 * ?firma= (a company and its signatory) or ?rahmen= (an Einzelauftrag under a Rahmenvertrag).
 */
export async function contractPrefill(params: { auftrag?: number | null; firma?: number | null; rahmen?: number | null }): Promise<ContractFormValues> {
  const db = await getDb();
  const values: ContractFormValues = { ...emptyContractValues };

  if (params.rahmen) {
    const [parent] = await db
      .select({ id: contracts.id, companyId: contracts.companyId, contactId: contracts.contactId, template: contracts.template })
      .from(contracts)
      .where(eq(contracts.id, params.rahmen))
      .limit(1);
    if (parent?.template === "rahmenvertrag") {
      Object.assign(values, { kind: "einzelauftrag", parentId: parent.id, companyId: parent.companyId, contactId: parent.contactId });
    }
  }

  if (params.auftrag) {
    const [a] = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        endClient: assignments.endClient,
        companyId: assignments.companyId,
        contactId: assignments.contactId,
        billing: assignments.billing,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
      })
      .from(assignments)
      .where(eq(assignments.id, params.auftrag))
      .limit(1);
    if (a) {
      values.assignmentId = a.id;
      values.title = a.endClient ? `${a.title}, ${a.endClient}` : a.title;
      values.kind ??= a.billing === "lohn" ? "arbeitsvertrag" : "einzelauftrag";
      values.validFrom = a.startDate;
      values.validUntil = a.endDate;
      if (values.companyId === null) {
        values.companyId = a.companyId;
        values.contactId = a.contactId;
      }
    }
  }

  if (params.firma && values.companyId === null) {
    const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, params.firma)).limit(1);
    if (company) values.companyId = company.id;
  }

  if (values.companyId !== null) {
    values.contactId ??= await signatoryOf(values.companyId);
    // An Einzelauftrag usually belongs to the company's Rahmenvertrag.
    if (values.parentId === null && values.kind === "einzelauftrag") values.parentId = await currentFramework(values.companyId);
  }
  return values;
}

/** What the server action checks the links against (see rules.ts). */
export async function loadLinkFacts(ids: { companyId: number | null; contactId: number | null; assignmentId: number | null; parentId: number | null }) {
  const db = await getDb();
  const [company, contact, assignment, parent] = await Promise.all([
    ids.companyId ? db.select({ id: companies.id }).from(companies).where(eq(companies.id, ids.companyId)).limit(1) : [],
    ids.contactId ? db.select({ id: contacts.id, companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, ids.contactId)).limit(1) : [],
    ids.assignmentId ? db.select({ id: assignments.id }).from(assignments).where(eq(assignments.id, ids.assignmentId)).limit(1) : [],
    ids.parentId
      ? db.select({ id: contracts.id, template: contracts.template, companyId: contracts.companyId }).from(contracts).where(eq(contracts.id, ids.parentId)).limit(1)
      : [],
  ]);
  return { company: company[0] ?? null, contact: contact[0] ?? null, assignment: assignment[0] ?? null, parent: parent[0] ?? null };
}
