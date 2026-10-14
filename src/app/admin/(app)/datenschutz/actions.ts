"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { candidates } from "@/lib/admin/db/schema";
import { displayNo, formatDate } from "@/lib/admin/format";
import { f, fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { anonymiseCandidate, deleteCandidatePermanently, isAnonymised, retentionExtensionError } from "@/lib/admin/privacy";

/** Retention actions of the Datenschutz page: extend, anonymise, delete. */

const idSchema = z.number().int().positive();

const extendSchema = z.object({
  retentionUntil: f.optDate().refine((v) => v !== null, "Bitte ein Datum wählen."),
  note: f.text(500, "Bitte kurz begründen, z. B. «Einwilligung per E-Mail vom 10.10.2026»."),
});

export async function extendRetention(candidateId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(candidateId);
  const parsed = parseForm(extendSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [c] = await db
    .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, consentAt: candidates.consentAt })
    .from(candidates)
    .where(eq(candidates.id, id))
    .limit(1);
  if (!c) return fail("Diesen Kandidaten gibt es nicht mehr.");
  if (isAnonymised(c)) return fail("Der Kandidat ist bereits anonymisiert.");
  const date = parsed.data.retentionUntil!;
  const error = retentionExtensionError(date, Boolean(c.consentAt));
  if (error) return fail(error, { retentionUntil: error });
  await db.update(candidates).set({ retentionUntil: date, updatedAt: new Date() }).where(eq(candidates.id, id));
  await logActivity({ type: "candidate", id }, `Aufbewahrung verlängert bis ${formatDate(date)}: ${parsed.data.note}`);
  await audit("update", { entity: "candidate", entityId: id, summary: `Kandidat ${displayNo.candidate(id)}: Aufbewahrung verlängert` });
  refresh();
  return ok(`Verlängert bis ${formatDate(date)}.`);
}

export async function anonymiseCandidateAction(candidateId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(candidateId);
  const result = await anonymiseCandidate(id);
  if (!result) return fail("Diesen Kandidaten gibt es nicht mehr.");
  refresh();
  return ok(`${displayNo.candidate(id)} anonymisiert.`);
}

export async function deleteCandidateAction(candidateId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(candidateId);
  const deleted = await deleteCandidatePermanently(id);
  if (!deleted) return fail("Diesen Kandidaten gibt es nicht mehr.");
  refresh();
  return ok(`${displayNo.candidate(id)} gelöscht.`);
}
