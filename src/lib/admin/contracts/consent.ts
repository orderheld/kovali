import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { statusAfterConsent } from "../consent";
import * as schema from "../db/schema";
import { todayIso } from "../format";

const { candidates, submissions } = schema;

type Db = NodePgDatabase<typeof schema>;

/** What signing an "Einwilligung" contract did to the matching submission. */
export type SignedConsentOutcome =
  | { applied: false; reason: "no_submission" }
  /** A valid consent was recorded before; it is not overwritten. */
  | { applied: false; reason: "consent_exists"; submissionId: number }
  /** Withdrawn on or after the signing day: the withdrawal stands. */
  | { applied: false; reason: "withdrawn_later"; submissionId: number; withdrawnAt: Date }
  /** The candidate objected on or after the signing day: the objection stands. */
  | { applied: false; reason: "objection_later"; submissionId: number; objectionAt: Date }
  | {
      applied: true;
      submissionId: number;
      /** The withdrawal this consent lifted (signed after it). */
      withdrawalLifted: { at: Date; note: string | null } | null;
      /** The candidate's objection this consent lifted (signed after it). */
      objectionLifted: { at: Date; note: string | null } | null;
    };

/**
 * A signed consent form for a mandate is the candidate's consent for the matching submission
 * (consent_method "vertrag"). An existing valid consent is never overwritten. A withdrawal or
 * an objection is only lifted when the form was signed after it (a later calendar day: a form
 * signed on the day of the withdrawal may predate it), never silently: the outcome tells the
 * caller what happened so it can be logged.
 */
export async function applySignedConsent(
  db: Db,
  contract: { number: string; candidateId: number; mandateId: number; signedOn: string },
): Promise<SignedConsentOutcome> {
  return db.transaction(async (tx) => {
    const [s] = await tx
      .select({
        id: submissions.id,
        candidateId: submissions.candidateId,
        status: submissions.status,
        consentAt: submissions.consentAt,
        submittedAt: submissions.submittedAt,
        withdrawnAt: submissions.withdrawnAt,
        withdrawalNote: submissions.withdrawalNote,
        objectionAt: candidates.objectionAt,
        objectionNote: candidates.objectionNote,
      })
      .from(submissions)
      .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
      .where(and(eq(submissions.candidateId, contract.candidateId), eq(submissions.mandateId, contract.mandateId)))
      .for("update")
      .limit(1);
    if (!s) return { applied: false, reason: "no_submission" } as const;
    if (s.objectionAt && contract.signedOn <= todayIso(s.objectionAt)) {
      return { applied: false, reason: "objection_later", submissionId: s.id, objectionAt: s.objectionAt } as const;
    }
    if (s.withdrawnAt && contract.signedOn <= todayIso(s.withdrawnAt)) {
      return { applied: false, reason: "withdrawn_later", submissionId: s.id, withdrawnAt: s.withdrawnAt } as const;
    }
    if (s.consentAt && !s.withdrawnAt) return { applied: false, reason: "consent_exists", submissionId: s.id } as const;

    const now = new Date();
    await tx
      .update(submissions)
      .set({
        consentAt: new Date(`${contract.signedOn}T12:00:00Z`),
        consentMethod: "vertrag",
        consentNote: `Einwilligung ${contract.number}`,
        withdrawnAt: null,
        withdrawalNote: null,
        status: statusAfterConsent(s),
        updatedAt: now,
      })
      .where(eq(submissions.id, s.id));
    let objectionLifted: { at: Date; note: string | null } | null = null;
    if (s.objectionAt) {
      await tx.update(candidates).set({ objectionAt: null, objectionNote: null, updatedAt: now }).where(eq(candidates.id, s.candidateId));
      objectionLifted = { at: s.objectionAt, note: s.objectionNote };
    }
    return {
      applied: true,
      submissionId: s.id,
      withdrawalLifted: s.withdrawnAt ? { at: s.withdrawnAt, note: s.withdrawalNote } : null,
      objectionLifted,
    } as const;
  });
}
