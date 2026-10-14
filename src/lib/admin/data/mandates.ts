import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { companies, contacts, mandates } from "../db/schema";
import { openMandateStatuses } from "../options";
import { likePattern, PAGE_SIZE } from "./query";

/** Queries of the vacancies (table mandates): list, pipeline, detail. */

export interface MandateFilter {
  q?: string;
  companyId?: number;
  priority?: string;
}

/**
 * Search text condition for mandates. The mandate list and the global search (/admin/suche)
 * both use it, so "Alle anzeigen" in the search leads to the same hits. The query must
 * left-join companies on mandates.company_id.
 */
export function mandateSearchWhere(q: string | null | undefined): SQL | undefined {
  const pattern = likePattern(q);
  if (!pattern) return undefined;
  // "M-0007" or "m7" finds the vacancy by its display number.
  const number = /^m-?0*(\d{1,9})$/i.exec(q?.trim() ?? "");
  return or(
    ilike(mandates.title, pattern),
    ilike(mandates.reference, pattern),
    ilike(mandates.endClient, pattern),
    ilike(mandates.description, pattern),
    ilike(companies.name, pattern),
    number ? eq(mandates.id, Number(number[1])) : undefined,
  );
}

function filterWhere({ q, companyId, priority }: MandateFilter): SQL | undefined {
  return and(
    companyId ? eq(mandates.companyId, companyId) : undefined,
    priority ? eq(mandates.priority, priority) : undefined,
    mandateSearchWhere(q),
  );
}

const listColumns = {
  id: mandates.id,
  title: mandates.title,
  reference: mandates.reference,
  kind: mandates.kind,
  endClient: mandates.endClient,
  companyId: mandates.companyId,
  companyName: companies.name,
  startDate: mandates.startDate,
  workload: mandates.workload,
  rateSell: mandates.rateSell,
  rateUnit: mandates.rateUnit,
  deadline: mandates.deadline,
  status: mandates.status,
  priority: mandates.priority,
  nextStep: mandates.nextStep,
  nextStepAt: mandates.nextStepAt,
  closedAt: mandates.closedAt,
  appliedAt: mandates.appliedAt,
};

export type MandateListRow = Awaited<ReturnType<typeof listMandates>>["rows"][number];

/** Most urgent first: high priority, then the nearest deadline, then the newest. */
const urgencyOrder = [
  asc(sql`case ${mandates.priority} when 'hoch' then 0 when 'normal' then 1 else 2 end`),
  sql`${mandates.deadline} asc nulls last`,
  desc(mandates.createdAt),
];

export async function listMandates(filter: MandateFilter & { statuses: string[] | null; page: number }) {
  const db = await getDb();
  const where = and(filterWhere(filter), filter.statuses ? inArray(mandates.status, filter.statuses) : undefined);
  const openOnly = filter.statuses?.every((s) => (openMandateStatuses as readonly string[]).includes(s)) ?? false;
  const [rows, [total]] = await Promise.all([
    db
      .select(listColumns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .where(where)
      // Open work by urgency; decided mandates by when they were closed or last changed.
      .orderBy(...(openOnly ? urgencyOrder : [desc(sql`coalesce(${mandates.closedAt}, ${mandates.updatedAt})`), desc(mandates.id)]))
      .limit(PAGE_SIZE)
      .offset((filter.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(mandates).leftJoin(companies, eq(companies.id, mandates.companyId)).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

/** Number of mandates per status, with the same search and filters as the list. */
export async function mandateStatusCounts(filter: MandateFilter): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: mandates.status, n: count() })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(filterWhere(filter))
    .groupBy(mandates.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/** Open mandates for the pipeline board, most urgent first within each status. */
export async function listPipeline(filter: MandateFilter) {
  const db = await getDb();
  return db
    .select(listColumns)
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(and(filterWhere(filter), inArray(mandates.status, [...openMandateStatuses])))
    .orderBy(...urgencyOrder)
    .limit(400);
}

/** Companies that have mandates, for the list filter. */
export async function mandateCompanyOptions() {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ id: companies.id, name: companies.name })
    .from(companies)
    .innerJoin(mandates, eq(mandates.companyId, companies.id));
  return rows.sort((a, b) => a.name.localeCompare(b.name, "de")).map((r) => ({ value: r.id, label: r.name }));
}

export async function getMandate(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      mandate: mandates,
      companyName: companies.name,
      companyKind: companies.kind,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactRole: contacts.role,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .leftJoin(contacts, eq(contacts.id, mandates.contactId))
    .where(eq(mandates.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row.mandate,
    companyName: row.companyName,
    companyKind: row.companyKind,
    contact: row.contactLastName
      ? { firstName: row.contactFirstName, lastName: row.contactLastName, role: row.contactRole, email: row.contactEmail, phone: row.contactPhone }
      : null,
  };
}

export type MandateDetail = NonNullable<Awaited<ReturnType<typeof getMandate>>>;

/** The company of a contact, to check that a mandate's contact belongs to its company. */
export async function contactCompanyId(contactId: number): Promise<number | null> {
  const db = await getDb();
  const [row] = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return row?.companyId ?? null;
}

export async function companyExists(id: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, id)).limit(1);
  return Boolean(row);
}
