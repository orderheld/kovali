import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { statusAfterConsent, type ConsentScope } from "../consent";
import * as schema from "../db/schema";
import { todayIso } from "../format";

const { candidates, mandates, submissions } = schema;

type Db = NodePgDatabase<typeof schema>;

/** What signing an "Einwilligung" contract did to the matching submission. */
export type SignedConsentOutcome =
  | { applied: false; reason: "no_submission" }
  /** A valid consent that covers at least as much was recorded before; it is not overwritten. */
  | { applied: false; reason: "consent_exists"; submissionId: number }
  /** Withdrawn on or after the signing day: the withdrawal stands. */
  | { applied: false; reason: "withdrawn_later"; submissionId: number; withdrawnAt: Date }
  /** The candidate objected on or after the signing day: the objection stands. */
  | { applied: false; reason: "objection_later"; submissionId: number; objectionAt: Date }
  /**
   * The form does not cover this hand-over: its recipient is not the mandate's company, or it
   * allows the anonymised profile only while the submission is with the name.
   */
  | { applied: false; reason: "scope_mismatch"; submissionId: number; recipient: boolean; variant: boolean }
  | {
      applied: true;
      submissionId: number;
      /** What the recorded consent covers now: the variant of the form. */
      scope: ConsentScope;
      /** A named form widened an existing consent for the anonymised dossier only. */
      widened: boolean;
      /** The withdrawal this consent lifted (signed after it). */
      withdrawalLifted: { at: Date; note: string | null } | null;
      /** The candidate's objection this consent lifted (signed after it). */
      objectionLifted: { at: Date; note: string | null } | null;
    };

/**
 * A signed consent form for a mandate is the candidate's consent for the matching submission
 * (consent_method "vertrag", consent_scope = the form's variant), but only when it covers that
 * hand-over: the recipient must be the mandate's company, and a form for the anonymised profile
 * does not cover a submission with the name. An existing valid consent is never overwritten,
 * except that a named form widens a consent for the anonymised dossier only (e.g. from the
 * portal). A withdrawal or an objection is only lifted when the form was signed after it (a
 * later calendar day: a form signed on the day of the withdrawal may predate it), never
 * silently: the outcome tells the caller what happened so it can be logged.
 */
export async function applySignedConsent(
  db: Db,
  contract: { number: string; candidateId: number; mandateId: number; signedOn: string; companyId: number | null; variant: string },
): Promise<SignedConsentOutcome> {
  return db.transaction(async (tx) => {
    const [s] = await tx
      .select({
        id: submissions.id,
        candidateId: submissions.candidateId,
        status: submissions.status,
        consentAt: submissions.consentAt,
        consentScope: submissions.consentScope,
        profileVariant: submissions.profileVariant,
        submittedAt: submissions.submittedAt,
        withdrawnAt: submissions.withdrawnAt,
        withdrawalNote: submissions.withdrawalNote,
        objectionAt: candidates.objectionAt,
        objectionNote: candidates.objectionNote,
        mandateCompanyId: mandates.companyId,
      })
      .from(submissions)
      .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
      .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
      .where(and(eq(submissions.candidateId, contract.candidateId), eq(submissions.mandateId, contract.mandateId)))
      .for("update", { of: [submissions, candidates] })
      .limit(1);
    if (!s) return { applied: false, reason: "no_submission" } as const;
    if (s.objectionAt && contract.signedOn <= todayIso(s.objectionAt)) {
      return { applied: false, reason: "objection_later", submissionId: s.id, objectionAt: s.objectionAt } as const;
    }
    if (s.withdrawnAt && contract.signedOn <= todayIso(s.withdrawnAt)) {
      return { applied: false, reason: "withdrawn_later", submissionId: s.id, withdrawnAt: s.withdrawnAt } as const;
    }
    const scope: ConsentScope = contract.variant === "namentlich" ? "namentlich" : "anonym";
    const recipient = contract.companyId === null || contract.companyId !== s.mandateCompanyId;
    const variant = scope === "anonym" && s.profileVariant === "namentlich";
    if (recipient || variant) return { applied: false, reason: "scope_mismatch", submissionId: s.id, recipient, variant } as const;
    const valid = s.consentAt !== null && !s.withdrawnAt;
    const widened = valid && scope === "namentlich" && s.consentScope !== "namentlich";
    if (valid && !widened) return { applied: false, reason: "consent_exists", submissionId: s.id } as const;

    const now = new Date();
    await tx
      .update(submissions)
      .set({
        consentAt: new Date(`${contract.signedOn}T12:00:00Z`),
        consentMethod: "vertrag",
        consentNote: `Einwilligung ${contract.number}`,
        consentScope: scope,
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
      scope,
      widened,
      withdrawalLifted: s.withdrawnAt ? { at: s.withdrawnAt, note: s.withdrawalNote } : null,
      objectionLifted,
    } as const;
  });
}
