import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type Column, type SQL } from "drizzle-orm";
import { contractSearchWhere } from "../contracts/data";
import { getDb } from "../db/client";
import { assignments, companies, contacts, contracts, documents, mandates, snippets } from "../db/schema";
import { displayNo } from "../format";
import { documentKinds } from "../options";
import { companySearchWhere } from "./companies";
import { mandateSearchWhere } from "./mandates";
import { likePattern } from "./query";
import { everyWord } from "./words";

/**
 * Global search of the admin area (/admin/suche). A display number such as A-0003, M-0007 or
 * a contract number jumps straight to the record; anything else searches assignments,
 * vacancies, contracts, text snippets, companies, contacts and document file names. Search
 * terms may contain names, so they are never logged.
 */

export const SEARCH_GROUP_LIMIT = 10;

type RecordKind = "assignment" | "mandate" | "company" | "snippet";

export type JumpTarget = { kind: RecordKind; id: number } | { kind: "contract"; number: string };

const PREFIXES: Record<string, RecordKind> = {
  A: "assignment",
  M: "mandate",
  F: "company",
  T: "snippet",
};

/**
 * Recognises display numbers: A-3, m7, f0003, T-0004 and contract numbers such as
 * V-2026-0001 (also "v 2026-1"). Returns null for anything else.
 */
export function parseDisplayNumber(input: string): JumpTarget | null {
  const q = input.trim();
  const record = /^(A|M|F|T)\s*-?\s*(\d{1,9})$/i.exec(q);
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

/**
 * A short piece of `text` around the first search word it contains, for result lists. Starts
 * at the beginning when no word occurs (the hit was in the title). Whitespace is collapsed.
 */
export function excerpt(text: string, query: string, length = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  const lower = flat.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0);
  const at = hit.length ? Math.min(...hit) : 0;
  // Some context before the hit, but never past the end.
  const start = Math.max(0, Math.min(at - Math.floor(length / 4), flat.length - length));
  const end = Math.min(flat.length, start + length);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

/** Where a display number leads, or null if the record does not exist (any more). */
export async function resolveJump(target: JumpTarget): Promise<string | null> {
  const db = await getDb();
  switch (target.kind) {
    case "assignment": {
      const [row] = await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.id, target.id)).limit(1);
      return row ? `/admin/auftraege/${row.id}` : null;
    }
    case "mandate": {
      const [row] = await db.select({ id: mandates.id }).from(mandates).where(eq(mandates.id, target.id)).limit(1);
      return row ? `/admin/vakanzen/${row.id}` : null;
    }
    case "company": {
      const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, target.id)).limit(1);
      return row ? `/admin/firmen/${row.id}` : null;
    }
    case "snippet": {
      const [row] = await db.select({ id: snippets.id }).from(snippets).where(eq(snippets.id, target.id)).limit(1);
      return row ? `/admin/texte/${row.id}` : null;
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

/**
 * Assignments: every word in title, end client, location, notes or the company's name; "A-3"
 * also finds the assignment by its number. The query must left-join companies on
 * assignments.company_id.
 */
export function assignmentSearchWhere(q: string | null | undefined): SQL | undefined {
  const words = everyWord(q, (pattern) =>
    or(
      ilike(assignments.title, pattern),
      ilike(assignments.endClient, pattern),
      ilike(assignments.location, pattern),
      ilike(assignments.notes, pattern),
      ilike(companies.name, pattern),
    ),
  );
  if (!words) return undefined;
  const number = /^a\s*-?\s*0*(\d{1,9})$/i.exec(q?.trim() ?? "");
  return number ? or(words, eq(assignments.id, Number(number[1]))) : words;
}

/** Text snippets: every word in title, category or the text itself. */
export function snippetSearchWhere(q: string | null | undefined): SQL | undefined {
  return everyWord(q, (pattern) => or(ilike(snippets.title, pattern), ilike(snippets.category, pattern), ilike(snippets.body, pattern)));
}

/**
 * Documents by file name, or by kind ("Lohnabrechnung" finds all payslips). Only documents of
 * a company, vacancy, contract or assignment: files of the former candidate module, still
 * stored when candidates existed, belong to none of them and stay out of the search.
 */
export function documentSearchWhere(q: string | null | undefined): SQL | undefined {
  const words = everyWord(q, (pattern) => {
    const word = pattern.slice(1, -1).replace(/\\(.)/g, "$1").toLowerCase();
    // Short words would match half the kinds ("a" is in most labels).
    const kinds = word.length >= 3 ? documentKinds.filter((k) => !k.legacy && k.label.toLowerCase().includes(word)).map((k) => k.value) : [];
    return or(ilike(documents.filename, pattern), kinds.length ? inArray(documents.kind, kinds) : undefined);
  });
  if (!words) return undefined;
  return and(words, sql`num_nonnulls(${documents.companyId}, ${documents.mandateId}, ${documents.contractId}, ${documents.assignmentId}) > 0`);
}

/** Contacts: name in either order, e-mail, role, or a phone number in any spelling. */
export function contactSearchWhere(q: string | null | undefined): SQL | undefined {
  const pattern = likePattern(q);
  if (!pattern) return undefined;
  return or(
    nameMatches(contacts.firstName, contacts.lastName, pattern),
    ilike(contacts.email, pattern),
    ilike(contacts.role, pattern),
    phoneMatches(contacts.phone, phoneVariants(q ?? "")),
  );
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

/** The record a document belongs to, as a link label and path. */
function documentOwner(d: {
  companyId: number | null;
  companyName: string | null;
  mandateId: number | null;
  mandateTitle: string | null;
  contractId: number | null;
  contractNumber: string | null;
  contractTitle: string | null;
  assignmentId: number | null;
  assignmentTitle: string | null;
}): { label: string; href: string } {
  if (d.contractId) return { label: `Vertrag ${d.contractNumber ?? ""} ${d.contractTitle ?? ""}`.trim(), href: `/admin/vertraege/${d.contractId}` };
  if (d.assignmentId) return { label: `Auftrag ${displayNo.assignment(d.assignmentId)} ${d.assignmentTitle ?? ""}`.trim(), href: `/admin/auftraege/${d.assignmentId}` };
  if (d.mandateId) return { label: `Vakanz ${displayNo.mandate(d.mandateId)} ${d.mandateTitle ?? ""}`.trim(), href: `/admin/vakanzen/${d.mandateId}` };
  return { label: `Firma ${d.companyName ?? displayNo.company(d.companyId ?? 0)}`, href: `/admin/firmen/${d.companyId}` };
}

export async function searchAll(input: string) {
  if (!likePattern(input)) return null;
  const db = await getDb();

  // Vacancies, contracts and companies use the same condition as their lists, so "Alle
  // anzeigen" there shows these hits.
  const mandateWhere = mandateSearchWhere(input);
  const contractWhere = contractSearchWhere(input);
  const companyWhere = companySearchWhere(input);
  const assignmentWhere = assignmentSearchWhere(input);
  const snippetWhere = snippetSearchWhere(input);
  const contactWhere = contactSearchWhere(input);
  const documentWhere = documentSearchWhere(input);

  const [assignmentResults, mandateResults, contractResults, snippetResults, companyResults, contactResults, documentResults] = await Promise.all([
    group(
      db
        .select({
          id: assignments.id,
          title: assignments.title,
          endClient: assignments.endClient,
          status: assignments.status,
          startDate: assignments.startDate,
          endDate: assignments.endDate,
          company: companies.name,
        })
        .from(assignments)
        .leftJoin(companies, eq(companies.id, assignments.companyId))
        .where(assignmentWhere)
        .orderBy(sql`case ${assignments.status} when 'laufend' then 0 when 'geplant' then 1 else 2 end`, sql`${assignments.startDate} desc nulls last`, desc(assignments.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(assignments).leftJoin(companies, eq(companies.id, assignments.companyId)).where(assignmentWhere),
    ),
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
        .select({
          id: contracts.id,
          number: contracts.number,
          title: contracts.title,
          kind: contracts.template,
          status: contracts.status,
          validUntil: contracts.validUntil,
          company: companies.name,
        })
        .from(contracts)
        .leftJoin(companies, eq(companies.id, contracts.companyId))
        .where(contractWhere)
        .orderBy(desc(contracts.createdAt), desc(contracts.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(contracts).leftJoin(companies, eq(companies.id, contracts.companyId)).where(contractWhere),
    ),
    group(
      db
        .select({ id: snippets.id, title: snippets.title, category: snippets.category, body: snippets.body, pinned: snippets.pinned })
        .from(snippets)
        .where(snippetWhere)
        .orderBy(desc(snippets.pinned), asc(sql`lower(${snippets.title})`), asc(snippets.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(snippets).where(snippetWhere),
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
        .select({
          id: documents.id,
          filename: documents.filename,
          kind: documents.kind,
          mimeType: documents.mimeType,
          sizeBytes: documents.sizeBytes,
          createdAt: documents.createdAt,
          companyId: documents.companyId,
          companyName: companies.name,
          mandateId: documents.mandateId,
          mandateTitle: mandates.title,
          contractId: documents.contractId,
          contractNumber: contracts.number,
          contractTitle: contracts.title,
          assignmentId: documents.assignmentId,
          assignmentTitle: assignments.title,
        })
        .from(documents)
        .leftJoin(companies, eq(companies.id, documents.companyId))
        .leftJoin(mandates, eq(mandates.id, documents.mandateId))
        .leftJoin(contracts, eq(contracts.id, documents.contractId))
        .leftJoin(assignments, eq(assignments.id, documents.assignmentId))
        .where(documentWhere)
        .orderBy(desc(documents.createdAt), desc(documents.id))
        .limit(SEARCH_GROUP_LIMIT),
      db.select({ n: count() }).from(documents).where(documentWhere),
    ),
  ]);

  return {
    assignments: assignmentResults,
    mandates: mandateResults,
    contracts: contractResults,
    snippets: { total: snippetResults.total, rows: snippetResults.rows.map((s) => ({ ...s, excerpt: excerpt(s.body, input) })) },
    companies: companyResults,
    contacts: contactResults,
    documents: {
      total: documentResults.total,
      rows: documentResults.rows.map((d) => ({
        id: d.id,
        filename: d.filename,
        kind: d.kind,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt,
        owner: documentOwner(d),
      })),
    },
  };
}

export type SearchResults = NonNullable<Awaited<ReturnType<typeof searchAll>>>;
