import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { candidates, companies, contacts, mandates, submissions } from "../db/schema";
import { openMandateStatuses } from "../options";
import { likePattern, outerColumn, PAGE_SIZE } from "./query";

/** Queries of the mandate module (list, pipeline, detail, matching pool). */

export interface MandateFilter {
  q?: string;
  companyId?: number;
  priority?: string;
}

function filterWhere({ q, companyId, priority }: MandateFilter): SQL | undefined {
  const pattern = likePattern(q);
  // "M-0007" or "m7" finds the mandate by its display number.
  const number = q ? /^m-?0*(\d{1,9})$/i.exec(q.trim()) : null;
  return and(
    companyId ? eq(mandates.companyId, companyId) : undefined,
    priority ? eq(mandates.priority, priority) : undefined,
    pattern
      ? or(
          ilike(mandates.title, pattern),
          ilike(mandates.reference, pattern),
          ilike(mandates.endClient, pattern),
          ilike(companies.name, pattern),
          number ? eq(mandates.id, Number(number[1])) : undefined,
        )
      : undefined,
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
  submissionCount: sql<number>`(select count(*) from ${submissions} where ${submissions.mandateId} = ${outerColumn(mandates.id)})`.mapWith(Number),
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

/** Candidate columns that matching.ts needs (MatchCandidate), plus what the list shows and the firm. */
const matchColumns = {
  id: candidates.id,
  firstName: candidates.firstName,
  lastName: candidates.lastName,
  headline: candidates.headline,
  status: candidates.status,
  disciplines: candidates.disciplines,
  skills: candidates.skills,
  sapModules: candidates.sapModules,
  detectedSkills: candidates.detectedSkills,
  seniority: candidates.seniority,
  availableFrom: candidates.availableFrom,
  workloadMin: candidates.workloadMin,
  workloadMax: candidates.workloadMax,
  rateAmount: candidates.rateAmount,
  rateUnit: candidates.rateUnit,
  consentAt: candidates.consentAt,
  retentionUntil: candidates.retentionUntil,
  // The candidate's own firm: profiles are only passed on through it.
  firmId: companies.id,
  firmName: companies.name,
  firmKind: companies.kind,
  firmLegalForm: companies.legalForm,
};

export type MatchPoolCandidate = Awaited<ReturnType<typeof matchPool>>[number];

/** All candidates that can be matched (not archived). */
export async function matchPool() {
  const db = await getDb();
  return db
    .select(matchColumns)
    .from(candidates)
    .leftJoin(companies, eq(companies.id, candidates.companyId))
    .where(ne(candidates.status, "archiviert"));
}

/** One candidate with the matching columns, whatever its status. */
export async function matchCandidateRow(id: number) {
  const db = await getDb();
  const [row] = await db
    .select(matchColumns)
    .from(candidates)
    .leftJoin(companies, eq(companies.id, candidates.companyId))
    .where(eq(candidates.id, id))
    .limit(1);
  return row ?? null;
}
