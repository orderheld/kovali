import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { statusAfterConsent, statusAfterWithdrawal } from "@/lib/admin/consent";
import { getDb, type AdminDb } from "@/lib/admin/db/client";
import { candidates, mandates, submissions, vacancyShares } from "@/lib/admin/db/schema";
import { formatDateTime } from "@/lib/admin/format";
import { openMandateStatuses } from "@/lib/admin/options";
import { seesAllVacancies } from "./vacancy-rules";

/**
 * Vacancies in the candidate portal. Every function takes the candidate id from the session
 * and applies the visibility rule of vacancy-rules.ts in SQL. Only the portal fields of a
 * mandate are ever selected: never the company, the end client, the internal title and
 * description, notes or the selling rate.
 */

type Tx = Parameters<Parameters<AdminDb["transaction"]>[0]>[0];
type Db = AdminDb | Tx;

/** Columns a candidate may see. */
const portalColumns = {
  id: mandates.id,
  portalTitle: mandates.portalTitle,
  portalDescription: mandates.portalDescription,
  location: mandates.location,
  remote: mandates.remote,
  workload: mandates.workload,
  startDate: mandates.startDate,
  endDate: mandates.endDate,
  durationText: mandates.durationText,
  disciplines: mandates.disciplines,
  requiredSkills: mandates.requiredSkills,
  niceSkills: mandates.niceSkills,
  seniority: mandates.seniority,
  portalRate: mandates.portalRate,
  portalRateUnit: mandates.portalRateUnit,
  publishedAt: sql<Date>`coalesce(case when ${mandates.portalVisibility} = 'ausgewaehlt' then ${vacancyShares.sharedAt} end, ${mandates.createdAt})`.mapWith(
    (v: string | Date) => new Date(v),
  ),
  shareId: vacancyShares.id,
  seenAt: vacancyShares.seenAt,
  response: vacancyShares.response,
  responseAt: vacancyShares.responseAt,
  responseMessage: vacancyShares.responseMessage,
};

export type PortalVacancy = Awaited<ReturnType<typeof listVisibleVacancies>>[number];

async function candidateStatus(db: Db, candidateId: number): Promise<string | null> {
  const [row] = await db.select({ status: candidates.status }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  return row?.status ?? null;
}

/** SQL form of vacancyVisible(); expects vacancy_shares left-joined for this candidate. */
function visibleWhere(status: string) {
  return and(
    isNull(mandates.closedAt),
    inArray(mandates.status, [...openMandateStatuses]),
    or(
      seesAllVacancies(status) ? eq(mandates.portalVisibility, "alle") : sql`false`,
      and(eq(mandates.portalVisibility, "ausgewaehlt"), isNotNull(vacancyShares.id)),
    ),
  );
}

function shareJoin(candidateId: number) {
  return and(eq(vacancyShares.mandateId, mandates.id), eq(vacancyShares.candidateId, candidateId));
}

export async function listVisibleVacancies(candidateId: number) {
  const db = await getDb();
  const status = await candidateStatus(db, candidateId);
  if (!status) return [];
  return db
    .select(portalColumns)
    .from(mandates)
    .leftJoin(vacancyShares, shareJoin(candidateId))
    .where(visibleWhere(status))
    .orderBy(desc(mandates.id))
    .limit(200)
    .then((rows) => rows.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || b.id - a.id));
}

async function findVisible(db: Db, candidateId: number, mandateId: number) {
  const status = await candidateStatus(db, candidateId);
  if (!status) return null;
  const [row] = await db
    .select(portalColumns)
    .from(mandates)
    .leftJoin(vacancyShares, shareJoin(candidateId))
    .where(and(eq(mandates.id, mandateId), visibleWhere(status)))
    .limit(1);
  return row ?? null;
}

async function hasObjection(db: Db, candidateId: number): Promise<boolean> {
  const [row] = await db.select({ at: candidates.objectionAt }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  return Boolean(row?.at);
}

export async function getVisibleVacancy(candidateId: number, mandateId: number) {
  const db = await getDb();
  const vacancy = await findVisible(db, candidateId, mandateId);
  if (!vacancy) return null;
  const [[submission], objection] = await Promise.all([
    db
      .select({ consentAt: submissions.consentAt, submittedAt: submissions.submittedAt, withdrawnAt: submissions.withdrawnAt })
      .from(submissions)
      .where(and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId)))
      .limit(1),
    hasObjection(db, candidateId),
  ]);
  return {
    ...vacancy,
    consentAt: submission?.consentAt ?? null,
    submittedAt: submission?.submittedAt ?? null,
    withdrawnAt: submission?.withdrawnAt ?? null,
    /** The candidate objected to any hand-over (recorded by KOVALI): no interest via the portal. */
    objection,
  };
}

/** Visible vacancies the candidate has not opened yet. */
export async function countNewVacancies(candidateId: number): Promise<number> {
  const rows = await listVisibleVacancies(candidateId);
  return rows.filter((r) => !r.seenAt).length;
}

/**
 * Marks a vacancy as seen on its first view. Vacancies for "alle" have no share row yet; it
 * is created here, so Ferhat sees who opened it.
 */
export async function markVacancySeen(candidateId: number, mandateId: number): Promise<void> {
  const db = await getDb();
  const vacancy = await findVisible(db, candidateId, mandateId);
  if (!vacancy || vacancy.seenAt) return;
  const now = new Date();
  await db
    .insert(vacancyShares)
    .values({ mandateId, candidateId, sharedAt: now, seenAt: now })
    .onConflictDoUpdate({
      target: [vacancyShares.mandateId, vacancyShares.candidateId],
      set: { seenAt: sql`coalesce(${vacancyShares.seenAt}, excluded.seen_at)` },
    });
}

export type VacancyAnswer = { response: "interessiert"; message: string | null; consent: true } | { response: "kein_interesse"; message: string | null };

export type VacancyAnswerResult =
  | { ok: false; reason: "not_visible" | "objection" }
  | {
      ok: true;
      shareId: number;
      /** A new submission (status "vorgemerkt") was created with the consent. */
      submissionCreated: boolean;
      /** Consent recorded on an existing submission that had none. */
      consentRecorded: boolean;
      /** Interest again: the earlier withdrawal of a profile not yet sent was lifted. */
      withdrawalLifted: boolean;
      /** Interest again after a withdrawal of a profile already sent: kept, Ferhat decides. */
      withdrawalKept: boolean;
      /** "Kein Interesse": the submission is now withdrawn (no further hand-over). */
      withdrawn: boolean;
      /** The profile had already been sent. */
      alreadySubmitted: boolean;
    };

/** Withdrawal note of a portal answer; the date is in withdrawn_at. */
export const PORTAL_WITHDRAWAL_NOTE = "Im Kandidatenportal zurückgezogen";

/**
 * Stores the candidate's answer.
 *
 * "Interessiert" requires the consent checkbox and records it on the submission for exactly
 * this mandate (consent_method "portal"; created as "vorgemerkt" when none exists; an existing
 * valid consent is kept as it was). An earlier withdrawal is lifted only while the profile has
 * not been sent: for a profile already with the client, Ferhat decides and records a renewed
 * consent himself. An objection recorded by KOVALI blocks the answer altogether.
 *
 * "Kein Interesse" marks the submission as withdrawn (withdrawn_at). The consent date stays:
 * the database requires it for a submitted profile, and for one not yet sent it documents what
 * was withdrawn; withdrawn_at alone blocks every further hand-over. A profile not yet sent ends
 * as "zurückgezogen", a sent one keeps its status and Ferhat is asked to review.
 */
export async function answerVacancy(candidateId: number, mandateId: number, answer: VacancyAnswer): Promise<VacancyAnswerResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const vacancy = await findVisible(tx, candidateId, mandateId);
    if (!vacancy) return { ok: false, reason: "not_visible" } as const;
    const interested = answer.response === "interessiert";
    if (interested && (await hasObjection(tx, candidateId))) return { ok: false, reason: "objection" } as const;
    const now = new Date();
    const pair = and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId));
    const current = () =>
      tx
        .select({ id: submissions.id, status: submissions.status, consentAt: submissions.consentAt, submittedAt: submissions.submittedAt, withdrawnAt: submissions.withdrawnAt })
        .from(submissions)
        .where(pair)
        .for("update")
        .limit(1)
        .then((rows) => rows[0] ?? null);
    let existing = await current();

    const result = { submissionCreated: false, consentRecorded: false, withdrawalLifted: false, withdrawalKept: false, withdrawn: false, alreadySubmitted: Boolean(existing?.submittedAt) };
    const consent = { consentAt: now, consentMethod: "portal", consentNote: `Im Kandidatenportal bestätigt am ${formatDateTime(now)}` };

    if (interested) {
      if (!existing) {
        const inserted = await tx
          .insert(submissions)
          .values({ mandateId, candidateId, status: "vorgemerkt", ...consent })
          .onConflictDoNothing()
          .returning({ id: submissions.id });
        result.submissionCreated = inserted.length > 0;
        // Created in the meantime (Ferhat added the person): continue with that row.
        if (!result.submissionCreated) existing = await current();
      }
      if (existing?.withdrawnAt && existing.submittedAt) {
        result.withdrawalKept = true;
      } else if (existing?.withdrawnAt || (existing && !existing.consentAt)) {
        result.withdrawalLifted = Boolean(existing.withdrawnAt);
        result.consentRecorded = true;
        await tx
          .update(submissions)
          .set({ ...consent, withdrawnAt: null, withdrawalNote: null, status: statusAfterConsent(existing), updatedAt: now })
          .where(eq(submissions.id, existing.id));
      }
    } else if (existing && !existing.withdrawnAt) {
      result.withdrawn = true;
      await tx
        .update(submissions)
        .set({ withdrawnAt: now, withdrawalNote: PORTAL_WITHDRAWAL_NOTE, status: statusAfterWithdrawal(existing), updatedAt: now })
        .where(eq(submissions.id, existing.id));
    }

    // Interest always needs Ferhat's attention; "kein Interesse" only when the person is in
    // his pipeline for this mandate (a submission exists).
    const hasSubmission = Boolean(existing) || result.submissionCreated;
    const reviewedAt = interested || hasSubmission ? null : now;
    const [share] = await tx
      .insert(vacancyShares)
      .values({
        mandateId,
        candidateId,
        sharedAt: now,
        seenAt: now,
        response: answer.response,
        responseAt: now,
        responseMessage: answer.message,
        reviewedAt,
      })
      .onConflictDoUpdate({
        target: [vacancyShares.mandateId, vacancyShares.candidateId],
        set: {
          response: answer.response,
          responseAt: now,
          responseMessage: answer.message,
          reviewedAt,
          seenAt: sql`coalesce(${vacancyShares.seenAt}, excluded.seen_at)`,
        },
      })
      .returning({ id: vacancyShares.id });
    return { ok: true, shareId: share.id, ...result } as const;
  });
}
