import { like } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

const { contracts } = schema;

/**
 * Contract numbers: V-<year>-<sequence>, e.g. V-2026-0001. The sequence restarts every year
 * and grows beyond four digits if needed. The number is unique in the database; two
 * contracts created at the same moment get different numbers through a retry.
 */

const NUMBER_RE = /^V-(\d{4})-(\d{4,})$/;

export function formatContractNumber(year: number, seq: number): string {
  return `V-${year}-${String(seq).padStart(4, "0")}`;
}

export function parseContractNumber(value: string | null | undefined): { year: number; seq: number } | null {
  const m = value ? NUMBER_RE.exec(value.trim()) : null;
  if (!m) return null;
  const seq = Number(m[2]);
  return seq > 0 ? { year: Number(m[1]), seq } : null;
}

/** Next free number of a year, given the numbers that exist (other years and odd values are ignored). */
export function nextContractNumber(year: number, existing: Iterable<string>): string {
  let max = 0;
  for (const n of existing) {
    const p = parseContractNumber(n);
    if (p && p.year === year && p.seq > max) max = p.seq;
  }
  return formatContractNumber(year, max + 1);
}

/** True for a Postgres unique violation (23505), also when wrapped by Drizzle (error.cause). */
export function isUniqueViolation(error: unknown): boolean {
  let e: unknown = error;
  for (let depth = 0; e && depth < 5; depth++) {
    if (typeof e === "object" && (e as { code?: unknown }).code === "23505") return true;
    e = typeof e === "object" ? (e as { cause?: unknown }).cause : undefined;
  }
  return false;
}

type Db = NodePgDatabase<typeof schema>;
export type NewContract = Omit<typeof contracts.$inferInsert, "id" | "number">;

/** Inserts a contract with the next number of `year`; retries when another insert took it. */
export async function insertContractWithNumber(db: Db, values: NewContract, year: number, attempts = 6): Promise<{ id: number; number: string }> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const rows = await db.select({ number: contracts.number }).from(contracts).where(like(contracts.number, `V-${year}-%`));
    const number = nextContractNumber(
      year,
      rows.map((r) => r.number),
    );
    try {
      const [row] = await db.insert(contracts).values({ ...values, number }).returning({ id: contracts.id, number: contracts.number });
      return row;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("Keine freie Vertragsnummer gefunden.");
}
