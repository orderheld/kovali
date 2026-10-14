import "server-only";
import { and, asc, desc, eq, getTableColumns, inArray, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../db/client";
import { candidates, companies, mandates, submissions, vacancyShares } from "../db/schema";

/**
 * Submissions (a candidate proposed for a mandate) and vacancy shares (a mandate offered to a
 * candidate in the portal). Used by the mandate pages; the candidate pages and the portal can
 * reuse the per-candidate queries.
 */

const candidateName = {
  candidateFirstName: candidates.firstName,
  candidateLastName: candidates.lastName,
  candidateHeadline: candidates.headline,
  candidateStatus: candidates.status,
};

// --- Subcontractor firm ------------------------------------------------------------------

/**
 * KOVALI passes candidates on only through their own firm, which works as subcontractor of
 * KOVALI (decision of 13.10.2026). These rules are shared by the mandate pages and every other
 * place that creates a submission (e.g. the candidate portal).
 */
export interface CandidateFirm {
  id: number;
  name: string;
  kind: string;
  legalForm: string | null;
}

export const NO_OWN_FIRM =
  "Vorschlag nicht möglich: Die Fachperson hat keine eigene Firma erfasst (GmbH/AG als Subunternehmen). Bitte zuerst beim Kandidaten die Firma verknüpfen.";

export const SOLE_PROPRIETOR_WARNING =
  "Einzelfirma: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.";

export const UNKNOWN_LEGAL_FORM_WARNING =
  "Rechtsform der Firma nicht erfasst. Falls Einzelfirma: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.";

/** GmbH or AG, also in the French and Italian forms used in Switzerland (Sàrl, Sagl, SA). */
export function isCapitalCompany(legalForm: string | null | undefined): boolean {
  if (!legalForm) return false;
  return /(?<![\p{L}])(gmbh|ag|sa|s\.a\.|sàrl|sarl|sagl|aktiengesellschaft|gesellschaft mit beschränkter haftung)(?![\p{L}])/iu.test(legalForm.trim());
}

export type FirmCheck = { ok: false; error: string } | { ok: true; firm: CandidateFirm; warning: string | null };

/**
 * May a candidate be proposed? Only with a linked company of kind "subunternehmer". A firm that
 * is not a GmbH or AG (sole proprietorship or unknown) is allowed with a warning.
 */
export function subcontractorCheck(firm: CandidateFirm | null): FirmCheck {
  if (!firm || firm.kind !== "subunternehmer") return { ok: false, error: NO_OWN_FIRM };
  if (isCapitalCompany(firm.legalForm)) return { ok: true, firm, warning: null };
  const form = firm.legalForm?.trim();
  if (!form) return { ok: true, firm, warning: UNKNOWN_LEGAL_FORM_WARNING };
  if (/einzel/i.test(form)) return { ok: true, firm, warning: SOLE_PROPRIETOR_WARNING };
  return { ok: true, firm, warning: `${form}, keine GmbH oder AG: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.` };
}

/** The candidate's own firm (candidates.company_id), or null. */
export async function candidateFirm(candidateId: number): Promise<CandidateFirm | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: companies.id, name: companies.name, kind: companies.kind, legalForm: companies.legalForm })
    .from(candidates)
    .innerJoin(companies, eq(companies.id, candidates.companyId))
    .where(eq(candidates.id, candidateId))
    .limit(1);
  return row ?? null;
}

/** The candidate's firm, joined through candidates.company_id. */
const firm = alias(companies, "candidate_firm");
const firmColumns = {
  firmId: firm.id,
  firmName: firm.name,
  firmKind: firm.kind,
  firmLegalForm: firm.legalForm,
};

/** Firm columns of a row as CandidateFirm, or null. */
export function firmOf(row: { firmId: number | null; firmName: string | null; firmKind: string | null; firmLegalForm: string | null }): CandidateFirm | null {
  return row.firmId && row.firmName && row.firmKind ? { id: row.firmId, name: row.firmName, kind: row.firmKind, legalForm: row.firmLegalForm } : null;
}

/** Submissions of a mandate: active ones first, then by match score. */
export async function listMandateSubmissions(mandateId: number) {
  const db = await getDb();
  return db
    .select({ ...getTableColumns(submissions), ...candidateName, ...firmColumns })
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .leftJoin(firm, eq(firm.id, candidates.companyId))
    .where(eq(submissions.mandateId, mandateId))
    .orderBy(
      asc(sql`case when ${submissions.status} in ('absage', 'zurueckgezogen') then 1 else 0 end`),
      sql`${submissions.matchScore} desc nulls last`,
      asc(submissions.id),
    );
}

export type MandateSubmission = Awaited<ReturnType<typeof listMandateSubmissions>>[number];

/** Submissions of a candidate with the mandate and its company, newest first. */
export async function listCandidateSubmissions(candidateId: number) {
  const db = await getDb();
  return db
    .select({
      ...getTableColumns(submissions),
      mandateTitle: mandates.title,
      mandateStatus: mandates.status,
      mandateReference: mandates.reference,
      companyId: mandates.companyId,
      companyName: companies.name,
    })
    .from(submissions)
    .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(eq(submissions.candidateId, candidateId))
    .orderBy(desc(submissions.createdAt), desc(submissions.id));
}

/** One submission with what the actions need for history entries. */
export async function getSubmissionContext(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      ...getTableColumns(submissions),
      mandateTitle: mandates.title,
      recipientCompanyId: mandates.companyId,
      recipientCompanyName: companies.name,
      ...candidateName,
      ...firmColumns,
    })
    .from(submissions)
    .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .leftJoin(firm, eq(firm.id, candidates.companyId))
    .where(eq(submissions.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Latest recorded withdrawal per candidate (consent note "Widerruf am …", see the mandate
 * rules), for a warning wherever the candidate could be proposed again.
 */
export async function candidateWithdrawals(candidateIds: number[]): Promise<Map<number, { note: string; mandateId: number }>> {
  if (!candidateIds.length) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ candidateId: submissions.candidateId, mandateId: submissions.mandateId, note: submissions.consentNote })
    .from(submissions)
    .where(and(inArray(submissions.candidateId, candidateIds), like(submissions.consentNote, "Widerruf am %")))
    .orderBy(desc(submissions.updatedAt));
  const out = new Map<number, { note: string; mandateId: number }>();
  for (const r of rows) if (r.note && !out.has(r.candidateId)) out.set(r.candidateId, { note: r.note, mandateId: r.mandateId });
  return out;
}

/** Portal shares of a mandate with the candidates' answers; unanswered interest first. */
export async function listMandateShares(mandateId: number) {
  const db = await getDb();
  return db
    .select({ ...getTableColumns(vacancyShares), ...candidateName })
    .from(vacancyShares)
    .innerJoin(candidates, eq(candidates.id, vacancyShares.candidateId))
    .where(eq(vacancyShares.mandateId, mandateId))
    .orderBy(
      asc(sql`case when ${vacancyShares.response} = 'interessiert' and ${vacancyShares.reviewedAt} is null then 0 else 1 end`),
      desc(vacancyShares.sharedAt),
      desc(vacancyShares.id),
    );
}

export type MandateShare = Awaited<ReturnType<typeof listMandateShares>>[number];

/** One share with the names for history entries. */
export async function getShareContext(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ ...getTableColumns(vacancyShares), mandateTitle: mandates.title, ...candidateName })
    .from(vacancyShares)
    .innerJoin(mandates, eq(mandates.id, vacancyShares.mandateId))
    .innerJoin(candidates, eq(candidates.id, vacancyShares.candidateId))
    .where(eq(vacancyShares.id, id))
    .limit(1);
  return row ?? null;
}
