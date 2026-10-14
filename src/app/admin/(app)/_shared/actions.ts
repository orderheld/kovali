"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { activities, documents } from "@/lib/admin/db/schema";
import { checkUpload, storeDocument } from "@/lib/admin/documents";
import { fail, ok, parseForm, f, type ActionState } from "@/lib/admin/forms";
import { activityKinds, documentKinds, documentKindsByOwner, labelOf, valuesOf } from "@/lib/admin/options";
import { ownerColumns, ownerLabel, ownerSchema, type OwnerRef } from "@/lib/admin/owner";

/** Notes and documents, shared by companies, vacancies, contracts and assignments. */

const noteSchema = z.object({
  kind: f.enum(valuesOf(activityKinds.filter((k) => k.value !== "system"))),
  body: f.text(4000, "Bitte eine Notiz eingeben."),
});

export async function addNote(owner: OwnerRef, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const target = ownerSchema.parse(owner);
  const parsed = parseForm(noteSchema, formData);
  if (!parsed.ok) return parsed.state;
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
  // Only the kinds offered for this kind of record (documentKindsByOwner).
  const kind = z.enum(documentKindsByOwner[target.type]).safeParse(formData.get("kind"));
  if (!kind.success) return fail("Bitte die Art des Dokuments wählen.", { kind: "Bitte auswählen." });
  const file = await checkUpload(formData.get("file"));
  if (!file.ok) return fail(file.error, { file: file.error });

  const stored = await storeDocument({ owner: ownerColumns(target), kind: kind.data, file });
  await logActivity(target, `Dokument hochgeladen: ${labelOf(documentKinds, kind.data)} (${file.filename})`);
  await audit("create", { entity: "document", entityId: stored.id, summary: `Dokument zu ${ownerLabel(target)}` });
  refresh();
  return ok("Gespeichert und verschlüsselt.");
}

export async function deleteDocument(id: number): Promise<ActionState> {
  await requireAdmin();
  const docId = z.number().int().positive().parse(id);
  const db = await getDb();
  const [row] = await db.delete(documents).where(eq(documents.id, docId)).returning({ id: documents.id });
  if (!row) return fail("Das Dokument gibt es nicht mehr.");
  await audit("delete", { entity: "document", entityId: row.id });
  refresh();
  return ok("Dokument gelöscht.");
}
