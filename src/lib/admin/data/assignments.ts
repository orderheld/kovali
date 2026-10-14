import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { assignments, companies, contacts, contracts, documents, mandates } from "../db/schema";
import { everyWord } from "./words";

/** Queries of the assignments (Aufträge): list, detail, linked contracts, prefill from a vacancy. */

export const assignmentStatusFilters = ["laufend", "geplant", "beendet", "alle"] as const;
export type AssignmentStatusFilter = (typeof assignmentStatusFilters)[number];

/** Columns the lists and the earnings engine need. */
const listColumns = {
  id: assignments.id,
  title: assignments.title,
  status: assignments.status,
  companyId: assignments.companyId,
  companyName: companies.name,
  endClient: assignments.endClient,
  startDate: assignments.startDate,
  endDate: assignments.endDate,
  workload: assignments.workload,
  rateAmount: assignments.rateAmount,
  rateUnit: assignments.rateUnit,
  billing: assignments.billing,
  rateBasis: assignments.rateBasis,
  hoursPerMonth: assignments.hoursPerMonth,
  expensesMonthly: assignments.expensesMonthly,
};

export type AssignmentListRow = Awaited<ReturnType<typeof listAssignments>>[number];

/**
 * Search text condition, word by word: every word in title, end client, location, notes or the
 * company's name; "A-0003" or "a3" also finds the assignment by its display number. The list
 * and the global search (/admin/suche) both use it. The query must left-join companies on
 * assignments.company_id.
 */
export function assignmentSearchWhere(q: string | null | undefined): SQL | undefined {
  const words = everyWord(q, (pattern) =>
    or(
      ilike(assignments.title, pattern),
      ilike(assignments.endClient, pattern),
      ilike(assignments.location, pattern),
      ilike(assignments.notes, pattern),
      ilike(companies.name, pattern),
    ),
  );
  if (!words) return undefined;
  const number = /^a\s*-?\s*0*(\d{1,9})$/i.exec(q?.trim() ?? "");
  return number ? or(words, eq(assignments.id, Number(number[1]))) : words;
}

/** Running ones by end date, planned ones by start, finished ones newest first. */
const listOrder = [
  asc(sql`case ${assignments.status} when 'laufend' then 0 when 'geplant' then 1 else 2 end`),
  sql`case when ${assignments.status} = 'beendet' then null else coalesce(${assignments.endDate}, ${assignments.startDate}) end asc nulls last`,
  sql`${assignments.endDate} desc nulls first`,
  desc(assignments.id),
];

export async function listAssignments({ status, q }: { status: AssignmentStatusFilter; q?: string }) {
  const db = await getDb();
  return db
    .select(listColumns)
    .from(assignments)
    .leftJoin(companies, eq(companies.id, assignments.companyId))
    .where(and(status === "alle" ? undefined : eq(assignments.status, status), assignmentSearchWhere(q)))
    .orderBy(...listOrder)
    .limit(500);
}

/** Number of assignments per status. */
export async function assignmentStatusCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select({ status: assignments.status, n: count() }).from(assignments).groupBy(assignments.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/** Running assignments with their company, for the dashboard. */
export async function runningAssignments() {
  const db = await getDb();
  return db
    .select(listColumns)
    .from(assignments)
    .leftJoin(companies, eq(companies.id, assignments.companyId))
    .where(eq(assignments.status, "laufend"))
    .orderBy(sql`${assignments.endDate} asc nulls last`, asc(assignments.id));
}

export async function getAssignment(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      assignment: assignments,
      companyName: companies.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactRole: contacts.role,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      mandateTitle: mandates.title,
      mandateStatus: mandates.status,
    })
    .from(assignments)
    .leftJoin(companies, eq(companies.id, assignments.companyId))
    .leftJoin(contacts, eq(contacts.id, assignments.contactId))
    .leftJoin(mandates, eq(mandates.id, assignments.mandateId))
    .where(eq(assignments.id, id))
    .limit(1);
  return row ?? null;
}

export type AssignmentDetail = NonNullable<Awaited<ReturnType<typeof getAssignment>>>;

/** Contracts filed for an assignment (contracts.assignment_id), newest validity first. */
export async function assignmentContracts(id: number) {
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
      noticePeriod: contracts.noticePeriod,
    })
    .from(contracts)
    .where(eq(contracts.assignmentId, id))
    .orderBy(sql`${contracts.validFrom} desc nulls last`, desc(contracts.id));
}

/** What deleting an assignment takes along (documents, notes) and detaches (contracts). */
export async function assignmentDeleteImpact(id: number) {
  const db = await getDb();
  const [[d], [c]] = await Promise.all([
    db.select({ n: count() }).from(documents).where(eq(documents.assignmentId, id)),
    db.select({ n: count() }).from(contracts).where(eq(contracts.assignmentId, id)),
  ]);
  return { documents: d?.n ?? 0, contracts: c?.n ?? 0 };
}

/** Values for a new assignment taken from the vacancy it came from (/admin/auftraege/neu?vakanz=3). */
export async function vacancyPrefill(mandateId: number) {
  const db = await getDb();
  const [m] = await db
    .select({
      id: mandates.id,
      title: mandates.title,
      companyId: mandates.companyId,
      contactId: mandates.contactId,
      endClient: mandates.endClient,
      rateSell: mandates.rateSell,
      rateUnit: mandates.rateUnit,
      workload: mandates.workload,
      startDate: mandates.startDate,
      endDate: mandates.endDate,
      location: mandates.location,
      remote: mandates.remote,
    })
    .from(mandates)
    .where(eq(mandates.id, mandateId))
    .limit(1);
  if (!m) return null;
  return {
    title: m.title,
    companyId: m.companyId,
    contactId: m.contactId,
    mandateId: m.id,
    endClient: m.endClient,
    rateAmount: m.rateSell,
    rateUnit: m.rateUnit === "tag" ? "tag" : "stunde",
    workload: m.workload && m.workload >= 1 && m.workload <= 100 ? m.workload : 100,
    startDate: m.startDate,
    endDate: m.endDate,
    location: m.location,
    remote: m.remote,
  };
}

/** Assignments already created from this vacancy, so the new-assignment page can warn about a second one. */
export async function assignmentsOfVacancy(mandateId: number) {
  const db = await getDb();
  return db.select({ id: assignments.id, title: assignments.title }).from(assignments).where(eq(assignments.mandateId, mandateId)).orderBy(asc(assignments.id));
}
