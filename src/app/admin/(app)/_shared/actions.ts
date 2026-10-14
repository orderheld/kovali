"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { activities, candidates, documents } from "@/lib/admin/db/schema";
import { checkUpload, refreshDetectedSkills, storeDocument } from "@/lib/admin/documents";
import { fail, ok, parseForm, f, type ActionState } from "@/lib/admin/forms";
import { activityKinds, documentKinds, labelOf, valuesOf } from "@/lib/admin/options";
import { ownerColumns, ownerEntity, ownerSchema, type OwnerRef } from "@/lib/admin/owner";
import { isAnonymisedSql } from "@/lib/admin/privacy";

/** Notes and documents, shared by candidates, companies, mandates and contracts. */

const noteSchema = z.object({
  kind: f.enum(valuesOf(activityKinds.filter((k) => k.value !== "system"))),
  body: f.text(4000, "Bitte eine Notiz eingeben."),
});

/** Anonymised profiles stay only for statistics, so nothing personal may be added to them again. */
async function isAnonymisedCandidate(target: OwnerRef): Promise<boolean> {
  if (target.type !== "candidate") return false;
  const db = await getDb();
  const [row] = await db.select({ id: candidates.id }).from(candidates).where(and(eq(candidates.id, target.id), isAnonymisedSql)).limit(1);
  return Boolean(row);
}

export async function addNote(owner: OwnerRef, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const target = ownerSchema.parse(owner);
  const parsed = parseForm(noteSchema, formData);
  if (!parsed.ok) return parsed.state;
  if (await isAnonymisedCandidate(target)) return fail("Das Profil ist anonymisiert: keine neuen Notizen.");
  await logActivity(target, parsed.data.body, parsed.data.kind);
  refresh();
  return ok("Notiz gespeichert.");
}

export async function deleteNote(id: number): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(activities).where(eq(activities.id, z.number().int().positive().parse(id))).returning({ id: activities.id });
  refresh();
  return row ? ok("Notiz gelöscht.") : fail("Die Notiz gibt es nicht mehr.");
}

export async function uploadDocument(owner: OwnerRef, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const target = ownerSchema.parse(owner);
  if (await isAnonymisedCandidate(target)) return fail("Das Profil ist anonymisiert: keine neuen Dokumente.");
  const kind = z.enum(valuesOf(documentKinds)).safeParse(formData.get("kind"));
  if (!kind.success) return fail("Bitte die Art des Dokuments wählen.", { kind: "Bitte auswählen." });
  const file = await checkUpload(formData.get("file"));
  if (!file.ok) return fail(file.error, { file: file.error });

  const stored = await storeDocument({ owner: ownerColumns(target), kind: kind.data, file });
  await logActivity(target, `Dokument hochgeladen: ${labelOf(documentKinds, kind.data)} (${file.filename})`);
  await audit("create", { entity: "document", entityId: stored.id, summary: `Dokument zu ${ownerEntity(target)} ${target.id}` });
  refresh();
  if (target.type !== "candidate" || !stored.detectedSkills.length) return ok("Gespeichert und verschlüsselt.");
  return ok(`Gespeichert und verschlüsselt. Im Lebenslauf ${detectedText(stored.detectedSkills.length, await newSkillCount(target.id, stored.detectedSkills))}.`);
}

/** How many of the detected skills are not in the candidate's profile yet (as in the "Im Lebenslauf erkannt" card). */
async function newSkillCount(candidateId: number, detected: string[]): Promise<number> {
  const db = await getDb();
  const [c] = await db.select({ skills: candidates.skills, sapModules: candidates.sapModules }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  const inProfile = new Set([...(c?.skills ?? []), ...(c?.sapModules ?? [])].map((s) => s.toLowerCase()));
  return detected.filter((s) => !inProfile.has(s.toLowerCase())).length;
}

/** "11 Stichworte erkannt, 8 davon neu". */
function detectedText(total: number, fresh: number): string {
  const found = total === 1 ? "1 Stichwort erkannt" : `${total} Stichworte erkannt`;
  if (fresh === 0) return `${found}, ${total === 1 ? "steht" : "alle stehen"} schon im Profil`;
  if (fresh === total) return `${found}, ${total === 1 ? "noch nicht im Profil" : "alle neu"}`;
  return `${found}, ${fresh} davon neu`;
}

export async function deleteDocument(id: number): Promise<ActionState> {
  await requireAdmin();
  const docId = z.number().int().positive().parse(id);
  const db = await getDb();
  const [row] = await db
    .delete(documents)
    .where(eq(documents.id, docId))
    .returning({ id: documents.id, candidateId: documents.candidateId, filename: documents.filename, kind: documents.kind });
  if (!row) return fail("Das Dokument gibt es nicht mehr.");
  if (row.candidateId && row.kind === "cv") await refreshDetectedSkills(row.candidateId);
  await audit("delete", { entity: "document", entityId: row.id });
  refresh();
  return ok("Dokument gelöscht.");
}

/** Accepts a document a candidate uploaded in the portal. */
export async function confirmDocument(id: number): Promise<ActionState> {
  await requireAdmin();
  const docId = z.number().int().positive().parse(id);
  const db = await getDb();
  const [row] = await db
    .update(documents)
    .set({ confirmedAt: new Date() })
    .where(eq(documents.id, docId))
    .returning({ id: documents.id, candidateId: documents.candidateId, kind: documents.kind, filename: documents.filename });
  if (!row) return fail("Das Dokument gibt es nicht mehr.");
  if (row.candidateId) {
    if (row.kind === "cv") await refreshDetectedSkills(row.candidateId);
    await logActivity({ type: "candidate", id: row.candidateId }, `Dokument aus dem Portal bestätigt: ${row.filename}`);
  }
  await audit("review", { entity: "document", entityId: row.id, summary: "Portal-Dokument bestätigt" });
  refresh();
  return ok("Bestätigt.");
}
