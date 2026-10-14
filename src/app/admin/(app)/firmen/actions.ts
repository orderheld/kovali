"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { activities, candidates, companies, contacts } from "@/lib/admin/db/schema";
import { displayNo } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { companySchema, contactSchema } from "./schema";

const idSchema = z.number().int().positive();

export async function createCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(companySchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [row] = await db.insert(companies).values(parsed.data).returning({ id: companies.id });
  await audit("create", { entity: "company", entityId: row.id, summary: `Firma ${displayNo.company(row.id)}` });
  redirect(`/admin/firmen/${row.id}`);
}

export async function updateCompany(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const companyId = idSchema.parse(id);
  const parsed = parseForm(companySchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [row] = await db
    .update(companies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companies.id, companyId))
    .returning({ id: companies.id });
  if (!row) return fail("Diese Firma gibt es nicht mehr.");
  await audit("update", { entity: "company", entityId: companyId, summary: `Firma ${displayNo.company(companyId)}` });
  redirect(`/admin/firmen/${companyId}`);
}

export async function deleteCompany(id: number): Promise<ActionState> {
  await requireAdmin();
  const companyId = idSchema.parse(id);
  const db = await getDb();
  // Contacts, notes and documents of the company are deleted with it (on delete cascade);
  // mandates, contracts and candidates keep their data and lose the link. History entries that
  // also belong to a candidate, mandate or contract (e.g. "Vertrag unterzeichnet") only lose the
  // company, so they stay on those records; entries of the company alone go with it.
  const deleted = await db.transaction(async (tx) => {
    const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for("update").limit(1);
    if (!company) return null;
    const linked = await tx.select({ id: candidates.id }).from(candidates).where(eq(candidates.companyId, companyId));
    await tx
      .update(activities)
      .set({ companyId: null })
      .where(and(eq(activities.companyId, companyId), sql`num_nonnulls(${activities.candidateId}, ${activities.mandateId}, ${activities.contractId}) > 0`));
    await tx.delete(companies).where(eq(companies.id, companyId));
    return { candidates: linked.map((c) => c.id) };
  });
  if (!deleted) return fail("Diese Firma gibt es nicht mehr.");
  for (const candidateId of deleted.candidates) {
    await logActivity({ type: "candidate", id: candidateId }, `Eigene Firma ${displayNo.company(companyId)} gelöscht; Verknüpfung entfernt.`);
  }
  await audit("delete", { entity: "company", entityId: companyId, summary: `Firma ${displayNo.company(companyId)}` });
  redirect("/admin/firmen");
}

export async function createContact(companyId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const cid = idSchema.parse(companyId);
  const parsed = parseForm(contactSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, cid)).limit(1);
  if (!company) return fail("Diese Firma gibt es nicht mehr.");
  const [row] = await db
    .insert(contacts)
    .values({ ...parsed.data, companyId: cid })
    .returning({ id: contacts.id });
  await logActivity({ type: "company", id: cid }, `Kontakt erfasst: ${[parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ")}`);
  await audit("create", { entity: "contact", entityId: row.id, summary: `Kontakt bei Firma ${displayNo.company(cid)}` });
  redirect(`/admin/firmen/${cid}`);
}

export async function updateContact(companyId: number, contactId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const cid = idSchema.parse(companyId);
  const kid = idSchema.parse(contactId);
  const parsed = parseForm(contactSchema, formData);
  if (!parsed.ok) return parsed.state;
  const db = await getDb();
  const [row] = await db
    .update(contacts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(contacts.id, kid), eq(contacts.companyId, cid)))
    .returning({ id: contacts.id });
  if (!row) return fail("Diesen Kontakt gibt es nicht mehr.");
  await audit("update", { entity: "contact", entityId: kid, summary: `Kontakt bei Firma ${displayNo.company(cid)}` });
  redirect(`/admin/firmen/${cid}`);
}

export async function deleteContact(companyId: number, contactId: number): Promise<ActionState> {
  await requireAdmin();
  const cid = idSchema.parse(companyId);
  const kid = idSchema.parse(contactId);
  const db = await getDb();
  const [row] = await db
    .delete(contacts)
    .where(and(eq(contacts.id, kid), eq(contacts.companyId, cid)))
    .returning({ firstName: contacts.firstName, lastName: contacts.lastName });
  if (!row) return fail("Diesen Kontakt gibt es nicht mehr.");
  await logActivity({ type: "company", id: cid }, `Kontakt gelöscht: ${[row.firstName, row.lastName].filter(Boolean).join(" ")}`);
  await audit("delete", { entity: "contact", entityId: kid, summary: `Kontakt bei Firma ${displayNo.company(cid)}` });
  refresh();
  return ok("Kontakt gelöscht.");
}
