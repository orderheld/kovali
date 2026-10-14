"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyExists, contactCompanyId, getMandate, matchCandidateRow } from "@/lib/admin/data/mandates";
import { consentSummary, objectionSummary, withdrawalNoteText } from "@/lib/admin/consent";
import {
  firmOf,
  getShareContext,
  getSubmissionContext,
  giveSubmissionConsent,
  markSubmissionStatus,
  subcontractorCheck,
  withdrawSubmission,
  type CandidateFirm,
} from "@/lib/admin/data/submissions";
import { getDb } from "@/lib/admin/db/client";
import { candidates, mandates, submissions, vacancyShares } from "@/lib/admin/db/schema";
import { displayNo, formatDate, formatDateTime, fullName, todayIso } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { matchCandidate } from "@/lib/admin/matching";
import { consentMethods, labelOf, mandateStatuses, portalVisibilities, profileVariants, submissionStatuses } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { normalizeSkills } from "@/lib/admin/skills";
import {
  consentTimestamp,
  CONSENT_MISSING,
  defaultSubmissionRates,
  isWithdrawn,
  nextClosedAt,
  OBJECTION_ACTIVE,
  renewedConsentError,
  submissionStatusChange,
  submittedStatuses,
} from "./rules";
import {
  consentSchema,
  mandateSchema,
  mandateStatusSchema,
  portalSchema,
  shareSchema,
  submissionStatusSchema,
  submissionTermsSchema,
  withdrawalSchema,
  type MandateInput,
} from "./schema";

const idSchema = z.number().int().positive();

const mandateOwner = (id: number): OwnerRef => ({ type: "mandate", id });
const candidateOwner = (id: number): OwnerRef => ({ type: "candidate", id });

/** True when a database error (possibly wrapped by Drizzle) comes from the named constraint. */
function violates(error: unknown, constraint: string): boolean {
  for (let e: unknown = error, depth = 0; e && typeof e === "object" && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    if ((e as { constraint?: unknown }).constraint === constraint) return true;
  }
  return false;
}

// --- Mandates ----------------------------------------------------------------------

/**
 * Checks the links of a mandate and normalises its skills. A contact without a company sets
 * the company; a contact of another company is rejected, so contracts never mix them up.
 */
async function prepareMandate(input: MandateInput): Promise<{ ok: true; values: MandateInput } | { ok: false; state: ActionState }> {
  let companyId = input.companyId;
  if (companyId && !(await companyExists(companyId))) {
    return { ok: false, state: fail("Bitte prüfe die markierten Felder.", { companyId: "Diese Firma gibt es nicht mehr." }) };
  }
  if (input.contactId) {
    const contactCompany = await contactCompanyId(input.contactId);
    if (!contactCompany) return { ok: false, state: fail("Bitte prüfe die markierten Felder.", { contactId: "Diesen Kontakt gibt es nicht mehr." }) };
    if (companyId && contactCompany !== companyId) {
      return { ok: false, state: fail("Bitte prüfe die markierten Felder.", { contactId: "Der Kontakt gehört nicht zur gewählten Firma." }) };
    }
    companyId = contactCompany;
  }
  const requiredSkills = normalizeSkills(input.requiredSkills);
  const required = new Set(requiredSkills.map((s) => s.toLowerCase()));
  // A skill is either a must or a nice-to-have, never both (it would count twice in matching).
  const niceSkills = normalizeSkills(input.niceSkills).filter((s) => !required.has(s.toLowerCase()));
  return { ok: true, values: { ...input, companyId, requiredSkills, niceSkills } };
}

export async function createMandate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(mandateSchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepareMandate(parsed.data);
  if (!prepared.ok) return prepared.state;
  const values = prepared.values;
  const db = await getDb();
  const [row] = await db
    .insert(mandates)
    .values({ ...values, closedAt: nextClosedAt({ status: "neu", closedAt: null }, values.status, new Date()) })
    .returning({ id: mandates.id });
  const owners: OwnerRef[] = [mandateOwner(row.id), ...(values.companyId ? [{ type: "company" as const, id: values.companyId }] : [])];
  await logActivity(owners, `Mandat erfasst: «${values.title}» (${displayNo.mandate(row.id)}), Status ${labelOf(mandateStatuses, values.status)}`);
  await audit("create", { entity: "mandate", entityId: row.id, summary: `Mandat ${displayNo.mandate(row.id)}` });
  redirect(`/admin/mandate/${row.id}`);
}

export async function updateMandate(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const mandateId = idSchema.parse(id);
  const parsed = parseForm(mandateSchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepareMandate(parsed.data);
  if (!prepared.ok) return prepared.state;
  const values = prepared.values;
  const db = await getDb();
  const [current] = await db.select({ status: mandates.status, closedAt: mandates.closedAt }).from(mandates).where(eq(mandates.id, mandateId)).limit(1);
  if (!current) return fail("Dieses Mandat gibt es nicht mehr.");
  const now = new Date();
  await db
    .update(mandates)
    .set({ ...values, closedAt: nextClosedAt(current, values.status, now), updatedAt: now })
    .where(eq(mandates.id, mandateId));
  if (current.status !== values.status) {
    await logActivity(mandateOwner(mandateId), `Status geändert: ${labelOf(mandateStatuses, current.status)} → ${labelOf(mandateStatuses, values.status)}`);
  }
  await audit("update", { entity: "mandate", entityId: mandateId, summary: `Mandat ${displayNo.mandate(mandateId)}` });
  redirect(`/admin/mandate/${mandateId}`);
}

export async function deleteMandate(id: number): Promise<ActionState> {
  await requireAdmin();
  const mandateId = idSchema.parse(id);
  const db = await getDb();
  // Submissions, portal shares, notes and documents go with it (on delete cascade);
  // contracts keep their data and lose the link.
  const [row] = await db
    .delete(mandates)
    .where(eq(mandates.id, mandateId))
    .returning({ id: mandates.id, title: mandates.title, companyId: mandates.companyId });
  if (!row) return fail("Dieses Mandat gibt es nicht mehr.");
  if (row.companyId) await logActivity({ type: "company", id: row.companyId }, `Mandat gelöscht: «${row.title}» (${displayNo.mandate(row.id)})`);
  await audit("delete", { entity: "mandate", entityId: mandateId, summary: `Mandat ${displayNo.mandate(mandateId)}` });
  redirect("/admin/mandate");
}

/** Quick status change on the detail page. */
export async function setMandateStatus(id: number, status: string): Promise<ActionState> {
  await requireAdmin();
  const mandateId = idSchema.parse(id);
  const next = mandateStatusSchema.safeParse(status);
  if (!next.success) return fail("Ungültiger Status.");
  const db = await getDb();
  const [current] = await db.select({ status: mandates.status, closedAt: mandates.closedAt }).from(mandates).where(eq(mandates.id, mandateId)).limit(1);
  if (!current) return fail("Dieses Mandat gibt es nicht mehr.");
  if (current.status === next.data) return ok();
  const now = new Date();
  await db
    .update(mandates)
    .set({ status: next.data, closedAt: nextClosedAt(current, next.data, now), updatedAt: now })
    .where(eq(mandates.id, mandateId));
  await logActivity(mandateOwner(mandateId), `Status geändert: ${labelOf(mandateStatuses, current.status)} → ${labelOf(mandateStatuses, next.data)}`);
  await audit("update", { entity: "mandate", entityId: mandateId, summary: `Mandat ${displayNo.mandate(mandateId)}: Status ${next.data}` });
  refresh();
  return ok("Status gespeichert.");
}

// --- Submissions ---------------------------------------------------------------------

function submissionSummary(s: { id: number; mandateId: number; candidateId: number }): string {
  return `Vorschlag ${displayNo.submission(s.id)} (${displayNo.mandate(s.mandateId)}, ${displayNo.candidate(s.candidateId)})`;
}

/** "Anna Muster (K-0001) für «SAP FI Consultant» (M-0003)", for history entries. */
function submissionLabel(s: { mandateId: number; candidateId: number; mandateTitle: string; candidateFirstName: string; candidateLastName: string }) {
  const name = fullName({ firstName: s.candidateFirstName, lastName: s.candidateLastName });
  return `${name} (${displayNo.candidate(s.candidateId)}) für «${s.mandateTitle}» (${displayNo.mandate(s.mandateId)})`;
}

/** "Muster Consulting GmbH (F-0012)", the subcontractor firm an offer runs through. */
function firmLabel(firm: CandidateFirm): string {
  return `${firm.name} (${displayNo.company(firm.id)})`;
}

/** Puts a candidate on the shortlist of a mandate, with the current match score. */
export async function reserveCandidate(mandateId: number, candidateId: number): Promise<ActionState> {
  await requireAdmin();
  const mid = idSchema.parse(mandateId);
  const cid = idSchema.parse(candidateId);
  const [mandate, candidate] = await Promise.all([getMandate(mid), matchCandidateRow(cid)]);
  if (!mandate) return fail("Dieses Mandat gibt es nicht mehr.");
  if (!candidate) return fail("Diesen Kandidaten gibt es nicht mehr.");
  if (candidate.status === "archiviert") return fail("Archivierte Kandidaten können nicht vorgemerkt werden.");
  // An objection to any hand-over also rules out new shortlist entries.
  if (candidate.objectionAt) return fail(OBJECTION_ACTIVE);
  // Candidates are only passed on through their own firm (subcontractor of KOVALI).
  const firm = subcontractorCheck(firmOf(candidate));
  if (!firm.ok) return fail(firm.error);
  // The score is computed again here; a value from the browser is never trusted.
  const match = matchCandidate(candidate, mandate, todayIso());
  const db = await getDb();
  const [row] = await db
    .insert(submissions)
    .values({ mandateId: mid, candidateId: cid, status: "vorgemerkt", matchScore: match.score, ...defaultSubmissionRates(mandate, candidate) })
    .onConflictDoNothing()
    .returning({ id: submissions.id });
  if (!row) return fail("Ist bereits vorgemerkt.");
  const label = submissionLabel({ mandateId: mid, candidateId: cid, mandateTitle: mandate.title, candidateFirstName: candidate.firstName, candidateLastName: candidate.lastName });
  await logActivity([mandateOwner(mid), candidateOwner(cid)], `Vorgemerkt: ${label}, Score ${match.score}, über ${firmLabel(firm.firm)}`);
  await audit("create", { entity: "submission", entityId: row.id, summary: submissionSummary({ id: row.id, mandateId: mid, candidateId: cid }) });
  refresh();
  return ok("Vorgemerkt.");
}

async function changeSubmissionStatus(submissionId: number, status: string, { onlyIfNotSubmitted = false } = {}): Promise<ActionState> {
  const next = submissionStatusSchema.safeParse(status);
  if (!next.success) return fail("Ungültiger Status.");
  const current = await getSubmissionContext(submissionId);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  if (onlyIfNotSubmitted && current.submittedAt) return fail(`Bereits am ${formatDate(current.submittedAt)} vorgeschlagen.`);
  if (current.status === next.data && (current.submittedAt || !onlyIfNotSubmitted)) return ok();
  const now = new Date();
  const change = submissionStatusChange(current, next.data, now);
  if (!change.ok) return fail(change.error);
  const firm = subcontractorCheck(firmOf(current));
  // The firm is checked again at the hand-over: it may have been unlinked since the shortlist.
  if (change.submittedAt && !current.submittedAt && !firm.ok) return fail(firm.error);
  const firstSubmission = !current.submittedAt && change.submittedAt;
  try {
    // The first hand-over keeps the firm it went through, even if the candidate's firm changes later.
    const saved = await markSubmissionStatus(submissionId, {
      status: next.data,
      submittedAt: change.submittedAt,
      subcontractorCompanyId: firstSubmission && firm.ok ? firm.firm.id : undefined,
      toClient: (submittedStatuses as readonly string[]).includes(next.data),
    });
    if (!saved) return fail("Die Fachperson hat inzwischen widerrufen oder widersprochen. Bitte lade die Seite neu.");
  } catch (error) {
    // The consent may have been removed in the meantime; the database rule has the last word.
    if (violates(error, "submissions_consent_before_submit")) return fail(CONSENT_MISSING);
    throw error;
  }
  const label = submissionLabel(current);
  const recipient = current.recipientCompanyId ? `${current.recipientCompanyName} (${displayNo.company(current.recipientCompanyId)})` : "–";
  // The history documents each hand-over: who, to whom, which dossier, when, on which consent.
  await logActivity(
    [mandateOwner(current.mandateId), candidateOwner(current.candidateId)],
    firstSubmission
      ? `Profil vorgeschlagen an ${recipient}: ${label}, über ${firm.ok ? firmLabel(firm.firm) : "–"}. ` +
          `Dossier ${labelOf(profileVariants, current.profileVariant).toLowerCase()}, ${formatDateTime(now)}. ` +
          `Einwilligung ${consentSummary(current)}.`
      : `Vorschlag ${label}: ${labelOf(submissionStatuses, current.status)} → ${labelOf(submissionStatuses, next.data)}`,
  );
  await audit("update", {
    entity: "submission",
    entityId: submissionId,
    summary: firstSubmission
      ? `${submissionSummary(current)}: vorgeschlagen an ${current.recipientCompanyId ? displayNo.company(current.recipientCompanyId) : "–"}` +
        ` über ${firm.ok ? displayNo.company(firm.firm.id) : "–"}, Dossier ${current.profileVariant}`
      : `${submissionSummary(current)}: Status ${next.data}`,
  });
  refresh();
  return ok(firstSubmission ? "Als vorgeschlagen markiert." : "Status gespeichert.");
}

export async function setSubmissionStatus(submissionId: number, status: string): Promise<ActionState> {
  await requireAdmin();
  return changeSubmissionStatus(idSchema.parse(submissionId), status);
}

/** The profile went to the client: only with the candidate's consent for this mandate. */
export async function markSubmitted(submissionId: number): Promise<ActionState> {
  await requireAdmin();
  return changeSubmissionStatus(idSchema.parse(submissionId), "vorgeschlagen", { onlyIfNotSubmitted: true });
}

export async function recordConsent(submissionId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const sid = idSchema.parse(submissionId);
  const parsed = parseForm(consentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const current = await getSubmissionContext(sid);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  const now = new Date();
  const at = consentTimestamp(parsed.data.consentDate, todayIso(now), now);
  if (!(at instanceof Date)) return fail("Bitte prüfe die markierten Felder.", { consentDate: at.error });
  // A renewed consent must not predate the withdrawal of this submission or the candidate's objection.
  const tooEarly = renewedConsentError(parsed.data.consentDate, current);
  if (tooEarly) return fail("Bitte prüfe die markierten Felder.", { consentDate: tooEarly });
  const consent = { at, method: parsed.data.consentMethod, note: parsed.data.consentNote };
  const result = await giveSubmissionConsent(sid, consent);
  if (!result) return fail("Diesen Vorschlag gibt es nicht mehr.");
  const owners = [mandateOwner(current.mandateId), candidateOwner(current.candidateId)];
  const summary = consentSummary({ consentAt: at, consentMethod: consent.method, consentNote: consent.note });
  await logActivity(owners, `${result.withdrawalLifted ? "Erneute Einwilligung" : "Einwilligung"} erfasst: ${submissionLabel(current)}, ${summary}`);
  await audit("consent", { entity: "submission", entityId: sid, summary: `${submissionSummary(current)}: Einwilligung erfasst (${consent.method})` });
  if (result.objectionLifted) {
    // The objection is a fact on the candidate: its end is recorded there as well.
    await logActivity(
      candidateOwner(current.candidateId),
      `Widerspruch aufgehoben durch die erneute Einwilligung für «${current.mandateTitle}» (${displayNo.mandate(current.mandateId)}). Vorher: ${objectionSummary({ objectionAt: result.objectionLifted.at, objectionNote: result.objectionLifted.note })}`,
    );
    await audit("consent", {
      entity: "candidate",
      entityId: current.candidateId,
      summary: `Kandidat ${displayNo.candidate(current.candidateId)}: Widerspruch aufgehoben durch Einwilligung ${displayNo.submission(sid)}`,
    });
  }
  refresh();
  return ok(result.objectionLifted ? "Einwilligung erfasst. Der Widerspruch ist damit aufgehoben." : "Einwilligung erfasst.");
}

/**
 * The candidate withdraws consent for this mandate, or objects to every further hand-over
 * ("Für alle Mandate"). The consent date stays as record of earlier hand-overs; withdrawn_at
 * blocks any further one until the candidate agrees again.
 */
export async function recordWithdrawal(submissionId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const sid = idSchema.parse(submissionId);
  const parsed = parseForm(withdrawalSchema, formData);
  if (!parsed.ok) return parsed.state;
  const current = await getSubmissionContext(sid);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  if (isWithdrawn(current)) return fail("Der Widerruf ist bereits erfasst. Einen Widerspruch für alle Mandate erfasst du beim Kandidaten.");
  const now = new Date();
  const at = consentTimestamp(parsed.data.withdrawalDate, todayIso(now), now);
  if (!(at instanceof Date)) return fail("Bitte prüfe die markierten Felder.", { withdrawalDate: at.error });
  const note = withdrawalNoteText(parsed.data.withdrawalMethod, parsed.data.withdrawalReason);
  const allMandates = parsed.data.allMandates;
  const result = await withdrawSubmission(sid, { at, note, allMandates });
  if (!result) return fail("Der Widerruf ist bereits erfasst.");
  const { others } = result;
  const scope = allMandates ? "Widerspruch gegen jede weitere Weitergabe" : "Einwilligung für dieses Mandat widerrufen";
  await logActivity(
    [mandateOwner(current.mandateId), candidateOwner(current.candidateId)],
    `${scope}: ${submissionLabel(current)}, am ${formatDate(at)} (${note}).`,
  );
  for (const o of others) {
    await logActivity(
      mandateOwner(o.mandateId),
      `Widerspruch von ${displayNo.candidate(current.candidateId)} gegen jede weitere Weitergabe, am ${formatDate(at)} (${note}).` +
        (o.submittedAt ? " Das Profil wurde bereits vorgeschlagen: Auftraggeber informieren." : ""),
    );
  }
  await audit("consent", {
    entity: "submission",
    entityId: sid,
    summary: `${submissionSummary(current)}: ${allMandates ? `Widerspruch alle Mandate (${others.length} weitere)` : "Widerruf dieses Mandat"}`,
  });
  if (allMandates) {
    await audit("consent", { entity: "candidate", entityId: current.candidateId, summary: `Kandidat ${displayNo.candidate(current.candidateId)}: Widerspruch erfasst` });
  }
  refresh();
  if (!allMandates) return ok("Widerruf erfasst.");
  return ok(others.length ? `Widerspruch erfasst. Auch bei ${others.length} weiteren Mandaten ist keine Weitergabe mehr möglich.` : "Widerspruch erfasst.");
}

/** Removes a consent recorded by mistake; impossible once the profile has been proposed. */
export async function clearConsent(submissionId: number): Promise<ActionState> {
  await requireAdmin();
  const sid = idSchema.parse(submissionId);
  const current = await getSubmissionContext(sid);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  const locked = "Das Profil wurde bereits vorgeschlagen; die Einwilligung bleibt dokumentiert.";
  if (current.submittedAt) return fail(locked);
  if (isWithdrawn(current)) return fail("Ein Widerruf bleibt dokumentiert. Erfasse bei Bedarf eine neue Einwilligung.");
  const db = await getDb();
  try {
    await db.update(submissions).set({ consentAt: null, consentMethod: null, consentNote: null, updatedAt: new Date() }).where(eq(submissions.id, sid));
  } catch (error) {
    if (violates(error, "submissions_consent_before_submit")) return fail(locked);
    throw error;
  }
  await logActivity(
    [mandateOwner(current.mandateId), candidateOwner(current.candidateId)],
    `Einwilligung entfernt (Irrtum): ${submissionLabel(current)}, war ${labelOf(consentMethods, current.consentMethod)} vom ${formatDate(current.consentAt)}`,
  );
  await audit("consent", { entity: "submission", entityId: sid, summary: `${submissionSummary(current)}: Einwilligung entfernt` });
  refresh();
  return ok("Einwilligung entfernt.");
}

export async function updateSubmissionTerms(submissionId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const sid = idSchema.parse(submissionId);
  const parsed = parseForm(submissionTermsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const current = await getSubmissionContext(sid);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  // The record must keep which dossier was sent; a later version belongs in a note.
  if (current.submittedAt && parsed.data.profileVariant !== current.profileVariant) {
    return fail("Bitte prüfe die markierten Felder.", {
      profileVariant: `Bereits als «${labelOf(profileVariants, current.profileVariant)}» vorgeschlagen; halte eine weitere Version als Notiz fest.`,
    });
  }
  const db = await getDb();
  await db
    .update(submissions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(submissions.id, sid));
  await audit("update", { entity: "submission", entityId: sid, summary: `${submissionSummary(current)}: Konditionen` });
  refresh();
  return ok("Gespeichert.");
}

export async function removeSubmission(submissionId: number): Promise<ActionState> {
  await requireAdmin();
  const sid = idSchema.parse(submissionId);
  const current = await getSubmissionContext(sid);
  if (!current) return fail("Diesen Vorschlag gibt es nicht mehr.");
  const db = await getDb();
  await db.delete(submissions).where(eq(submissions.id, sid));
  // The history keeps the fact, also when the profile had already been proposed.
  await logActivity(
    [mandateOwner(current.mandateId), candidateOwner(current.candidateId)],
    `Vorschlag entfernt: ${submissionLabel(current)}${current.submittedAt ? ` (vorgeschlagen am ${formatDate(current.submittedAt)})` : ""}`,
  );
  await audit("delete", { entity: "submission", entityId: sid, summary: submissionSummary(current) });
  refresh();
  return ok("Entfernt.");
}

// --- Candidate portal ------------------------------------------------------------------

export async function savePortal(mandateId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const mid = idSchema.parse(mandateId);
  const parsed = parseForm(portalSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [current] = await db.select({ visibility: mandates.portalVisibility }).from(mandates).where(eq(mandates.id, mid)).limit(1);
  if (!current) return fail("Dieses Mandat gibt es nicht mehr.");
  await db
    .update(mandates)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(mandates.id, mid));
  if (current.visibility !== parsed.data.portalVisibility) {
    await logActivity(mandateOwner(mid), `Kandidatenportal: ${labelOf(portalVisibilities, parsed.data.portalVisibility)}`);
  }
  await audit("update", { entity: "mandate", entityId: mid, summary: `Mandat ${displayNo.mandate(mid)}: Portal ${parsed.data.portalVisibility}` });
  refresh();
  return ok("Gespeichert.");
}

/** Offers the vacancy to selected candidates in the portal; existing shares stay as they are. */
export async function shareWithCandidates(mandateId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const mid = idSchema.parse(mandateId);
  const parsed = parseForm(shareSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [mandate] = await db
    .select({ title: mandates.portalTitle, description: mandates.portalDescription, visibility: mandates.portalVisibility })
    .from(mandates)
    .where(eq(mandates.id, mid))
    .limit(1);
  if (!mandate) return fail("Dieses Mandat gibt es nicht mehr.");
  // Candidates only ever see the neutral portal texts, never the internal title.
  if (!mandate.title || !mandate.description) return fail("Speichere zuerst Titel und Beschreibung für das Portal.");
  const ids = [...new Set(parsed.data.candidateIds)];
  const people = await db
    .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName })
    .from(candidates)
    .where(and(inArray(candidates.id, ids), ne(candidates.status, "archiviert")));
  if (!people.length) return fail("Diese Kandidaten gibt es nicht mehr.", { candidateIds: "Bitte die Auswahl prüfen." });
  const inserted = await db
    .insert(vacancyShares)
    .values(people.map((p) => ({ mandateId: mid, candidateId: p.id })))
    .onConflictDoNothing()
    .returning({ candidateId: vacancyShares.candidateId });
  const shared = people.filter((p) => inserted.some((i) => i.candidateId === p.id));
  // Sharing means the selected candidates should see it; "keine" would hide it from them.
  const opened = mandate.visibility === "keine" && shared.length > 0;
  if (opened) await db.update(mandates).set({ portalVisibility: "ausgewaehlt", updatedAt: new Date() }).where(eq(mandates.id, mid));
  if (shared.length) {
    // One entry per person with both owners: it shows on the mandate and on the candidate and
    // goes with the candidate when the profile is anonymised or deleted. A mandate-only entry
    // would keep the names.
    for (const p of shared) {
      await logActivity(
        [mandateOwner(mid), candidateOwner(p.id)],
        `Vakanz im Kandidatenportal geteilt: «${mandate.title}» (${displayNo.mandate(mid)}) mit ${fullName(p)} (${displayNo.candidate(p.id)})`,
      );
    }
    await audit("share", {
      entity: "mandate",
      entityId: mid,
      summary: `Mandat ${displayNo.mandate(mid)} geteilt mit ${shared.map((p) => displayNo.candidate(p.id)).join(", ")}`,
    });
  }
  refresh();
  const skipped = people.length - shared.length;
  if (!shared.length) return ok("Bereits mit allen gewählten Kandidaten geteilt.");
  return ok(
    [
      `Mit ${shared.length} ${shared.length === 1 ? "Kandidat" : "Kandidaten"} geteilt.`,
      skipped ? `${skipped} bereits geteilt.` : null,
      opened ? "Sichtbarkeit auf «Nur ausgewählte Kandidaten» gesetzt." : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Ferhat has read a candidate's answer ("Erledigt"). */
export async function markShareReviewed(shareId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(shareId);
  const db = await getDb();
  const [row] = await db
    .update(vacancyShares)
    .set({ reviewedAt: new Date() })
    .where(eq(vacancyShares.id, id))
    .returning({ id: vacancyShares.id, mandateId: vacancyShares.mandateId, candidateId: vacancyShares.candidateId });
  if (!row) return fail("Diese Freigabe gibt es nicht mehr.");
  await audit("review", {
    entity: "vacancy_share",
    entityId: id,
    summary: `Antwort ${displayNo.candidate(row.candidateId)} zu ${displayNo.mandate(row.mandateId)} erledigt`,
  });
  refresh();
  return ok("Erledigt.");
}

export async function removeShare(shareId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(shareId);
  const share = await getShareContext(id);
  if (!share) return fail("Diese Freigabe gibt es nicht mehr.");
  const db = await getDb();
  await db.delete(vacancyShares).where(eq(vacancyShares.id, id));
  const name = fullName({ firstName: share.candidateFirstName, lastName: share.candidateLastName });
  await logActivity(
    [mandateOwner(share.mandateId), candidateOwner(share.candidateId)],
    `Freigabe im Kandidatenportal entfernt: ${name} (${displayNo.candidate(share.candidateId)}), «${share.mandateTitle}» (${displayNo.mandate(share.mandateId)})`,
  );
  await audit("delete", {
    entity: "vacancy_share",
    entityId: id,
    summary: `Freigabe ${displayNo.mandate(share.mandateId)} für ${displayNo.candidate(share.candidateId)}`,
  });
  refresh();
  return ok("Entfernt.");
}
