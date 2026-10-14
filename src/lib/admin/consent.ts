import { formatDate } from "./format";
import { consentMethods, labelOf } from "./options";

/**
 * Consent of a candidate for one mandate, read from the submission columns (consent_at,
 * consent_method, consent_note, withdrawn_at, withdrawal_note) and the candidate's objection
 * (candidates.objection_at). Pure functions shared by the mandate, candidate, portal, contract
 * and privacy code, so every place reads the same state the same way.
 */

export interface SubmissionConsent {
  consentAt: Date | null;
  consentMethod?: string | null;
  consentNote?: string | null;
  /** profileVariants: what the consent covers ("anonym" or "namentlich"). */
  consentScope?: string | null;
  withdrawnAt?: Date | null;
  withdrawalNote?: string | null;
}

/** What a consent covers: the anonymised dossier only, or also the dossier with the name. */
export type ConsentScope = "anonym" | "namentlich";

/**
 * Does the consent cover a dossier of this variant? Any consent covers the anonymised dossier;
 * the dossier with the name needs a consent recorded for it (a portal consent never is one: the
 * portal promises to ask again before the name is passed on).
 */
export function consentCovers(s: Pick<SubmissionConsent, "consentScope">, variant: string): boolean {
  return variant !== "namentlich" || s.consentScope === "namentlich";
}

/** "für das anonymisierte Dossier" or "für das Dossier mit Namen", null without a scope. */
export function consentScopeText(scope: string | null | undefined): string | null {
  if (scope === "namentlich") return "für das Dossier mit Namen";
  if (scope === "anonym") return "für das anonymisierte Dossier";
  return null;
}

/** "erteilt": a profile may leave KOVALI; "widerrufen": withdrawn or declined; "fehlt": never given. */
export type ConsentState = "erteilt" | "widerrufen" | "fehlt";

export function consentState(s: SubmissionConsent): ConsentState {
  if (s.withdrawnAt) return "widerrufen";
  return s.consentAt ? "erteilt" : "fehlt";
}

/** Consent recorded and not withdrawn. The candidate's objection is checked separately. */
export function hasValidConsent(s: SubmissionConsent): boolean {
  return consentState(s) === "erteilt";
}

/** "Mündlich" for "Mündlich (mit Notiz)": the label without its hint in brackets. */
export function consentMethodLabel(method: string): string {
  return labelOf(consentMethods, method).replace(/\s*\(.*\)$/, "");
}

/** "E-Mail: Antwort vom 12.10.2026", "Kandidatenportal", or null without a method or note. */
export function consentDetails(s: Pick<SubmissionConsent, "consentMethod" | "consentNote">): string | null {
  const method = s.consentMethod ? consentMethodLabel(s.consentMethod) : null;
  const note = s.consentNote?.trim() || null;
  if (method && note) return `${method}: ${note}`;
  return method ?? note;
}

/** "14.10.2026 (E-Mail: Antwort vom 12.10.2026)" for history entries and lists. */
export function consentSummary(s: SubmissionConsent): string {
  if (!s.consentAt) return "keine";
  const details = consentDetails(s);
  return details ? `${formatDate(s.consentAt)} (${details})` : formatDate(s.consentAt);
}

/**
 * Note of a withdrawal or objection: how the candidate communicated it and why, e.g.
 * "E-Mail: möchte nicht mehr vorgeschlagen werden". The date has its own column.
 */
export function withdrawalNoteText(method: string, reason: string | null | undefined): string {
  const label = consentMethodLabel(method);
  return reason?.trim() ? `${label}: ${reason.trim()}` : label;
}

/** "Widerrufen am 15.10.2026: möchte nicht mehr vorgeschlagen werden". */
export function withdrawalSummary(s: Pick<SubmissionConsent, "withdrawnAt" | "withdrawalNote">): string | null {
  if (!s.withdrawnAt) return null;
  return `Widerrufen am ${formatDate(s.withdrawnAt)}${s.withdrawalNote?.trim() ? `: ${s.withdrawalNote.trim()}` : ""}`;
}

/** "Widerspruch seit 15.10.2026: per E-Mail". */
export function objectionSummary(c: { objectionAt: Date | null; objectionNote?: string | null }): string | null {
  if (!c.objectionAt) return null;
  return `Widerspruch seit ${formatDate(c.objectionAt)}${c.objectionNote?.trim() ? `: ${c.objectionNote.trim()}` : ""}`;
}

/** Statuses after which a submission is decided; a withdrawal for all mandates leaves them alone. */
export const decidedSubmissionStatuses = ["zusage", "absage", "zurueckgezogen"] as const;

/**
 * Status after a withdrawal: a profile not yet proposed ends as "zurueckgezogen"; a proposed one
 * keeps its status, because the client already has it and Ferhat decides how to go on.
 */
export function statusAfterWithdrawal(s: { status: string; submittedAt: Date | null }): string {
  if (s.submittedAt || (decidedSubmissionStatuses as readonly string[]).includes(s.status)) return s.status;
  return "zurueckgezogen";
}

/**
 * Status after a renewed consent: waiting for consent is over, and a withdrawal that ended an
 * unproposed submission is lifted, so it is back to "vorgemerkt".
 */
export function statusAfterConsent(s: { status: string; submittedAt: Date | null; withdrawnAt?: Date | null }): string {
  if (s.status === "einwilligung_offen") return "vorgemerkt";
  if (s.status === "zurueckgezogen" && !s.submittedAt && s.withdrawnAt) return "vorgemerkt";
  return s.status;
}
