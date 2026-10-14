import "server-only";
import { desc, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { companies, mandates } from "../db/schema";
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
