import "server-only";
import { asc, desc, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { candidates, companies, mandates } from "../db/schema";
import { displayNo } from "../format";
import { openMandateStatuses } from "../options";

/** Choices for select fields that link records across modules. */

export async function candidateOptions({ includeArchived = false } = {}) {
  const db = await getDb();
  const rows = await db
    .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, headline: candidates.headline })
    .from(candidates)
    .where(includeArchived ? undefined : ne(candidates.status, "archiviert"))
    .orderBy(asc(sql`lower(${candidates.lastName})`), asc(sql`lower(${candidates.firstName})`));
  return rows.map((r) => ({
    value: r.id,
    label: `${r.lastName} ${r.firstName} (${displayNo.candidate(r.id)}${r.headline ? `, ${r.headline}` : ""})`,
  }));
}

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
