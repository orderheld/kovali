import "server-only";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { assignments, companies, mandates } from "../db/schema";
import { displayNo } from "../format";
import { openMandateStatuses } from "../options";

/** Choices for select fields that link records across modules. */

/** Vacancies, newest first: "M-0007 Business Analyst (GHR Group)". */
export async function mandateOptions({ openOnly = false } = {}) {
  const db = await getDb();
  const rows = await db
    .select({ id: mandates.id, title: mandates.title, company: companies.name, status: mandates.status })
    .from(mandates)
    .leftJoin(companies, sql`${companies.id} = ${mandates.companyId}`)
    .where(openOnly ? inArray(mandates.status, [...openMandateStatuses]) : undefined)
    .orderBy(desc(mandates.createdAt));
  return rows.map((r) => ({
    value: r.id,
    label: `${displayNo.mandate(r.id)} ${r.title}${r.company ? ` (${r.company})` : ""}`,
  }));
}

/** Assignments, running ones first, then by start: "A-0003 Business Analyst (GHR Group)". */
export async function assignmentOptions() {
  const db = await getDb();
  const rows = await db
    .select({ id: assignments.id, title: assignments.title, company: companies.name, status: assignments.status })
    .from(assignments)
    .leftJoin(companies, eq(companies.id, assignments.companyId))
    .orderBy(sql`case ${assignments.status} when 'laufend' then 0 when 'geplant' then 1 else 2 end`, sql`${assignments.startDate} desc nulls last`, desc(assignments.id));
  return rows.map((r) => ({
    value: r.id,
    label: `${displayNo.assignment(r.id)} ${r.title}${r.company ? ` (${r.company})` : ""}`,
  }));
}
