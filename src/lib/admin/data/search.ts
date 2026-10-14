import "server-only";
import { asc, count, desc, eq, ilike, or, sql, type Column, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { companies, contacts, contracts, mandates } from "../db/schema";
import { mandateSearchWhere } from "./mandates";
import { likePattern } from "./query";

/**
 * Global search of the admin area (/admin/suche). A display number such as M-0007 or a
 * contract number jumps straight to the record; anything else searches vacancies, companies,
 * contacts and contracts. Search terms may contain names, so they are never logged.
 */

export const SEARCH_GROUP_LIMIT = 10;

export type JumpTarget = { kind: "mandate" | "company"; id: number } | { kind: "contract"; number: string };

const PREFIXES: Record<string, "mandate" | "company"> = {
  M: "mandate",
  F: "company",
};

/**
 * Recognises display numbers: M-7, f0003 and contract numbers such as V-2026-0001 (also
 * "v 2026-1"). Returns null for anything else.
 */
export function parseDisplayNumber(input: string): JumpTarget | null {
  const q = input.trim();
  const record = /^(M|F)\s*-?\s*(\d{1,9})$/i.exec(q);
  if (record) {
    const id = Number(record[2]);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return { kind: PREFIXES[record[1].toUpperCase()], id };
  }
  const contract = /^V\s*-?\s*(\d{4})\s*-\s*(\d{1,6})$/i.exec(q);
  if (contract) {
    const n = Number(contract[2]);
    if (n <= 0) return null;
    return { kind: "contract", number: `V-${contract[1]}-${String(n).padStart(4, "0")}` };
  }
  return null;
}

/**
 * Digit strings to look for in phone numbers. Swiss numbers are stored as "079 123 45 67" or
 * "+41 79 123 45 67", so a search with one prefix also finds the other. Null when the input
 * is not a phone number (letters, or fewer than four digits).
 */
export function phoneVariants(input: string): string[] | null {
  const q = input.trim();
  if (!/^[\d\s+()./-]+$/.test(q)) return null;
  const digits = q.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const variants = new Set([digits]);
  if (digits.startsWith("0041")) {
    variants.add(`0${digits.slice(4)}`).add(digits.slice(2));
  } else if (digits.startsWith("41") && (q.startsWith("+") || digits.length >= 11)) {
    // "+41 79 …" or a full number without "+": the country code replaces the leading 0.
    variants.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith("0") && !digits.startsWith("00")) {
    variants.add(`41${digits.slice(1)}`);
  }
  return [...variants];
}

/** Where a display number leads, or null if the record does not exist (any more). */
export async function resolveJump(target: JumpTarget): Promise<string | null> {
  const db = await getDb();
  switch (target.kind) {
    case "mandate": {
      const [row] = await db.select({ id: mandates.id }).from(mandates).where(eq(mandates.id, target.id)).limit(1);
      return row ? `/admin/vakanzen/${row.id}` : null;
    }
    case "company": {
      const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, target.id)).limit(1);
      return row ? `/admin/firmen/${row.id}` : null;
    }
    case "contract": {
      const [row] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(sql`upper(${contracts.number}) = ${target.number.toUpperCase()}`)
        .limit(1);
      return row ? `/admin/vertraege/${row.id}` : null;
    }
  }
}

/** Matches "Vorname Nachname" in both orders. */
function nameMatches(first: Column, last: Column, pattern: string): SQL {
  return sql`(concat_ws(' ', ${first}, ${last}) ilike ${pattern} or concat_ws(' ', ${last}, ${first}) ilike ${pattern})`;
}

function phoneMatches(column: Column, variants: string[] | null): SQL | undefined {
  if (!variants) return undefined;
  const digits = sql`regexp_replace(coalesce(${column}, ''), '[^0-9]', '', 'g')`;
  return or(...variants.map((v) => sql`${digits} like ${`%${v}%`}`));
}

async function group<T>(rows: Promise<T[]>, total: Promise<{ n: number }[]>) {
  const [r, [t]] = await Promise.all([rows, total]);
  return { rows: r, total: t?.n ?? 0 };
}

export async function searchAll(input: string) {
  const pattern = likePattern(input);
  if (!pattern) return null;
  const db = await getDb();
  const phones = phoneVariants(input);
  const digits = input.replace(/\D/g, "");

  // Same condition as the vacancy list, so "Alle anzeigen" there shows these hits.
  const mandateWhere = mandateSearchWhere(input);
  const companyWhere = or(
    ilike(companies.name, pattern),
    ilike(companies.legalName, pattern),
    ilike(companies.city, pattern),
    ilike(companies.uid, pattern),
    digits.length >= 6 ? sql`regexp_replace(coalesce(${companies.uid}, ''), '[^0-9]', '', 'g') like ${`%${digits}%`}` : undefined,
  );
  const contactWhere = or(nameMatches(contacts.firstName, contacts.lastName, pattern), ilike(contacts.email, pattern), phoneMatches(contacts.phone, phones));
  const contractWhere = or(ilike(contracts.number, pattern), ilike(contracts.title, pattern));

  const [mandateResults, companyResults, contactResults, contractResults] = await Promise.all([
    group(
      db
        .select({
          id: mandates.id,
          title: mandates.title,
          reference: mandates.reference,
          endClient: mandates.endClient,
          status: mandates.status,
          company: companies.name,
        })
        .from(mandates)
        .leftJoin(companies, eq(companies.id, mandates.companyId))
        .where(mandateWhere)
        .orderBy(desc(mandates.createdAt), desc(mandates.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(mandates).leftJoin(companies, eq(companies.id, mandates.companyId)).where(mandateWhere),
    ),
    group(
      db
        .select({ id: companies.id, name: companies.name, legalName: companies.legalName, kind: companies.kind, city: companies.city, status: companies.status })
        .from(companies)
        .where(companyWhere)
        .orderBy(asc(sql`lower(${companies.name})`), asc(companies.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(companies).where(companyWhere),
    ),
    group(
      db
        .select({
          id: contacts.id,
          companyId: contacts.companyId,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          role: contacts.role,
          email: contacts.email,
          company: companies.name,
        })
        .from(contacts)
        .innerJoin(companies, eq(companies.id, contacts.companyId))
        .where(contactWhere)
        .orderBy(asc(sql`lower(${contacts.lastName})`), asc(contacts.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(contacts).where(contactWhere),
    ),
    group(
      db
        .select({ id: contracts.id, number: contracts.number, title: contracts.title, status: contracts.status, company: companies.name })
        .from(contracts)
        .leftJoin(companies, eq(companies.id, contracts.companyId))
        .where(contractWhere)
        .orderBy(desc(contracts.createdAt), desc(contracts.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(contracts).where(contractWhere),
    ),
  ]);

  return {
    mandates: mandateResults,
    companies: companyResults,
    contacts: contactResults,
    contracts: contractResults,
  };
}

export type SearchResults = NonNullable<Awaited<ReturnType<typeof searchAll>>>;
