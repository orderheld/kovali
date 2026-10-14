import "server-only";
import { and, arrayContains, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { candidates, companies, mandates, submissions, type Candidate } from "../db/schema";
import { matchCandidate, type MatchResult } from "../matching";
import { openMandateStatuses } from "../options";
import { normalizeSkill } from "../skills";
import { likePattern, PAGE_SIZE } from "./query";

/** Queries of the candidate module. Other modules may import them (read-only). */

export interface CandidateFilter {
  /** Name, e-mail, headline, skill (substring) or display number ("K-0042"). */
  q?: string;
  status?: string;
  /** Value of `disciplines` in options.ts. */
  discipline?: string;
  /** One skill, compared case-insensitively after normalisation ("s4hana" finds "SAP S/4HANA"). */
  skill?: string;
  engagement?: string;
  /** Available on or before this date (YYYY-MM-DD). No date counts as available, as in matching.ts. */
  availableBy?: string;
  /** Linked to an own firm (subcontractor), the only way a profile is passed on. */
  ownFirm?: boolean;
}

/** Profile skills, SAP modules and CV keywords as one array, for searching. */
const allSkills = sql`(${candidates.skills} || ${candidates.sapModules} || ${candidates.detectedSkills})`;

/**
 * The candidate has this skill, compared case-insensitively after normalisation, so aliases
 * find the canonical name ("S4HANA" finds "SAP S/4HANA"). Also used by the global search.
 */
export function hasSkill(skill: string): SQL {
  return sql`exists (select 1 from unnest(${allSkills}) as s(skill) where lower(s.skill) = lower(${normalizeSkill(skill)}))`;
}

function candidateWhere(f: CandidateFilter, withStatus = true): SQL | undefined {
  const pattern = likePattern(f.q);
  const number = f.q ? /^\s*k-?0*(\d{1,12})\s*$/i.exec(f.q) : null;
  return and(
    withStatus && f.status ? eq(candidates.status, f.status) : undefined,
    pattern
      ? or(
          ilike(candidates.firstName, pattern),
          ilike(candidates.lastName, pattern),
          sql`(${candidates.firstName} || ' ' || ${candidates.lastName}) ilike ${pattern}`,
          sql`(${candidates.lastName} || ' ' || ${candidates.firstName}) ilike ${pattern}`,
          ilike(candidates.email, pattern),
          ilike(candidates.headline, pattern),
          sql`exists (select 1 from unnest(${allSkills}) as s(skill) where s.skill ilike ${pattern})`,
          hasSkill(f.q ?? ""),
          number ? eq(candidates.id, Number(number[1])) : undefined,
        )
      : undefined,
    f.discipline ? arrayContains(candidates.disciplines, [f.discipline]) : undefined,
    f.skill?.trim() ? hasSkill(f.skill) : undefined,
    f.engagement ? eq(candidates.engagement, f.engagement) : undefined,
    f.availableBy ? or(isNull(candidates.availableFrom), lte(candidates.availableFrom, f.availableBy)) : undefined,
    f.ownFirm === undefined ? undefined : f.ownFirm ? isNotNull(candidates.companyId) : isNull(candidates.companyId),
  );
}

export async function listCandidates(filter: CandidateFilter & { page: number }) {
  const db = await getDb();
  const where = candidateWhere(filter);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        headline: candidates.headline,
        disciplines: candidates.disciplines,
        skills: candidates.skills,
        sapModules: candidates.sapModules,
        availableFrom: candidates.availableFrom,
        rateAmount: candidates.rateAmount,
        rateUnit: candidates.rateUnit,
        engagement: candidates.engagement,
        status: candidates.status,
        consentAt: candidates.consentAt,
        retentionUntil: candidates.retentionUntil,
        companyId: candidates.companyId,
        companyName: companies.name,
      })
      .from(candidates)
      .leftJoin(companies, eq(companies.id, candidates.companyId))
      .where(where)
      // Archived candidates last, otherwise alphabetical like a card index.
      .orderBy(
        sql`case when ${candidates.status} = 'archiviert' then 1 else 0 end`,
        asc(sql`lower(${candidates.lastName})`),
        asc(sql`lower(${candidates.firstName})`),
        asc(candidates.id),
      )
      .limit(PAGE_SIZE)
      .offset((filter.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(candidates).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export type CandidateListRow = Awaited<ReturnType<typeof listCandidates>>["rows"][number];

/** Number of candidates per status, with every other filter of the list applied. */
export async function candidateStatusCounts(filter: CandidateFilter = {}): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: candidates.status, n: count() })
    .from(candidates)
    .where(candidateWhere(filter, false))
    .groupBy(candidates.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function getCandidate(id: number): Promise<Candidate | null> {
  const db = await getDb();
  const [row] = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return row ?? null;
}

/** The candidate's proposals with mandate and company, newest first (read-only here). */
export async function listCandidateSubmissions(candidateId: number) {
  const db = await getDb();
  return db
    .select({
      id: submissions.id,
      status: submissions.status,
      consentAt: submissions.consentAt,
      consentMethod: submissions.consentMethod,
      withdrawnAt: submissions.withdrawnAt,
      submittedAt: submissions.submittedAt,
      profileVariant: submissions.profileVariant,
      createdAt: submissions.createdAt,
      mandateId: mandates.id,
      mandateTitle: mandates.title,
      mandateReference: mandates.reference,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(submissions)
    .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(eq(submissions.candidateId, candidateId))
    .orderBy(desc(submissions.createdAt), desc(submissions.id));
}

/** The proposal of one candidate for one mandate, if any (unique per pair). */
export async function getSubmissionFor(mandateId: number, candidateId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      consentAt: submissions.consentAt,
      withdrawnAt: submissions.withdrawnAt,
      consentScope: submissions.consentScope,
      profileVariant: submissions.profileVariant,
      rateSell: submissions.rateSell,
      rateUnit: submissions.rateUnit,
    })
    .from(submissions)
    .where(and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId)))
    .limit(1);
  return row ?? null;
}

/** Mandate details shown in a dossier: title and the client's own reference. */
export async function getMandateForDossier(mandateId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ id: mandates.id, title: mandates.title, reference: mandates.reference })
    .from(mandates)
    .where(eq(mandates.id, mandateId))
    .limit(1);
  return row ?? null;
}

export interface MandateMatch {
  mandate: { id: number; title: string; reference: string | null; companyName: string | null; status: string; startDate: string | null };
  match: MatchResult;
}

/**
 * Open mandates ranked for one candidate (matching.ts), best first. Mandates the candidate is
 * already proposed for are left out: they appear under "Vorschläge".
 */
export async function matchingMandatesFor(candidate: Candidate, today: string, limit = 5): Promise<MandateMatch[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: mandates.id,
      title: mandates.title,
      reference: mandates.reference,
      status: mandates.status,
      companyName: companies.name,
      disciplines: mandates.disciplines,
      requiredSkills: mandates.requiredSkills,
      niceSkills: mandates.niceSkills,
      seniority: mandates.seniority,
      startDate: mandates.startDate,
      workload: mandates.workload,
      rateSell: mandates.rateSell,
      rateUnit: mandates.rateUnit,
    })
    .from(mandates)
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(
      and(
        inArray(mandates.status, [...openMandateStatuses]),
        notExists(
          db
            .select({ one: sql`1` })
            .from(submissions)
            .where(and(eq(submissions.mandateId, mandates.id), eq(submissions.candidateId, candidate.id))),
        ),
      ),
    )
    .limit(500);
  return rows
    .map((m) => ({
      mandate: { id: m.id, title: m.title, reference: m.reference, companyName: m.companyName, status: m.status, startDate: m.startDate },
      match: matchCandidate(candidate, m, today),
    }))
    .filter((r) => r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || a.mandate.id - b.mandate.id)
    .slice(0, limit);
}
