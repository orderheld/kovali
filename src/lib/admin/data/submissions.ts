import "server-only";
import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { decidedSubmissionStatuses, statusAfterConsent, statusAfterWithdrawal, type ConsentScope } from "../consent";
import { getDb, type AdminDb } from "../db/client";
import { candidates, companies, mandates, submissions, vacancyShares } from "../db/schema";
import { todayIso } from "../format";
import { isCapitalCompany } from "../legal-form";

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

/** The candidate's objection to any further hand-over, for the rules of the mandate module. */
const candidateObjection = {
  objectionAt: candidates.objectionAt,
  objectionNote: candidates.objectionNote,
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
  legalName: string | null;
}

export const NO_OWN_FIRM =
  "Vorschlag nicht möglich: Die Fachperson hat keine eigene Firma erfasst (GmbH/AG als Subunternehmen). Bitte zuerst beim Kandidaten die Firma verknüpfen.";

export const SOLE_PROPRIETOR_WARNING =
  "Einzelfirma: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.";

export const UNKNOWN_LEGAL_FORM_WARNING =
  "Rechtsform der Firma nicht erfasst. Falls Einzelfirma: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.";

export type FirmCheck = { ok: false; error: string } | { ok: true; firm: CandidateFirm; warning: string | null };

/**
 * May a candidate be proposed? Only with a linked company of kind "subunternehmer". A firm that
 * is not a GmbH or AG (sole proprietorship or unknown) is allowed with a warning. Without a
 * legal form, the name decides (as on the candidate page).
 */
export function subcontractorCheck(firm: CandidateFirm | null): FirmCheck {
  if (!firm || firm.kind !== "subunternehmer") return { ok: false, error: NO_OWN_FIRM };
  if (isCapitalCompany(firm)) return { ok: true, firm, warning: null };
  const form = firm.legalForm?.trim();
  if (!form) return { ok: true, firm, warning: UNKNOWN_LEGAL_FORM_WARNING };
  if (/einzel/i.test(form)) return { ok: true, firm, warning: SOLE_PROPRIETOR_WARNING };
  return { ok: true, firm, warning: `${form}, keine GmbH oder AG: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.` };
}

/** The candidate's own firm (candidates.company_id), or null. */
export async function candidateFirm(candidateId: number): Promise<CandidateFirm | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: companies.id, name: companies.name, kind: companies.kind, legalForm: companies.legalForm, legalName: companies.legalName })
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
  firmLegalName: firm.legalName,
};

/** The firm a profile went through at the hand-over (submissions.subcontractor_company_id). */
const handoverFirm = alias(companies, "handover_firm");

/** Firm columns of a row as CandidateFirm, or null. */
export function firmOf(row: {
  firmId: number | null;
  firmName: string | null;
  firmKind: string | null;
  firmLegalForm: string | null;
  firmLegalName: string | null;
}): CandidateFirm | null {
  return row.firmId && row.firmName && row.firmKind
    ? { id: row.firmId, name: row.firmName, kind: row.firmKind, legalForm: row.firmLegalForm, legalName: row.firmLegalName }
    : null;
}

/** Submissions of a mandate: active ones first, then by match score. */
export async function listMandateSubmissions(mandateId: number) {
  const db = await getDb();
  return db
    .select({ ...getTableColumns(submissions), ...candidateName, ...candidateObjection, ...firmColumns, subcontractorName: handoverFirm.name })
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .leftJoin(firm, eq(firm.id, candidates.companyId))
    .leftJoin(handoverFirm, eq(handoverFirm.id, submissions.subcontractorCompanyId))
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
      ...candidateObjection,
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

export interface CandidateConsentBlock {
  /** Objection to any further hand-over (candidates.objection_at). */
  objection: { at: Date; note: string | null } | null;
  /** The latest withdrawal on any of the candidate's submissions. */
  latestWithdrawal: { at: Date; mandateId: number; note: string | null } | null;
}

/**
 * Objections and withdrawals per candidate, for warnings wherever a candidate could be
 * shortlisted or proposed. Candidates with neither are not in the map.
 */
export async function candidateWithdrawals(candidateIds: number[]): Promise<Map<number, CandidateConsentBlock>> {
  if (!candidateIds.length) return new Map();
  const db = await getDb();
  const [objections, withdrawals] = await Promise.all([
    db
      .select({ id: candidates.id, at: candidates.objectionAt, note: candidates.objectionNote })
      .from(candidates)
      .where(and(inArray(candidates.id, candidateIds), isNotNull(candidates.objectionAt))),
    db
      .select({ candidateId: submissions.candidateId, mandateId: submissions.mandateId, at: submissions.withdrawnAt, note: submissions.withdrawalNote })
      .from(submissions)
      .where(and(inArray(submissions.candidateId, candidateIds), isNotNull(submissions.withdrawnAt)))
      .orderBy(desc(submissions.withdrawnAt), desc(submissions.id)),
  ]);
  const out = new Map<number, CandidateConsentBlock>();
  const entry = (id: number) => out.get(id) ?? out.set(id, { objection: null, latestWithdrawal: null }).get(id)!;
  for (const o of objections) if (o.at) entry(o.id).objection = { at: o.at, note: o.note };
  for (const w of withdrawals) {
    const e = entry(w.candidateId);
    if (w.at && !e.latestWithdrawal) e.latestWithdrawal = { at: w.at, mandateId: w.mandateId, note: w.note };
  }
  return out;
}

/** A submission that a candidate's objection marked as withdrawn. */
export interface WithdrawnSubmission {
  id: number;
  mandateId: number;
  previousStatus: string;
  status: string;
  submittedAt: Date | null;
}

type Tx = Parameters<Parameters<AdminDb["transaction"]>[0]>[0];

async function objectInTx(tx: Tx, candidateId: number, at: Date, note: string | null, now: Date): Promise<WithdrawnSubmission[] | null> {
  const [candidate] = await tx
    .update(candidates)
    .set({ objectionAt: at, objectionNote: note, updatedAt: now })
    .where(eq(candidates.id, candidateId))
    .returning({ id: candidates.id });
  if (!candidate) return null;
  const open = await tx
    .select({ id: submissions.id, mandateId: submissions.mandateId, status: submissions.status, submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(and(eq(submissions.candidateId, candidateId), isNull(submissions.withdrawnAt), notInArray(submissions.status, [...decidedSubmissionStatuses])))
    .for("update");
  const changed: WithdrawnSubmission[] = [];
  for (const s of open) {
    const status = statusAfterWithdrawal(s);
    await tx.update(submissions).set({ withdrawnAt: at, withdrawalNote: note, consentScope: null, status, updatedAt: now }).where(eq(submissions.id, s.id));
    changed.push({ id: s.id, mandateId: s.mandateId, previousStatus: s.status, status, submittedAt: s.submittedAt });
  }
  return changed;
}

/**
 * Records the candidate's objection to any further hand-over (Widerspruch): sets
 * candidates.objection_at and marks every submission that is not decided yet as withdrawn
 * (submissions already withdrawn keep their date). A profile not yet proposed ends as
 * "zurückgezogen"; a proposed one keeps its status, Ferhat informs the client. Returns the
 * submissions it changed, or null when the candidate does not exist.
 */
export async function recordObjection(candidateId: number, at: Date, note: string | null): Promise<WithdrawnSubmission[] | null> {
  const db = await getDb();
  return db.transaction((tx) => objectInTx(tx, candidateId, at, note, new Date()));
}

/**
 * Lifts the candidate's objection. Withdrawals of single submissions stay: each mandate needs
 * a renewed consent. Returns the objection that was lifted, or null when there was none.
 */
export async function liftObjection(candidateId: number): Promise<{ at: Date; note: string | null } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ at: candidates.objectionAt, note: candidates.objectionNote })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .for("update")
      .limit(1);
    if (!current?.at) return null;
    await tx.update(candidates).set({ objectionAt: null, objectionNote: null, updatedAt: new Date() }).where(eq(candidates.id, candidateId));
    return { at: current.at, note: current.note };
  });
}

/**
 * The candidate withdraws consent for one submission (or declines the mandate): withdrawn_at
 * and the note are set, the consent date stays as record of what earlier hand-overs were based
 * on (its scope is cleared: it covers nothing any more), the submission ends as
 * "zurückgezogen". With `allMandates` it is an objection to any further hand-over (see
 * recordObjection). Returns the other submissions it changed.
 */
export async function withdrawSubmission(
  submissionId: number,
  { at, note, allMandates }: { at: Date; note: string | null; allMandates: boolean },
): Promise<{ others: WithdrawnSubmission[] } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .update(submissions)
      .set({ withdrawnAt: at, withdrawalNote: note, consentScope: null, status: "zurueckgezogen", updatedAt: now })
      .where(and(eq(submissions.id, submissionId), isNull(submissions.withdrawnAt)))
      .returning({ candidateId: submissions.candidateId });
    if (!row) return null;
    const others = allMandates ? await objectInTx(tx, row.candidateId, at, note, now) : [];
    return { others: others ?? [] };
  });
}

/**
 * Records consent for one submission (by hand or from a signed consent form). A withdrawal of
 * this submission is lifted, and so is the candidate's objection when the consent is dated on
 * or after it: an explicit new consent is the candidate changing their mind. The caller checks
 * the date first (renewedConsentError). `scope` says what it covers; a named consent recorded
 * on top of an anonymous one (e.g. from the portal) replaces it. Returns the lifted objection,
 * if any.
 */
export async function giveSubmissionConsent(
  submissionId: number,
  consent: { at: Date; method: string; note: string | null; scope: ConsentScope },
): Promise<{ status: string; withdrawalLifted: { at: Date; note: string | null } | null; objectionLifted: { at: Date; note: string | null } | null } | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [current] = await tx
      .select({
        candidateId: submissions.candidateId,
        status: submissions.status,
        submittedAt: submissions.submittedAt,
        withdrawnAt: submissions.withdrawnAt,
        withdrawalNote: submissions.withdrawalNote,
        objectionAt: candidates.objectionAt,
        objectionNote: candidates.objectionNote,
      })
      .from(submissions)
      .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
      .where(eq(submissions.id, submissionId))
      .for("update")
      .limit(1);
    if (!current) return null;
    const status = statusAfterConsent(current);
    await tx
      .update(submissions)
      .set({
        consentAt: consent.at,
        consentMethod: consent.method,
        consentNote: consent.note,
        consentScope: consent.scope,
        withdrawnAt: null,
        withdrawalNote: null,
        status,
        updatedAt: now,
      })
      .where(eq(submissions.id, submissionId));
    let objectionLifted: { at: Date; note: string | null } | null = null;
    if (current.objectionAt && todayIso(consent.at) >= todayIso(current.objectionAt)) {
      await tx.update(candidates).set({ objectionAt: null, objectionNote: null, updatedAt: now }).where(eq(candidates.id, current.candidateId));
      objectionLifted = { at: current.objectionAt, note: current.objectionNote };
    }
    const withdrawalLifted = current.withdrawnAt ? { at: current.withdrawnAt, note: current.withdrawalNote } : null;
    return { status, withdrawalLifted, objectionLifted };
  });
}

/**
 * Stores a status change. For a status that puts the profile in front of the client
 * (`toClient`), the update only happens while the submission is not withdrawn and the
 * candidate has no objection, so a withdrawal arriving in the meantime (e.g. in the portal)
 * wins. A first hand-over of the dossier with the name also needs a consent that covers it
 * (consent_scope "namentlich"), so a change of variant or scope in the meantime wins as well.
 * The first hand-over also stores the candidate's own firm at this moment
 * (subcontractor_company_id, a snapshot that stays when the candidate's firm changes later).
 * Returns false when nothing was updated.
 */
export async function markSubmissionStatus(
  submissionId: number,
  values: { status: string; submittedAt: Date | null; subcontractorCompanyId?: number; toClient: boolean },
): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(submissions)
    .set({
      status: values.status,
      submittedAt: values.submittedAt,
      ...(values.subcontractorCompanyId ? { subcontractorCompanyId: values.subcontractorCompanyId } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(submissions.id, submissionId),
        values.toClient ? isNull(submissions.withdrawnAt) : undefined,
        values.toClient
          ? sql`not exists (select 1 from ${candidates} where ${candidates.id} = ${submissions.candidateId} and ${candidates.objectionAt} is not null)`
          : undefined,
        values.toClient
          ? or(isNotNull(submissions.submittedAt), ne(submissions.profileVariant, "namentlich"), eq(submissions.consentScope, "namentlich"))
          : undefined,
      ),
    )
    .returning({ id: submissions.id });
  return rows.length > 0;
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
