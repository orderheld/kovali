import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
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

export async function getVisibleVacancy(candidateId: number, mandateId: number) {
  const db = await getDb();
  const vacancy = await findVisible(db, candidateId, mandateId);
  if (!vacancy) return null;
  const [submission] = await db
    .select({ consentAt: submissions.consentAt, submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId)))
    .limit(1);
  return { ...vacancy, consentAt: submission?.consentAt ?? null, submittedAt: submission?.submittedAt ?? null };
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
  | { ok: false }
  | {
      ok: true;
      shareId: number;
      /** A new submission (status "vorgemerkt") was created with the consent. */
      submissionCreated: boolean;
      /** Consent that had not been used yet was removed. */
      consentRemoved: boolean;
      /** The profile had already been sent; the consent stays on record, the share is marked. */
      alreadySubmitted: boolean;
    };

/**
 * Stores the candidate's answer. "Interessiert" requires the consent checkbox and records it
 * on the submission for exactly this mandate (created as "vorgemerkt" when none exists; an
 * existing consent is kept as it was). "Kein Interesse" withdraws a consent that has not been
 * used; a consent already used for a submitted profile stays on record (the database requires
 * it for submitted profiles), the note says it was withdrawn and Ferhat is asked to review.
 */
export async function answerVacancy(candidateId: number, mandateId: number, answer: VacancyAnswer): Promise<VacancyAnswerResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const vacancy = await findVisible(tx, candidateId, mandateId);
    if (!vacancy) return { ok: false } as const;
    const now = new Date();
    const when = formatDateTime(now);
    const [existing] = await tx
      .select({ id: submissions.id, consentAt: submissions.consentAt, consentNote: submissions.consentNote, submittedAt: submissions.submittedAt })
      .from(submissions)
      .where(and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId)))
      .for("update")
      .limit(1);

    let submissionCreated = false;
    let consentRemoved = false;
    let alreadySubmitted = false;

    if (answer.response === "interessiert") {
      const note = `Im Kandidatenportal bestätigt am ${when}`;
      if (!existing) {
        const inserted = await tx
          .insert(submissions)
          .values({ mandateId, candidateId, status: "vorgemerkt", consentAt: now, consentNote: note })
          .onConflictDoNothing()
          .returning({ id: submissions.id });
        submissionCreated = inserted.length > 0;
        if (!submissionCreated) {
          // Created in the meantime (Ferhat added the person): only record the consent.
          await tx
            .update(submissions)
            .set({ consentAt: now, consentNote: note, updatedAt: now })
            .where(and(eq(submissions.mandateId, mandateId), eq(submissions.candidateId, candidateId), isNull(submissions.consentAt)));
        }
      } else if (!existing.consentAt) {
        await tx.update(submissions).set({ consentAt: now, consentNote: note, updatedAt: now }).where(eq(submissions.id, existing.id));
      }
    } else if (existing?.consentAt) {
      if (existing.submittedAt) {
        alreadySubmitted = true;
        const note = `${existing.consentNote ? `${existing.consentNote}; ` : ""}im Kandidatenportal zurückgezogen am ${when}, keine weitere Weitergabe`;
        await tx.update(submissions).set({ consentNote: note.slice(0, 1000), updatedAt: now }).where(eq(submissions.id, existing.id));
      } else {
        consentRemoved = true;
        await tx
          .update(submissions)
          .set({ consentAt: null, consentNote: `Einwilligung im Kandidatenportal zurückgezogen am ${when}`, updatedAt: now })
          .where(eq(submissions.id, existing.id));
      }
    } else if (existing?.submittedAt) {
      alreadySubmitted = true;
    }

    // Interest always needs Ferhat's attention; "kein Interesse" only when the person is in
    // his pipeline for this mandate (a submission exists).
    const hasSubmission = Boolean(existing) || submissionCreated;
    const reviewedAt = answer.response === "interessiert" || hasSubmission ? null : now;
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
    return { ok: true, shareId: share.id, submissionCreated, consentRemoved, alreadySubmitted } as const;
  });
}
