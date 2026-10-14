"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { activities, assignments, companies, contacts, mandates } from "@/lib/admin/db/schema";
import { displayNo } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { assignmentStatuses, labelOf, valuesOf } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { redirectAfterChange } from "@/lib/admin/redirect";
import { assignmentSchema, type AssignmentInput } from "./schema";

const idSchema = z.number().int().positive();
const label = (id: number) => `Auftrag ${displayNo.assignment(id)}`;

/**
 * Checks the links of the form: the company, contact and vacancy must exist, and the contact
 * must belong to the company. Without a company, the contact's company is taken over.
 */
async function resolveLinks(data: AssignmentInput): Promise<{ ok: true; data: AssignmentInput } | { ok: false; state: ActionState }> {
  const db = await getDb();
  const errors: Record<string, string> = {};
  let companyId = data.companyId;
  if (companyId) {
    const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) errors.companyId = "Diese Firma gibt es nicht mehr.";
  }
  if (data.contactId) {
    const [contact] = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, data.contactId)).limit(1);
    if (!contact) errors.contactId = "Diesen Kontakt gibt es nicht mehr.";
    else if (companyId && contact.companyId !== companyId) errors.contactId = "Der Kontakt gehört zu einer anderen Firma.";
    else companyId = contact.companyId;
  }
  if (data.mandateId) {
    const [mandate] = await db.select({ id: mandates.id }).from(mandates).where(eq(mandates.id, data.mandateId)).limit(1);
    if (!mandate) errors.mandateId = "Diese Vakanz gibt es nicht mehr.";
  }
  if (Object.keys(errors).length) return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
  return { ok: true, data: { ...data, companyId } };
}

export async function createAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const linked = await resolveLinks(parsed.data);
  if (!linked.ok) return linked.state;
  const db = await getDb();
  const [row] = await db.insert(assignments).values(linked.data).returning({ id: assignments.id });
  const owners: OwnerRef[] = [{ type: "assignment", id: row.id }];
  if (linked.data.mandateId) owners.push({ type: "mandate", id: linked.data.mandateId });
  await logActivity(owners, `Auftrag ${displayNo.assignment(row.id)} erfasst`);
  await audit("create", { entity: "assignment", entityId: row.id, summary: label(row.id) });
  redirectAfterChange(`/admin/auftraege/${row.id}`);
}

export async function updateAssignment(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const assignmentId = idSchema.parse(id);
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const linked = await resolveLinks(parsed.data);
  if (!linked.ok) return linked.state;
  const db = await getDb();
  const [before] = await db.select({ status: assignments.status }).from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!before) return fail("Diesen Auftrag gibt es nicht mehr.");
  await db
    .update(assignments)
    .set({ ...linked.data, updatedAt: new Date() })
    .where(eq(assignments.id, assignmentId));
  if (before.status !== linked.data.status) {
    await logActivity({ type: "assignment", id: assignmentId }, `Status: ${labelOf(assignmentStatuses, before.status)} → ${labelOf(assignmentStatuses, linked.data.status)}`);
  }
  await audit("update", { entity: "assignment", entityId: assignmentId, summary: label(assignmentId) });
  redirectAfterChange(`/admin/auftraege/${assignmentId}`);
}

/** Quick status change on the detail page (start a planned assignment, mark one as finished). */
export async function setAssignmentStatus(id: number, status: string): Promise<ActionState> {
  await requireAdmin();
  const assignmentId = idSchema.parse(id);
  const next = z.enum(valuesOf(assignmentStatuses)).parse(status);
  const db = await getDb();
  const [before] = await db.select({ status: assignments.status }).from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!before) return fail("Diesen Auftrag gibt es nicht mehr.");
  if (before.status === next) return ok();
  await db.update(assignments).set({ status: next, updatedAt: new Date() }).where(eq(assignments.id, assignmentId));
  await logActivity({ type: "assignment", id: assignmentId }, `Status: ${labelOf(assignmentStatuses, before.status)} → ${labelOf(assignmentStatuses, next)}`);
  await audit("update", { entity: "assignment", entityId: assignmentId, summary: `${label(assignmentId)}: Status` });
  refresh();
  return ok(`Status: ${labelOf(assignmentStatuses, next)}.`);
}

/** Deletes the assignment with its notes and documents; linked contracts keep their data and lose the link. */
export async function deleteAssignment(id: number): Promise<ActionState> {
  await requireAdmin();
  const assignmentId = idSchema.parse(id);
  const db = await getDb();
  // History entries that also belong to a vacancy, contract or company (e.g. "Auftrag erfasst"
  // on the vacancy) only lose the assignment; entries of the assignment alone go with it.
  const row = await db.transaction(async (tx) => {
    const [found] = await tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.id, assignmentId)).for("update").limit(1);
    if (!found) return null;
    await tx
      .update(activities)
      .set({ assignmentId: null })
      .where(and(eq(activities.assignmentId, assignmentId), sql`num_nonnulls(${activities.companyId}, ${activities.mandateId}, ${activities.contractId}) > 0`));
    const [deleted] = await tx.delete(assignments).where(eq(assignments.id, assignmentId)).returning({ mandateId: assignments.mandateId });
    return deleted;
  });
  if (!row) return fail("Diesen Auftrag gibt es nicht mehr.");
  if (row.mandateId) await logActivity({ type: "mandate", id: row.mandateId }, `Auftrag ${displayNo.assignment(assignmentId)} gelöscht`);
  await audit("delete", { entity: "assignment", entityId: assignmentId, summary: label(assignmentId) });
  redirectAfterChange("/admin/auftraege");
}
