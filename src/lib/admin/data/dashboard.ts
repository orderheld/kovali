import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { activities, assignments, companies, contracts, mandates, snippets } from "../db/schema";
import { addDaysIso, displayNo, todayIso } from "../format";
import { openMandateStatuses } from "../options";

/**
 * Figures and lists for the dashboard (/admin), queried directly from the tables. Contracts
 * ending soon come from contracts/data.ts (listEndingContracts), pinned snippets from
 * data/snippets.ts (pinnedSnippets).
 */

/** Next steps due within this many days are shown (overdue ones always). */
export const NEXT_STEP_DAYS = 7;
/** Application deadlines within this many days are shown. */
export const DEADLINE_DAYS = 7;

/**
 * Vacancy next steps due by today + 7 days (overdue ones first) and application deadlines in
 * the next 7 days of vacancies he has not applied for yet.
 */
export async function dashboardAgenda(today = todayIso()) {
  const db = await getDb();
  const columns = {
    id: mandates.id,
    title: mandates.title,
    status: mandates.status,
    priority: mandates.priority,
    nextStep: mandates.nextStep,
    nextStepAt: mandates.nextStepAt,
    deadline: mandates.deadline,
    company: companies.name,
  };
  const open = inArray(mandates.status, [...openMandateStatuses]);
  const [nextSteps, deadlines] = await Promise.all([
    db
      .select(columns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .where(and(open, isNotNull(mandates.nextStepAt), lte(mandates.nextStepAt, addDaysIso(today, NEXT_STEP_DAYS))))
      .orderBy(asc(mandates.nextStepAt), asc(mandates.id))
      .limit(20),
    db
      .select(columns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      // Once he has applied, the deadline no longer matters (as on the vacancy page).
      .where(and(open, isNull(mandates.appliedAt), gte(mandates.deadline, today), lte(mandates.deadline, addDaysIso(today, DEADLINE_DAYS))))
      .orderBy(asc(mandates.deadline), asc(mandates.id))
      .limit(20),
  ]);
  return { nextSteps, deadlines };
}

export interface ActivityLink {
  label: string;
  href: string;
}

/** The latest history entries across all records, each with links to its records. */
export async function recentActivities(limit = 15) {
  const db = await getDb();
  const rows = await db
    .select({
      id: activities.id,
      kind: activities.kind,
      body: activities.body,
      createdAt: activities.createdAt,
      assignmentId: activities.assignmentId,
      assignmentTitle: assignments.title,
      companyId: activities.companyId,
      companyName: companies.name,
      mandateId: activities.mandateId,
      mandateTitle: mandates.title,
      contractId: activities.contractId,
      contractNumber: contracts.number,
    })
    .from(activities)
    .leftJoin(assignments, eq(assignments.id, activities.assignmentId))
    .leftJoin(companies, eq(companies.id, activities.companyId))
    .leftJoin(mandates, eq(mandates.id, activities.mandateId))
    .leftJoin(contracts, eq(contracts.id, activities.contractId))
    .orderBy(desc(activities.createdAt), desc(activities.id))
    .limit(limit);
  return rows.map((r) => {
    const links: ActivityLink[] = [];
    if (r.assignmentId) links.push({ label: `${displayNo.assignment(r.assignmentId)} ${r.assignmentTitle ?? ""}`.trim(), href: `/admin/auftraege/${r.assignmentId}` });
    if (r.mandateId) links.push({ label: `${displayNo.mandate(r.mandateId)} ${r.mandateTitle ?? ""}`.trim(), href: `/admin/vakanzen/${r.mandateId}` });
    if (r.contractId) links.push({ label: r.contractNumber ?? "Vertrag", href: `/admin/vertraege/${r.contractId}` });
    if (r.companyId) links.push({ label: r.companyName ?? displayNo.company(r.companyId), href: `/admin/firmen/${r.companyId}` });
    return { id: r.id, kind: r.kind, body: r.body, createdAt: r.createdAt, links };
  });
}

/** How many records each module holds, e.g. for first steps on an empty database. */
export async function setupProgress() {
  const db = await getDb();
  const [[a], [m], [v], [t], [c]] = await Promise.all([
    db.select({ n: count() }).from(assignments),
    db.select({ n: count() }).from(mandates),
    db.select({ n: count() }).from(contracts),
    db.select({ n: count() }).from(snippets),
    db.select({ n: count() }).from(companies),
  ]);
  return { assignments: a?.n ?? 0, vacancies: m?.n ?? 0, contracts: v?.n ?? 0, snippets: t?.n ?? 0, companies: c?.n ?? 0 };
}

/** Number of vacancies per status (mandates.status), for the pipeline. */
export async function vacancyPipeline(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select({ status: mandates.status, n: count() }).from(mandates).groupBy(mandates.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export type NextBestStep =
  | { kind: "geplant"; id: number; title: string; startDate: string | null }
  | { kind: "zusage"; id: number; title: string; company: string | null }
  | { kind: "vakanz"; id: number; title: string; nextStep: string | null; nextStepAt: string | null }
  | { kind: "keine" };

/**
 * What to do when no assignment is running: start a planned one, turn a vacancy with a
 * "Zusage" into an assignment, follow up the most urgent open vacancy, or find a new one.
 */
export async function nextBestStep(): Promise<NextBestStep> {
  const db = await getDb();
  const [planned] = await db
    .select({ id: assignments.id, title: assignments.title, startDate: assignments.startDate })
    .from(assignments)
    .where(eq(assignments.status, "geplant"))
    .orderBy(asc(assignments.startDate), asc(assignments.id))
    .limit(1);
  if (planned) return { kind: "geplant", ...planned };

  // A won vacancy that has no assignment yet.
  const [won] = await db
    .select({ id: mandates.id, title: mandates.title, company: companies.name })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .leftJoin(assignments, eq(assignments.mandateId, mandates.id))
    .where(and(eq(mandates.status, "gewonnen"), isNull(assignments.id)))
    .orderBy(desc(mandates.updatedAt), desc(mandates.id))
    .limit(1);
  if (won) return { kind: "zusage", ...won };

  const [open] = await db
    .select({ id: mandates.id, title: mandates.title, nextStep: mandates.nextStep, nextStepAt: mandates.nextStepAt })
    .from(mandates)
    .where(inArray(mandates.status, [...openMandateStatuses]))
    .orderBy(asc(mandates.nextStepAt), desc(mandates.updatedAt), desc(mandates.id))
    .limit(1);
  if (open) return { kind: "vakanz", ...open };
  return { kind: "keine" };
}
