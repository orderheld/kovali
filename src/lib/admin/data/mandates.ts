import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { activities, assignments, companies, contacts, contracts, documents, mandates } from "../db/schema";
import { addDaysIso, todayIso } from "../format";
import { mandateStatuses, openMandateStatuses } from "../options";
import { statusChange } from "../vacancy-rules";
import { PAGE_SIZE } from "./query";
import { everyWord } from "./words";

/**
 * Vacancies (Vakanzen, table mandates): list, counts, due next steps, detail, and the writes
 * behind the forms and quick actions. Status rules live in vacancy-rules.ts.
 */

export interface MandateFilter {
  q?: string;
  companyId?: number;
  priority?: string;
}

/**
 * Search text condition for vacancies. The vacancy list and the global search (/admin/suche)
 * both use it, so "Alle anzeigen" in the search leads to the same hits. The query must
 * left-join companies on mandates.company_id.
 */
export function mandateSearchWhere(q: string | null | undefined): SQL | undefined {
  // Every word has to occur somewhere: "SAP Basel" finds an SAP vacancy in Basel.
  const words = everyWord(q, (pattern) =>
    or(
      ilike(mandates.title, pattern),
      ilike(mandates.reference, pattern),
      ilike(mandates.endClient, pattern),
      ilike(mandates.description, pattern),
      ilike(mandates.location, pattern),
      sql`array_to_string(${mandates.requiredSkills}, ' ') ilike ${pattern}`,
      ilike(companies.name, pattern),
    ),
  );
  if (!words) return undefined;
  // "M-0007" or "m7" finds the vacancy by its display number.
  const number = /^m\s*-?\s*0*(\d{1,9})$/i.exec(q?.trim() ?? "");
  return number ? or(words, eq(mandates.id, Number(number[1]))) : words;
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
  url: mandates.url,
  endClient: mandates.endClient,
  companyId: mandates.companyId,
  companyName: companies.name,
  location: mandates.location,
  remote: mandates.remote,
  startDate: mandates.startDate,
  workload: mandates.workload,
  rateSell: mandates.rateSell,
  rateUnit: mandates.rateUnit,
  deadline: mandates.deadline,
  appliedAt: mandates.appliedAt,
  status: mandates.status,
  priority: mandates.priority,
  nextStep: mandates.nextStep,
  nextStepAt: mandates.nextStepAt,
  closedAt: mandates.closedAt,
};

export type MandateListRow = Awaited<ReturnType<typeof listMandates>>["rows"][number];

const statusOrder = sql.raw(`case mandates.status ${mandateStatuses.map((s, i) => `when '${s.value}' then ${i}`).join(" ")} else ${mandateStatuses.length} end`);
const openStatusList = sql.join(
  openMandateStatuses.map((s) => sql`${s}`),
  sql`, `,
);

/**
 * Pipeline order: by status (Entdeckt to Pausiert). Open vacancies by urgency: high priority,
 * then the nearest next step or deadline, then the most recently changed. Decided ones by when
 * they were closed or last changed.
 */
const listOrder = [
  asc(statusOrder),
  asc(sql`case when ${mandates.status} in (${openStatusList}) then (case ${mandates.priority} when 'hoch' then 0 when 'normal' then 1 else 2 end) else 0 end`),
  sql`case when ${mandates.status} in (${openStatusList}) then least(${mandates.nextStepAt}, ${mandates.deadline}) end asc nulls last`,
  desc(sql`coalesce(${mandates.closedAt}, ${mandates.updatedAt})`),
  desc(mandates.id),
];

export async function listMandates(filter: MandateFilter & { statuses: string[] | null; page: number }) {
  const db = await getDb();
  const where = and(filterWhere(filter), filter.statuses ? inArray(mandates.status, filter.statuses) : undefined);
  const [rows, [total]] = await Promise.all([
    db
      .select(listColumns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .where(where)
      .orderBy(...listOrder)
      .limit(PAGE_SIZE)
      .offset((filter.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(mandates).leftJoin(companies, eq(companies.id, mandates.companyId)).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

/** Number of vacancies per status, with the same search and filters as the list. */
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

/** Open vacancies whose next step is due within `days` (overdue ones first). */
export async function dueNextSteps({ today = todayIso(), days = 3, limit = 20 }: { today?: string; days?: number; limit?: number } = {}) {
  const db = await getDb();
  return db
    .select({
      id: mandates.id,
      title: mandates.title,
      status: mandates.status,
      nextStep: mandates.nextStep,
      nextStepAt: mandates.nextStepAt,
      companyName: companies.name,
    })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(and(inArray(mandates.status, [...openMandateStatuses]), isNotNull(mandates.nextStepAt), lte(mandates.nextStepAt, addDaysIso(today, days))))
    .orderBy(asc(mandates.nextStepAt), asc(mandates.id))
    .limit(limit);
}

/** Skills used in earlier vacancies, as suggestions in the form. */
export async function skillSuggestions(limit = 300): Promise<string[]> {
  const db = await getDb();
  const rows = await db.execute<{ skill: string }>(
    sql`select min(s) as skill from (select unnest(${mandates.requiredSkills}) as s from ${mandates}) t group by lower(s) order by count(*) desc, lower(min(s)) limit ${limit}`,
  );
  return rows.rows.map((r) => r.skill);
}

/** Companies that have vacancies, for the list filter. */
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

/** Assignments that came from a vacancy (assignments.mandate_id). */
export async function vacancyAssignments(mandateId: number) {
  const db = await getDb();
  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      status: assignments.status,
      startDate: assignments.startDate,
      endDate: assignments.endDate,
      companyName: companies.name,
    })
    .from(assignments)
    .leftJoin(companies, eq(companies.id, assignments.companyId))
    .where(eq(assignments.mandateId, mandateId))
    .orderBy(desc(assignments.startDate), desc(assignments.id));
}

/** What deleting a vacancy touches: its documents go with it, assignments and contracts lose the link. */
export async function mandateDeleteImpact(id: number) {
  const db = await getDb();
  const [[a], [c], [d]] = await Promise.all([
    db.select({ n: count() }).from(assignments).where(eq(assignments.mandateId, id)),
    db.select({ n: count() }).from(contracts).where(eq(contracts.mandateId, id)),
    db.select({ n: count() }).from(documents).where(eq(documents.mandateId, id)),
  ]);
  return { assignments: a?.n ?? 0, contracts: c?.n ?? 0, documents: d?.n ?? 0 };
}

/** The company of a contact, to check that a vacancy's contact belongs to its company. */
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

// --- Writes ------------------------------------------------------------------------

/** The fields the vacancy form writes (vakanzen/schema.ts). Other columns stay untouched. */
export type MandateValues = Pick<
  typeof mandates.$inferInsert,
  | "kind"
  | "title"
  | "companyId"
  | "contactId"
  | "reference"
  | "url"
  | "endClient"
  | "description"
  | "requiredSkills"
  | "location"
  | "remote"
  | "workload"
  | "startDate"
  | "endDate"
  | "durationText"
  | "rateSell"
  | "rateUnit"
  | "deadline"
  | "source"
  | "priority"
  | "nextStep"
  | "nextStepAt"
  | "notes"
  | "applicationText"
> & { status: string; appliedAt: string | null };

/** Creates a vacancy. A new vacancy saved as "Beworben" without a date was applied for today. */
export async function insertMandate(values: MandateValues, now = new Date(), today = todayIso(now)): Promise<{ id: number; appliedAt: string | null }> {
  const db = await getDb();
  const state = statusChange({ status: "neu", appliedAt: values.appliedAt, closedAt: null }, values.status, today, now);
  const [row] = await db
    .insert(mandates)
    .values({ ...values, appliedAt: state.appliedAt, closedAt: state.closedAt })
    .returning({ id: mandates.id, appliedAt: mandates.appliedAt });
  return row;
}

/** Saves the form. Returns the status before, or null when the vacancy is gone. */
export async function updateMandate(id: number, values: MandateValues, now = new Date(), today = todayIso(now)): Promise<{ previousStatus: string } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: mandates.status, closedAt: mandates.closedAt })
      .from(mandates)
      .where(eq(mandates.id, id))
      .for("update")
      .limit(1);
    if (!current) return null;
    const state = statusChange({ status: current.status, appliedAt: values.appliedAt, closedAt: current.closedAt }, values.status, today, now);
    await tx
      .update(mandates)
      .set({ ...values, appliedAt: state.appliedAt, closedAt: state.closedAt, updatedAt: now })
      .where(eq(mandates.id, id));
    return { previousStatus: current.status };
  });
}

/** Quick status change. Null when the vacancy is gone; `changed` is false when nothing changed. */
export async function changeMandateStatus(
  id: number,
  status: string,
  now = new Date(),
  today = todayIso(now),
): Promise<{ changed: boolean; from: string; to: string; appliedAt: string | null; appliedNow: boolean } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: mandates.status, appliedAt: mandates.appliedAt, closedAt: mandates.closedAt })
      .from(mandates)
      .where(eq(mandates.id, id))
      .for("update")
      .limit(1);
    if (!current) return null;
    if (current.status === status) return { changed: false, from: current.status, to: status, appliedAt: current.appliedAt, appliedNow: false };
    const state = statusChange(current, status, today, now);
    await tx.update(mandates).set({ status: state.status, appliedAt: state.appliedAt, closedAt: state.closedAt, updatedAt: now }).where(eq(mandates.id, id));
    return { changed: true, from: current.status, to: status, appliedAt: state.appliedAt, appliedNow: !current.appliedAt && Boolean(state.appliedAt) };
  });
}

/** Sets or clears the next step. Returns the previous one, or null when the vacancy is gone. */
export async function setMandateNextStep(
  id: number,
  next: { nextStep: string | null; nextStepAt: string | null },
  now = new Date(),
): Promise<{ nextStep: string | null; nextStepAt: string | null } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ nextStep: mandates.nextStep, nextStepAt: mandates.nextStepAt })
      .from(mandates)
      .where(eq(mandates.id, id))
      .for("update")
      .limit(1);
    if (!current) return null;
    await tx.update(mandates).set({ ...next, updatedAt: now }).where(eq(mandates.id, id));
    return current;
  });
}

/**
 * Deletes a vacancy. Its notes and documents go with it (on delete cascade); assignments and
 * contracts keep their data and lose the link. History entries that also belong to a company,
 * contract or assignment only lose the vacancy, so they stay on those records.
 */
export async function deleteMandate(id: number): Promise<{ id: number; title: string; companyId: number | null } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ id: mandates.id }).from(mandates).where(eq(mandates.id, id)).for("update").limit(1);
    if (!row) return null;
    await tx
      .update(activities)
      .set({ mandateId: null })
      .where(and(eq(activities.mandateId, id), sql`num_nonnulls(${activities.companyId}, ${activities.contractId}, ${activities.assignmentId}) > 0`));
    const [deleted] = await tx
      .delete(mandates)
      .where(eq(mandates.id, id))
      .returning({ id: mandates.id, title: mandates.title, companyId: mandates.companyId });
    return deleted ?? null;
  });
}
