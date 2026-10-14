import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { assignments, companies, contacts, contracts, mandates, snippets } from "../db/schema";
import { openMandateStatuses } from "../options";
import { outerColumn, PAGE_SIZE } from "./query";
import { everyWord } from "./words";

/** Queries of the companies (/admin/firmen): list with counts, detail with everything linked. */

/**
 * Search text condition for companies: every word in name, legal name, city, industry or
 * e-mail, or the UID (also typed without dots, e.g. "CHE123456789"). The list and the global
 * search (/admin/suche) both use it, so "Alle anzeigen" there leads to the same hits.
 */
export function companySearchWhere(q: string | null | undefined): SQL | undefined {
  const words = everyWord(q, (pattern) =>
    or(
      ilike(companies.name, pattern),
      ilike(companies.legalName, pattern),
      ilike(companies.city, pattern),
      ilike(companies.industry, pattern),
      ilike(companies.email, pattern),
      ilike(companies.uid, pattern),
    ),
  );
  if (!words) return undefined;
  const digits = (q ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? or(words, sql`regexp_replace(coalesce(${companies.uid}, ''), '[^0-9]', '', 'g') like ${`%${digits}%`}`) : words;
}

/** Correlated count of rows in `table` that belong to the company of the current row. */
function countFor(table: typeof contacts | typeof mandates | typeof assignments | typeof contracts, condition?: SQL) {
  return sql<number>`(select count(*) from ${table} where ${table.companyId} = ${outerColumn(companies.id)}${condition ? sql` and ${condition}` : sql``})`.mapWith(Number);
}

export async function listCompanies({ q, kind, page }: { q?: string; kind?: string; page: number }) {
  const db = await getDb();
  const where = and(kind ? eq(companies.kind, kind) : undefined, companySearchWhere(q));
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        legalName: companies.legalName,
        kind: companies.kind,
        city: companies.city,
        status: companies.status,
        contacts: countFor(contacts),
        openMandates: countFor(mandates, inArray(mandates.status, [...openMandateStatuses])),
        runningAssignments: countFor(assignments, eq(assignments.status, "laufend")),
        contracts: countFor(contracts),
      })
      .from(companies)
      .where(where)
      .orderBy(asc(companies.status), asc(sql`lower(${companies.name})`))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(companies).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export async function kindCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select({ kind: companies.kind, n: count() }).from(companies).groupBy(companies.kind);
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

export async function getCompany(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return row ?? null;
}

/**
 * Everything linked to a company for its detail page: vacancies (open ones first),
 * assignments (running first), contracts (in force first) and its text snippets.
 */
export async function companyRecords(id: number) {
  const db = await getDb();
  const [vacancyRows, assignmentRows, contractRows, snippetRows] = await Promise.all([
    db
      .select({
        id: mandates.id,
        title: mandates.title,
        reference: mandates.reference,
        status: mandates.status,
        appliedAt: mandates.appliedAt,
        nextStep: mandates.nextStep,
        nextStepAt: mandates.nextStepAt,
        endClient: mandates.endClient,
      })
      .from(mandates)
      .where(eq(mandates.companyId, id))
      .orderBy(sql`case when ${inArray(mandates.status, [...openMandateStatuses])} then 0 else 1 end`, desc(mandates.createdAt), desc(mandates.id))
      .limit(100),
    db
      .select({
        id: assignments.id,
        title: assignments.title,
        status: assignments.status,
        endClient: assignments.endClient,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
      })
      .from(assignments)
      .where(eq(assignments.companyId, id))
      .orderBy(sql`case ${assignments.status} when 'laufend' then 0 when 'geplant' then 1 else 2 end`, sql`${assignments.startDate} desc nulls last`, desc(assignments.id))
      .limit(100),
    db
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
      .where(eq(contracts.companyId, id))
      .orderBy(sql`case ${contracts.status} when 'unterzeichnet' then 0 when 'versendet' then 1 when 'entwurf' then 2 else 3 end`, sql`${contracts.validFrom} desc nulls last`, desc(contracts.id))
      .limit(100),
    db
      .select({ id: snippets.id, title: snippets.title, category: snippets.category, body: snippets.body, pinned: snippets.pinned })
      .from(snippets)
      .where(eq(snippets.companyId, id))
      .orderBy(desc(snippets.pinned), asc(sql`lower(${snippets.title})`), asc(snippets.id))
      .limit(100),
  ]);
  return { vacancies: vacancyRows, assignments: assignmentRows, contracts: contractRows, snippets: snippetRows };
}

/** What deleting a company detaches (on delete set null): its vacancies, assignments and contracts keep their data. */
export async function companyDeleteImpact(id: number) {
  const db = await getDb();
  const [[m], [a], [c]] = await Promise.all([
    db.select({ n: count() }).from(mandates).where(eq(mandates.companyId, id)),
    db.select({ n: count() }).from(assignments).where(eq(assignments.companyId, id)),
    db.select({ n: count() }).from(contracts).where(eq(contracts.companyId, id)),
  ]);
  return { mandates: m?.n ?? 0, assignments: a?.n ?? 0, contracts: c?.n ?? 0 };
}

export async function getContact(companyId: number, contactId: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function listContacts(companyId: number) {
  const db = await getDb();
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId))
    .orderBy(asc(sql`lower(${contacts.lastName})`), asc(contacts.id));
}

/** Choices for select fields in other modules (vacancies, assignments, contracts, snippets). */
export async function companyOptions(kinds?: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ id: companies.id, name: companies.name, kind: companies.kind, status: companies.status })
    .from(companies)
    .where(kinds?.length ? inArray(companies.kind, kinds) : undefined)
    .orderBy(asc(sql`lower(${companies.name})`));
  return rows.map((r) => ({ value: r.id, label: r.status === "inaktiv" ? `${r.name} (inaktiv)` : r.name, kind: r.kind }));
}

/** All contacts with their company, for select fields. */
export async function contactOptions() {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      role: contacts.role,
      company: companies.name,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .orderBy(asc(sql`lower(${companies.name})`), asc(sql`lower(${contacts.lastName})`));
  return rows.map((r) => ({
    value: r.id,
    companyId: r.companyId,
    label: `${[r.firstName, r.lastName].filter(Boolean).join(" ")}${r.role ? `, ${r.role}` : ""} (${r.company})`,
  }));
}
