/** Helpers for list pages: search patterns, page numbers, URL building and SQL fragments. */
import { getTableName, sql, type Column, type SQL } from "drizzle-orm";

export const PAGE_SIZE = 50;

/** ILIKE pattern for a user's search text, with %, _ and \ escaped. Null for empty input. */
export function likePattern(q: string | null | undefined): string | null {
  const t = q?.trim().slice(0, 100);
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function pageNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** First string value of a search parameter. */
export function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Builds a list URL, dropping empty values. */
export function listHref(base: string, params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "" && !(k === "seite" && v === 1)) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * Drizzle writes column names without their table in single-table selects, so in a correlated
 * subquery a plain "id" would point to the inner table. This keeps the outer column qualified.
 */
export function outerColumn(column: Column): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}
