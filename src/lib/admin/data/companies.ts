import "server-only";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { assignments, companies, contacts, contracts, mandates } from "../db/schema";
import { openMandateStatuses } from "../options";
import { likePattern, outerColumn, PAGE_SIZE } from "./query";

export async function listCompanies({ q, kind, page }: { q?: string; kind?: string; page: number }) {
  const db = await getDb();
  const pattern = likePattern(q);
  const where = and(
    kind ? eq(companies.kind, kind) : undefined,
    pattern ? or(ilike(companies.name, pattern), ilike(companies.legalName, pattern), ilike(companies.city, pattern)) : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        legalName: companies.legalName,
        kind: companies.kind,
        city: companies.city,
        status: companies.status,
        contacts: sql<number>`(select count(*) from ${contacts} where ${contacts.companyId} = ${outerColumn(companies.id)})`.mapWith(Number),
        openMandates: sql<number>`(select count(*) from ${mandates} where ${mandates.companyId} = ${outerColumn(companies.id)} and ${inArray(mandates.status, [...openMandateStatuses])})`.mapWith(Number),
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
