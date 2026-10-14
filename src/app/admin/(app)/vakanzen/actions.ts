"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import {
  changeMandateStatus,
  companyExists,
  contactCompanyId,
  deleteMandate,
  insertMandate,
  setMandateNextStep,
  updateMandate,
  type MandateValues,
} from "@/lib/admin/data/mandates";
import { displayNo, formatDate } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { labelOf, mandateStatuses } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { redirectAfterChange } from "@/lib/admin/redirect";
import { nextStepSchema, vacancySchema, vacancyStatusSchema, type VacancyInput } from "./schema";

const idSchema = z.number().int().positive();

const vacancyOwner = (id: number): OwnerRef => ({ type: "mandate", id });
const label = (id: number) => `Vakanz ${displayNo.mandate(id)}`;

/**
 * Checks the links of a vacancy. A contact without a company sets the company; a contact of
 * another company is rejected, so the vacancy never names two different firms.
 */
async function prepare(input: VacancyInput): Promise<{ ok: true; values: MandateValues } | { ok: false; state: ActionState }> {
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
  return { ok: true, values: { ...input, companyId } };
}

function statusText(from: string, to: string): string {
  return `Status geändert: ${labelOf(mandateStatuses, from)} → ${labelOf(mandateStatuses, to)}`;
}

export async function createVacancy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(vacancySchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepare(parsed.data);
  if (!prepared.ok) return prepared.state;
  const values = prepared.values;
  const row = await insertMandate(values);
  const owners: OwnerRef[] = [vacancyOwner(row.id), ...(values.companyId ? [{ type: "company" as const, id: values.companyId }] : [])];
  await logActivity(owners, `Vakanz erfasst: «${values.title}» (${displayNo.mandate(row.id)}), Status ${labelOf(mandateStatuses, values.status)}`);
  await audit("create", { entity: "mandate", entityId: row.id, summary: label(row.id) });
  redirectAfterChange(`/admin/vakanzen/${row.id}`);
}

export async function updateVacancy(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const vacancyId = idSchema.parse(id);
  const parsed = parseForm(vacancySchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepare(parsed.data);
  if (!prepared.ok) return prepared.state;
  const values = prepared.values;
  const result = await updateMandate(vacancyId, values);
  if (!result) return fail("Diese Vakanz gibt es nicht mehr.");
  if (result.previousStatus !== values.status) await logActivity(vacancyOwner(vacancyId), statusText(result.previousStatus, values.status));
  await audit("update", { entity: "mandate", entityId: vacancyId, summary: label(vacancyId) });
  redirectAfterChange(`/admin/vakanzen/${vacancyId}`);
}

export async function deleteVacancy(id: number): Promise<ActionState> {
  await requireAdmin();
  const vacancyId = idSchema.parse(id);
  const row = await deleteMandate(vacancyId);
  if (!row) return fail("Diese Vakanz gibt es nicht mehr.");
  if (row.companyId) await logActivity({ type: "company", id: row.companyId }, `Vakanz gelöscht: «${row.title}» (${displayNo.mandate(row.id)})`);
  await audit("delete", { entity: "mandate", entityId: vacancyId, summary: label(vacancyId) });
  redirectAfterChange("/admin/vakanzen");
}

/** Quick status change on the detail page ("Als beworben markieren" and the status select). */
export async function setVacancyStatus(id: number, status: string): Promise<ActionState> {
  await requireAdmin();
  const vacancyId = idSchema.parse(id);
  const next = vacancyStatusSchema.safeParse(status);
  if (!next.success) return fail("Ungültiger Status.");
  const result = await changeMandateStatus(vacancyId, next.data);
  if (!result) return fail("Diese Vakanz gibt es nicht mehr.");
  if (!result.changed) return ok();
  const applied = result.appliedNow && result.appliedAt ? `, beworben am ${formatDate(result.appliedAt)}` : "";
  await logActivity(vacancyOwner(vacancyId), `${statusText(result.from, result.to)}${applied}`);
  await audit("update", { entity: "mandate", entityId: vacancyId, summary: `${label(vacancyId)}: Status ${result.to}` });
  // Navigation badges count open vacancies, so the layout must render again as well.
  refresh();
  return ok(`Status: ${labelOf(mandateStatuses, result.to)}.`);
}

/** Sets the next step from the detail page. */
export async function saveNextStep(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const vacancyId = idSchema.parse(id);
  const parsed = parseForm(nextStepSchema, formData);
  if (!parsed.ok) return parsed.state;
  const previous = await setMandateNextStep(vacancyId, parsed.data);
  if (!previous) return fail("Diese Vakanz gibt es nicht mehr.");
  const { nextStep, nextStepAt } = parsed.data;
  if (nextStep && (nextStep !== previous.nextStep || nextStepAt !== previous.nextStepAt)) {
    await logActivity(vacancyOwner(vacancyId), `Nächster Schritt: ${nextStep}${nextStepAt ? ` (bis ${formatDate(nextStepAt)})` : ""}`);
  }
  await audit("update", { entity: "mandate", entityId: vacancyId, summary: `${label(vacancyId)}: nächster Schritt` });
  refresh();
  return ok(nextStep ? "Nächster Schritt gespeichert." : "Nächster Schritt entfernt.");
}

/** Marks the next step as done: it moves into the history and the field is cleared. */
export async function completeNextStep(id: number): Promise<ActionState> {
  await requireAdmin();
  const vacancyId = idSchema.parse(id);
  const previous = await setMandateNextStep(vacancyId, { nextStep: null, nextStepAt: null });
  if (!previous) return fail("Diese Vakanz gibt es nicht mehr.");
  if (previous.nextStep) await logActivity(vacancyOwner(vacancyId), `Erledigt: ${previous.nextStep}`);
  await audit("update", { entity: "mandate", entityId: vacancyId, summary: `${label(vacancyId)}: nächster Schritt erledigt` });
  refresh();
  return ok("Erledigt.");
}
