import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { companies, snippets } from "../db/schema";
import { likePattern } from "./query";

/** Textbausteine: reusable texts with a category, an optional company and a pinned flag. */

/** Snippets are few; the list shows all of them without pages. */
export const SNIPPET_LIST_LIMIT = 500;

export interface SnippetFilter {
  q?: string;
  category?: string;
  companyId?: number;
}

/**
 * Search condition for snippets: title, text, category, company or "T-0004". The query must
 * left-join companies on snippets.company_id.
 */
export function snippetSearchWhere(q: string | null | undefined): SQL | undefined {
  const pattern = likePattern(q);
  if (!pattern) return undefined;
  const number = /^t-?0*(\d{1,9})$/i.exec(q?.trim() ?? "");
  return or(
    ilike(snippets.title, pattern),
    ilike(snippets.body, pattern),
    ilike(snippets.category, pattern),
    ilike(companies.name, pattern),
    number ? eq(snippets.id, Number(number[1])) : undefined,
  );
}

const columns = {
  id: snippets.id,
  title: snippets.title,
  category: snippets.category,
  body: snippets.body,
  pinned: snippets.pinned,
  companyId: snippets.companyId,
  companyName: companies.name,
  updatedAt: snippets.updatedAt,
};

export type SnippetRow = Awaited<ReturnType<typeof listSnippets>>[number];

/** Pinned first, then by category and title. */
export async function listSnippets({ q, category, companyId }: SnippetFilter = {}) {
  const db = await getDb();
  return db
    .select(columns)
    .from(snippets)
    .leftJoin(companies, eq(companies.id, snippets.companyId))
    .where(
      and(
        snippetSearchWhere(q),
        category ? sql`lower(${snippets.category}) = lower(${category})` : undefined,
        companyId ? eq(snippets.companyId, companyId) : undefined,
      ),
    )
    .orderBy(desc(snippets.pinned), sql`lower(${snippets.category}) asc nulls last`, asc(sql`lower(${snippets.title})`), asc(snippets.id))
    .limit(SNIPPET_LIST_LIMIT);
}

/** Categories in use with their number of snippets, alphabetically; for filters and the datalist. */
export async function snippetCategories(): Promise<{ category: string; count: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({ category: sql<string>`min(${snippets.category})`, n: count() })
    .from(snippets)
    .where(and(isNotNull(snippets.category), sql`btrim(${snippets.category}) <> ''`))
    .groupBy(sql`lower(${snippets.category})`);
  return rows.map((r) => ({ category: r.category, count: r.n })).sort((a, b) => a.category.localeCompare(b.category, "de", { sensitivity: "base" }));
}

/** Companies that have snippets, for the list filter. */
export async function snippetCompanyOptions() {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ id: companies.id, name: companies.name })
    .from(companies)
    .innerJoin(snippets, eq(snippets.companyId, companies.id));
  return rows.sort((a, b) => a.name.localeCompare(b.name, "de")).map((r) => ({ value: r.id, label: r.name }));
}

export async function getSnippet(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ ...columns, createdAt: snippets.createdAt })
    .from(snippets)
    .leftJoin(companies, eq(companies.id, snippets.companyId))
    .where(eq(snippets.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Snippets for a vacancy: those of its company first, then the pinned ones. Without a company,
 * only the pinned ones.
 */
export async function snippetsForCompany(companyId: number | null, limit = 12) {
  const db = await getDb();
  const ofCompany = companyId ? eq(snippets.companyId, companyId) : undefined;
  return db
    .select(columns)
    .from(snippets)
    .leftJoin(companies, eq(companies.id, snippets.companyId))
    .where(or(eq(snippets.pinned, true), ofCompany))
    .orderBy(
      ...(companyId ? [desc(sql`${snippets.companyId} is not distinct from ${companyId}`)] : []),
      desc(snippets.pinned),
      asc(sql`lower(${snippets.title})`),
      asc(snippets.id),
    )
    .limit(limit);
}

/** Pinned snippets, e.g. for the dashboard. */
export async function pinnedSnippets(limit = 8) {
  const db = await getDb();
  return db
    .select(columns)
    .from(snippets)
    .leftJoin(companies, eq(companies.id, snippets.companyId))
    .where(eq(snippets.pinned, true))
    .orderBy(asc(sql`lower(${snippets.title})`), asc(snippets.id))
    .limit(limit);
}

// --- Writes ------------------------------------------------------------------------

export type SnippetValues = Pick<typeof snippets.$inferInsert, "title" | "category" | "body" | "companyId" | "pinned">;

export async function insertSnippet(values: SnippetValues): Promise<number> {
  const db = await getDb();
  const [row] = await db.insert(snippets).values(values).returning({ id: snippets.id });
  return row.id;
}

/** False when the snippet is gone. */
export async function updateSnippet(id: number, values: SnippetValues, now = new Date()): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(snippets)
    .set({ ...values, updatedAt: now })
    .where(eq(snippets.id, id))
    .returning({ id: snippets.id });
  return rows.length > 0;
}

/** False when the snippet is gone. Pinning does not count as an edit (updated_at stays). */
export async function setSnippetPinned(id: number, pinned: boolean): Promise<boolean> {
  const db = await getDb();
  const rows = await db.update(snippets).set({ pinned }).where(eq(snippets.id, id)).returning({ id: snippets.id });
  return rows.length > 0;
}

export async function deleteSnippet(id: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(snippets).where(eq(snippets.id, id)).returning({ id: snippets.id });
  return rows.length > 0;
}
