"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { objectionSummary, withdrawalNoteText } from "@/lib/admin/consent";
import { liftObjection, recordObjection } from "@/lib/admin/data/submissions";
import { candidates, companies } from "@/lib/admin/db/schema";
import { displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { f, fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { candidateStatuses, labelOf } from "@/lib/admin/options";
import { deleteCandidateRecord } from "@/lib/admin/privacy";
import { normalizeSkills, skillGroups } from "@/lib/admin/skills";
import { defaultRetentionUntil, retentionInputError, retentionWithoutConsent } from "./rules";
import { adoptSkillsSchema, liftObjectionSchema, objectionSchema, parseCandidateForm, type CandidateInput } from "./schema";

const idSchema = z.number().int().positive();

/**
 * Consent and privacy notice are timestamps, the form edits them as dates. An unchanged date
 * keeps the stored time (e.g. a consent given in the portal at 23:40); a new date is stored
 * at noon UTC, which is the same calendar day in Zurich.
 */
function toTimestamp(iso: string | null, existing: Date | null = null): Date | null {
  if (!iso) return null;
  if (existing && todayIso(existing) === iso) return existing;
  return new Date(`${iso}T12:00:00Z`);
}

function toRow(data: CandidateInput, existing?: { consentAt: Date | null; privacyInfoAt: Date | null }) {
  const consentAt = toTimestamp(data.consentAt, existing?.consentAt);
  return {
    ...data,
    consentAt,
    privacyInfoAt: toTimestamp(data.privacyInfoAt, existing?.privacyInfoAt),
    retentionUntil: data.retentionUntil ?? defaultRetentionUntil(Boolean(consentAt), todayIso()),
  };
}

/**
 * Profiles are only passed on through the candidate's own firm, a subcontractor of KOVALI.
 * The firm must exist (it may have been deleted while the form was open) and be of that kind.
 */
async function ownFirmProblem(companyId: number | null): Promise<string | null> {
  if (!companyId) return null;
  const db = await getDb();
  const [row] = await db.select({ kind: companies.kind }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!row) return "Diese Firma gibt es nicht mehr.";
  if (row.kind !== "subunternehmer") return "Bitte eine Firma der Art «Subunternehmer» wählen.";
  return null;
}

export async function createCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseCandidateForm(formData);
  if (!parsed.ok) return parsed.state;
  const firmProblem = await ownFirmProblem(parsed.data.companyId);
  if (firmProblem) return fail("Bitte prüfe die markierten Felder.", { companyId: firmProblem });
  const retentionError = retentionInputError(parsed.data.retentionUntil, null, Boolean(parsed.data.consentAt), todayIso());
  if (retentionError) return fail("Bitte prüfe die markierten Felder.", { retentionUntil: retentionError });
  const db = await getDb();
  const values = toRow(parsed.data);
  const [row] = await db.insert(candidates).values(values).returning({ id: candidates.id });
  const no = displayNo.candidate(row.id);
  await logActivity({ type: "candidate", id: row.id }, `Kandidat erfasst, aufbewahren bis ${formatDate(values.retentionUntil)}.`);
  await audit("create", { entity: "candidate", entityId: row.id, summary: `Kandidat ${no}` });
  if (values.consentAt) await audit("consent", { entity: "candidate", entityId: row.id, summary: `Einwilligung Kandidat ${no} erfasst` });
  redirect(`/admin/kandidaten/${row.id}`);
}

export async function updateCandidate(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  const parsed = parseCandidateForm(formData);
  if (!parsed.ok) return parsed.state;
  const firmProblem = await ownFirmProblem(parsed.data.companyId);
  if (firmProblem) return fail("Bitte prüfe die markierten Felder.", { companyId: firmProblem });
  const db = await getDb();
  const [existing] = await db
    .select({
      status: candidates.status,
      consentAt: candidates.consentAt,
      privacyInfoAt: candidates.privacyInfoAt,
      companyId: candidates.companyId,
      retentionUntil: candidates.retentionUntil,
      createdAt: candidates.createdAt,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!existing) return fail("Diesen Kandidaten gibt es nicht mehr.");
  const values = toRow(parsed.data, existing);
  // Only a new or changed date is checked: one set through the Datenschutz extension stays.
  const retentionError = retentionInputError(parsed.data.retentionUntil, existing.retentionUntil, Boolean(values.consentAt), todayIso());
  if (retentionError) return fail("Bitte prüfe die markierten Felder.", { retentionUntil: retentionError });
  // Without consent (any more), at most six months from the creation of the profile.
  const consentRemoved = Boolean(existing.consentAt) && !values.consentAt;
  if (consentRemoved) values.retentionUntil = retentionWithoutConsent(values.retentionUntil, todayIso(existing.createdAt));
  await db
    .update(candidates)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId));

  const owner = { type: "candidate" as const, id: candidateId };
  const no = displayNo.candidate(candidateId);
  if (existing.companyId !== values.companyId) await logOwnFirmChange(owner, values.companyId);
  if (existing.status !== values.status) {
    await logActivity(owner, `Status geändert: ${labelOf(candidateStatuses, existing.status)} → ${labelOf(candidateStatuses, values.status)}`);
  }
  const consentBefore = existing.consentAt ? todayIso(existing.consentAt) : null;
  if (consentBefore !== parsed.data.consentAt) {
    if (values.consentAt) {
      await logActivity(owner, `Einwilligung zur Speicherung erfasst (${formatDate(values.consentAt)}${values.consentNote ? `, ${values.consentNote}` : ""}).`);
      await audit("consent", { entity: "candidate", entityId: candidateId, summary: `Einwilligung Kandidat ${no} erfasst` });
    } else {
      const retention = values.retentionUntil !== existing.retentionUntil ? ` Aufbewahren bis ${formatDate(values.retentionUntil)}.` : "";
      await logActivity(owner, `Einwilligung zur Speicherung entfernt${values.consentNote ? ` (${values.consentNote})` : ""}.${retention}`);
      await audit("consent", { entity: "candidate", entityId: candidateId, summary: `Einwilligung Kandidat ${no} entfernt` });
    }
  }
  await audit("update", { entity: "candidate", entityId: candidateId, summary: `Kandidat ${no}` });
  redirect(`/admin/kandidaten/${candidateId}`);
}

async function logOwnFirmChange(owner: { type: "candidate"; id: number }, companyId: number | null) {
  if (!companyId) {
    await logActivity(owner, "Verknüpfung mit der eigenen Firma gelöst.");
    return;
  }
  const db = await getDb();
  const [firm] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
  await logActivity(owner, `Eigene Firma verknüpft: ${firm?.name ?? displayNo.company(companyId)}`);
}

const linkSchema = z.object({ companyId: f.optInt(1, Number.MAX_SAFE_INTEGER) });

/** Links the candidate to an existing subcontractor firm (card "Eigene Firma"). */
export async function linkOwnFirm(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  const parsed = parseForm(linkSchema, formData);
  if (!parsed.ok) return parsed.state;
  const companyId = parsed.data.companyId;
  if (!companyId) return fail("Bitte eine Firma auswählen.", { companyId: "Bitte eine Firma auswählen." });
  const problem = await ownFirmProblem(companyId);
  if (problem) return fail(problem, { companyId: problem });
  const db = await getDb();
  const [row] = await db
    .update(candidates)
    .set({ companyId, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId))
    .returning({ id: candidates.id });
  if (!row) return fail("Diesen Kandidaten gibt es nicht mehr.");
  await logOwnFirmChange({ type: "candidate", id: candidateId }, companyId);
  await audit("update", {
    entity: "candidate",
    entityId: candidateId,
    summary: `Kandidat ${displayNo.candidate(candidateId)}: eigene Firma ${displayNo.company(companyId)} verknüpft`,
  });
  refresh();
  return ok("Firma verknüpft.");
}

export async function unlinkOwnFirm(id: number): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  const db = await getDb();
  const [row] = await db
    .update(candidates)
    .set({ companyId: null, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId))
    .returning({ id: candidates.id });
  if (!row) return fail("Diesen Kandidaten gibt es nicht mehr.");
  await logOwnFirmChange({ type: "candidate", id: candidateId }, null);
  await audit("update", { entity: "candidate", entityId: candidateId, summary: `Kandidat ${displayNo.candidate(candidateId)}: eigene Firma gelöst` });
  refresh();
  return ok("Verknüpfung gelöst.");
}

export async function deleteCandidate(id: number): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  // Documents, notes, proposals, portal shares and the portal account go with it (on delete
  // cascade); contracts keep their data, lose the link and keep only the number in the title.
  if (!(await deleteCandidateRecord(candidateId))) return fail("Diesen Kandidaten gibt es nicht mehr.");
  await audit("delete", { entity: "candidate", entityId: candidateId, summary: `Kandidat ${displayNo.candidate(candidateId)} mit allen Dokumenten` });
  redirect("/admin/kandidaten");
}

/**
 * The candidate objects to any further hand-over of the profile (Widerspruch): no reservation,
 * consent or proposal for any mandate until it is lifted. Every submission that is not decided
 * yet counts as withdrawn; for profiles already proposed, Ferhat informs the client.
 */
export async function recordCandidateObjection(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  const parsed = parseForm(objectionSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [current] = await db.select({ objectionAt: candidates.objectionAt }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  if (!current) return fail("Diesen Kandidaten gibt es nicht mehr.");
  if (current.objectionAt) return fail(`Der Widerspruch vom ${formatDate(current.objectionAt)} ist bereits erfasst.`);
  const now = new Date();
  const date = parsed.data.objectionDate;
  const at = date === todayIso(now) ? now : new Date(`${date}T12:00:00Z`);
  const note = withdrawalNoteText(parsed.data.objectionMethod, parsed.data.objectionReason);
  const changed = await recordObjection(candidateId, at, note);
  if (!changed) return fail("Diesen Kandidaten gibt es nicht mehr.");

  const no = displayNo.candidate(candidateId);
  const proposed = changed.filter((s) => s.submittedAt).length;
  await logActivity(
    { type: "candidate", id: candidateId },
    `Widerspruch gegen jede weitere Weitergabe erfasst, am ${formatDate(at)} (${note}).` +
      (changed.length ? ` ${changed.length === 1 ? "1 offener Vorschlag gilt" : `${changed.length} offene Vorschläge gelten`} als widerrufen.` : ""),
  );
  for (const s of changed) {
    await logActivity(
      { type: "mandate", id: s.mandateId },
      `Widerspruch von ${no} gegen jede weitere Weitergabe, am ${formatDate(at)} (${note}).` +
        (s.submittedAt ? " Das Profil wurde bereits vorgeschlagen: Auftraggeber informieren." : ""),
    );
  }
  await audit("consent", { entity: "candidate", entityId: candidateId, summary: `Kandidat ${no}: Widerspruch erfasst (${changed.length === 1 ? "1 Vorschlag" : `${changed.length} Vorschläge`} widerrufen)` });
  refresh();
  if (proposed) return ok(`Widerspruch erfasst. ${proposed === 1 ? "1 Profil war" : `${proposed} Profile waren`} bereits vorgeschlagen: bitte den Auftraggeber informieren.`);
  return ok("Widerspruch erfasst.");
}

/**
 * Lifts the objection, e.g. when it was recorded by mistake or the candidate takes it back.
 * Withdrawn submissions stay withdrawn: each mandate still needs a new consent.
 */
export async function liftCandidateObjection(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const candidateId = idSchema.parse(id);
  const parsed = parseForm(liftObjectionSchema, formData);
  if (!parsed.ok) return parsed.state;
  const lifted = await liftObjection(candidateId);
  if (!lifted) return fail("Es ist kein Widerspruch erfasst.");
  await logActivity(
    { type: "candidate", id: candidateId },
    `Widerspruch aufgehoben: ${parsed.data.liftNote} (war: ${objectionSummary({ objectionAt: lifted.at, objectionNote: lifted.note })}).`,
  );
  await audit("consent", { entity: "candidate", entityId: candidateId, summary: `Kandidat ${displayNo.candidate(candidateId)}: Widerspruch aufgehoben` });
  refresh();
  return ok("Widerspruch aufgehoben. Für jedes Mandat braucht es weiterhin eine neue Einwilligung.");
}

/**
 * Adds keywords found in the CV to the profile. Only keywords that are still detected are
 * accepted; SAP entries go to the SAP modules, everything else to the skills.
 */
export async function adoptDetectedSkills(id: number, skills: string[]): Promise<ActionState> {
  await requireAdmin();
  const input = adoptSkillsSchema.safeParse({ id, skills });
  if (!input.success) return fail(input.error.issues[0]?.message ?? "Ungültige Auswahl.");
  const db = await getDb();
  const [c] = await db
    .select({ skills: candidates.skills, sapModules: candidates.sapModules, detectedSkills: candidates.detectedSkills })
    .from(candidates)
    .where(eq(candidates.id, input.data.id))
    .limit(1);
  if (!c) return fail("Diesen Kandidaten gibt es nicht mehr.");

  const detected = new Set(c.detectedSkills.map((s) => s.toLowerCase()));
  const chosen = normalizeSkills(input.data.skills).filter((s) => detected.has(s.toLowerCase()));
  if (!chosen.length) return fail("Diese Stichworte sind nicht mehr im Lebenslauf erkannt.");
  const sap = chosen.filter((s) => skillGroups[s] === "SAP");
  const other = chosen.filter((s) => skillGroups[s] !== "SAP");
  await db
    .update(candidates)
    .set({
      skills: normalizeSkills([...c.skills, ...other]),
      sapModules: normalizeSkills([...c.sapModules, ...sap]),
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, input.data.id));
  await logActivity({ type: "candidate", id: input.data.id }, `Aus dem Lebenslauf ins Profil übernommen: ${chosen.join(", ")}`);
  await audit("update", {
    entity: "candidate",
    entityId: input.data.id,
    summary: `Kandidat ${displayNo.candidate(input.data.id)}: ${chosen.length} Stichworte aus dem Lebenslauf übernommen`,
  });
  refresh();
  return ok(chosen.length === 1 ? "1 Stichwort übernommen." : `${chosen.length} Stichworte übernommen.`);
}
