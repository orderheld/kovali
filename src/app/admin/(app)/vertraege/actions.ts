"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { applySignedConsent } from "@/lib/admin/contracts/consent";
import { getContract, linkLookup } from "@/lib/admin/contracts/data";
import { insertContractWithNumber } from "@/lib/admin/contracts/numbering";
import { getTemplate } from "@/lib/admin/contracts/templates";
import type { LinkKey, LinkMode, TemplateDefinition } from "@/lib/admin/contracts/types";
import { getDb, type AdminDb } from "@/lib/admin/db/client";
import { contracts } from "@/lib/admin/db/schema";
import { addMonthsIso, displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { fail, formObject, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { companyKinds, labelOf } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { contractSchema, DATA_PREFIX, statusDateSchema, type ContractInput } from "./schema";

const idSchema = z.number().int().positive();

const fieldOf: Record<LinkKey, "companyId" | "contactId" | "candidateId" | "mandateId" | "parentId"> = {
  company: "companyId",
  contact: "contactId",
  candidate: "candidateId",
  mandate: "mandateId",
  parent: "parentId",
};

const defaultLabels: Record<LinkKey, string> = {
  company: "Firma",
  contact: "Kontakt",
  candidate: "Fachperson",
  mandate: "Mandat",
  parent: "Rahmenvertrag",
};

type Values = ContractInput & { data: Record<string, unknown> };

/**
 * Validates the form of a template: the common fields, the template fields (d_<name>) and
 * the links. Hidden links are cleared, an Einzelauftrag takes the company of its
 * Rahmenvertrag, and a contact must belong to the chosen company.
 */
async function checkForm(template: TemplateDefinition, formData: FormData): Promise<{ ok: true; values: Values } | { ok: false; state: ActionState }> {
  const raw = formObject(formData);
  const common = parseForm(contractSchema, raw);
  const dataRaw = Object.fromEntries(
    Object.entries(raw)
      .filter(([k]) => k.startsWith(DATA_PREFIX))
      .map(([k, v]) => [k.slice(DATA_PREFIX.length), v]),
  );
  const data = template.schema.safeParse(dataRaw);
  if (!common.ok || !data.success) {
    const errors: Record<string, string> = {};
    if (!common.ok && common.state.status === "error") Object.assign(errors, common.state.errors);
    if (!data.success) {
      for (const issue of data.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errors[`${DATA_PREFIX}${key}`] ??= issue.message;
      }
    }
    return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
  }

  const v: Values = { ...common.data, data: data.data };
  for (const [key, mode] of Object.entries(template.links) as [LinkKey, LinkMode][]) {
    if (mode === "hidden") v[fieldOf[key]] = null;
  }
  if (template.dates.validFrom === null) v.validFrom = null;
  if (template.dates.validUntil === null) v.validUntil = null;

  const errors: Record<string, string> = {};
  const label = (key: LinkKey) => template.labels[key] ?? defaultLabels[key];
  for (const [key, mode] of Object.entries(template.links) as [LinkKey, LinkMode][]) {
    if (mode === "required" && v[fieldOf[key]] === null && !(key === "company" && template.id === "einzelauftrag")) {
      errors[fieldOf[key]] = `${label(key)}: bitte auswählen.`;
    }
  }

  const { loadCompany, loadContact, loadCandidate, loadMandate, loadParent } = linkLookup;
  const parent = await loadParent(v.parentId);
  if (v.parentId !== null) {
    if (!parent || parent.template !== "rahmenvertrag") errors.parentId = "Diesen Rahmenvertrag gibt es nicht mehr.";
    else if (parent.status === "storniert") errors.parentId = "Dieser Rahmenvertrag ist storniert.";
    else if (!parent.companyId) errors.parentId = "Beim Rahmenvertrag ist keine Auftraggeberin verknüpft.";
  }
  // The Einzelauftrag is made with the client of the Rahmenvertrag.
  if (template.id === "einzelauftrag") v.companyId = parent?.companyId ?? null;

  const [company, contact, candidate, mandate] = await Promise.all([
    loadCompany(v.companyId),
    loadContact(v.contactId),
    loadCandidate(v.candidateId),
    loadMandate(v.mandateId),
  ]);
  if (v.companyId !== null && !company) errors.companyId = "Diese Firma gibt es nicht mehr.";
  if (company && template.id !== "einzelauftrag" && template.companyKinds.length && !template.companyKinds.includes(company.kind)) {
    errors.companyId =
      template.id === "subunternehmer"
        ? "Bitte die eigene Firma der Fachperson wählen (Art «Subunternehmer»)."
        : `Diese Firma ist als «${labelOf(companyKinds, company.kind)}» erfasst und passt nicht zu dieser Vorlage.`;
  }
  if (v.contactId !== null) {
    if (!contact) errors.contactId = "Diesen Kontakt gibt es nicht mehr.";
    else if (contact.companyId !== v.companyId) errors.contactId = "Diese Person gehört nicht zur gewählten Firma.";
  }
  if (v.candidateId !== null && !candidate) errors.candidateId = "Diese Fachperson gibt es nicht mehr.";
  if (template.id === "subunternehmer" && candidate?.companyId && v.companyId !== null && candidate.companyId !== v.companyId) {
    errors.companyId ??= "Die Fachperson ist einer anderen Firma zugeordnet. Bitte deren Firma wählen oder die Zuordnung beim Kandidaten ändern.";
  }
  if (v.mandateId !== null && !mandate) errors.mandateId = "Dieses Mandat gibt es nicht mehr.";
  for (const group of template.oneOf) {
    if (group.every((key) => v[fieldOf[key]] === null)) {
      errors[fieldOf[group[0]]] ??= `Bitte ${group.map(label).join(" oder ")} wählen.`;
    }
  }
  if (v.validFrom && v.validUntil && v.validUntil < v.validFrom) errors.validUntil = "Das Ende liegt vor dem Beginn.";
  const linked = Object.fromEntries((Object.keys(fieldOf) as LinkKey[]).map((k) => [k, v[fieldOf[k]]]));
  Object.assign(errors, template.validate?.(v.data, linked) ?? {});

  if (Object.keys(errors).length) return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
  return { ok: true, values: v };
}

function owners(row: { id: number; companyId: number | null; candidateId: number | null; mandateId: number | null }): OwnerRef[] {
  return [
    { type: "contract" as const, id: row.id },
    ...(row.companyId ? [{ type: "company" as const, id: row.companyId }] : []),
    ...(row.candidateId ? [{ type: "candidate" as const, id: row.candidateId }] : []),
    ...(row.mandateId ? [{ type: "mandate" as const, id: row.mandateId }] : []),
  ];
}

function contractYear(): number {
  return Number(todayIso().slice(0, 4));
}

export async function createContract(templateId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const template = getTemplate(z.string().max(40).parse(templateId));
  if (!template) return fail("Diese Vorlage gibt es nicht.");
  const checked = await checkForm(template, formData);
  if (!checked.ok) return checked.state;
  const db = await getDb();
  const row = await insertContractWithNumber(db, { ...checked.values, template: template.id, status: "entwurf" }, contractYear());
  await logActivity(owners({ ...checked.values, id: row.id }), `Vertrag ${row.number} als Entwurf erstellt: ${checked.values.title}`);
  await audit("create", { entity: "contract", entityId: row.id, summary: `Vertrag ${row.number}` });
  redirect(`/admin/vertraege/${row.id}`);
}

export async function updateContract(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (current.status !== "entwurf") return fail("Nur Entwürfe können bearbeitet werden. Kopiere den Vertrag als neuen Entwurf.");
  const template = getTemplate(current.template);
  if (!template) return fail("Die Vorlage dieses Vertrags gibt es nicht mehr.");
  const checked = await checkForm(template, formData);
  if (!checked.ok) return checked.state;
  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ ...checked.values, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, "entwurf")))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Vertrag ist kein Entwurf mehr und wurde nicht geändert.");
  await logActivity({ type: "contract", id: contractId }, "Entwurf bearbeitet.");
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}` });
  redirect(`/admin/vertraege/${contractId}`);
}

/** Status changes without a date: sent, back to draft, cancelled, reopened. */
const simpleTransitions: Record<string, { from: string[]; text: string }> = {
  versendet: { from: ["entwurf"], text: "als versendet markiert" },
  entwurf: { from: ["versendet", "storniert"], text: "wieder als Entwurf geöffnet" },
  storniert: { from: ["entwurf", "versendet"], text: "storniert" },
};

export async function markContract(id: number, status: string): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const target = z.enum(["versendet", "entwurf", "storniert"]).parse(status);
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  const rule = simpleTransitions[target];
  if (!rule.from.includes(current.status)) return fail("Dieser Statuswechsel ist nicht möglich.");
  if (target === "entwurf" && current.signedAt) return fail("Ein unterzeichneter Vertrag kann nicht wieder Entwurf werden.");
  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ status: target, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, current.status)))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Status wurde inzwischen geändert. Bitte Seite neu laden.");
  await logActivity({ type: "contract", id: contractId }, `Vertrag ${current.number} ${rule.text}.`);
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}: Status ${target}` });
  refresh();
  return ok(`Vertrag ${rule.text}.`);
}

export async function signContract(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const parsed = parseForm(statusDateSchema, formData);
  if (!parsed.ok) return parsed.state;
  const date = parsed.data.date as string;
  if (date > todayIso()) return fail("Bitte prüfe das Datum.", { date: "Das Datum liegt in der Zukunft." });
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (current.status !== "entwurf" && current.status !== "versendet") return fail("Dieser Vertrag ist bereits unterzeichnet, beendet oder storniert.");
  const template = getTemplate(current.template);

  // A consent applies for the retention period from the day it was given.
  let validUntil = current.validUntil;
  if (template?.id === "einwilligung") {
    const months = Number((current.data as Record<string, unknown>).retentionMonths) || Number(template.defaults.retentionMonths) || 24;
    validUntil = addMonthsIso(date, months);
  }

  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ status: "unterzeichnet", signedAt: date, validUntil, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, current.status)))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Status wurde inzwischen geändert. Bitte Seite neu laden.");
  await logActivity(owners(current), `Vertrag ${current.number} unterzeichnet am ${formatDate(date)}: ${current.title}`);
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}: unterzeichnet` });

  // A signed consent for a mandate is the consent of the matching submission (if none is recorded yet).
  let note: string | null = null;
  if (template?.id === "einwilligung" && current.candidateId && current.mandateId) {
    note = await takeOverSignedConsent(db, contractId, { number: current.number, candidateId: current.candidateId, mandateId: current.mandateId, signedOn: date });
  }
  refresh();
  return ok(note ? `Als unterzeichnet erfasst. ${note}` : "Als unterzeichnet erfasst.");
}

/**
 * Applies a signed consent form to the submission of its mandate and logs what happened. A
 * withdrawal or objection is only lifted by a form signed after it; otherwise it stays and
 * the history says why. Returns a note for Ferhat when the consent was not taken over.
 */
async function takeOverSignedConsent(
  db: AdminDb,
  contractId: number,
  contract: { number: string; candidateId: number; mandateId: number; signedOn: string },
): Promise<string | null> {
  const outcome = await applySignedConsent(db, contract);
  const owners: OwnerRef[] = [
    { type: "candidate", id: contract.candidateId },
    { type: "mandate", id: contract.mandateId },
    { type: "contract", id: contractId },
  ];
  const source = `Einwilligung aus Vertrag ${contract.number} (unterzeichnet am ${formatDate(contract.signedOn)})`;
  if (outcome.applied) {
    const lifted = [
      outcome.withdrawalLifted ? `Widerruf vom ${formatDate(outcome.withdrawalLifted.at)} aufgehoben` : null,
      outcome.objectionLifted ? `Widerspruch vom ${formatDate(outcome.objectionLifted.at)} aufgehoben` : null,
    ].filter(Boolean);
    await logActivity(owners, `${source} für den Vorschlag ${displayNo.submission(outcome.submissionId)} übernommen${lifted.length ? `; ${lifted.join(", ")}` : ""}.`);
    await audit("consent", {
      entity: "submission",
      entityId: outcome.submissionId,
      summary: `Einwilligung aus Vertrag ${contract.number}${outcome.withdrawalLifted ? ", Widerruf aufgehoben" : ""}${outcome.objectionLifted ? ", Widerspruch aufgehoben" : ""}`,
    });
    return null;
  }
  if (outcome.reason === "withdrawn_later" || outcome.reason === "objection_later") {
    const blocker = outcome.reason === "withdrawn_later" ? `Der Widerruf vom ${formatDate(outcome.withdrawnAt)}` : `Der Widerspruch vom ${formatDate(outcome.objectionAt)}`;
    await logActivity(
      owners,
      `${source} nicht übernommen: ${blocker} liegt nicht vor der Unterschrift. Eine erneute Einwilligung im Mandat erfassen, wenn die Fachperson sie bestätigt.`,
    );
    await audit("consent", { entity: "submission", entityId: outcome.submissionId, summary: `Einwilligung aus Vertrag ${contract.number} nicht übernommen (${outcome.reason})` });
    return `Die Einwilligung wurde nicht beim Vorschlag übernommen: ${blocker} liegt nicht vor der Unterschrift.`;
  }
  return null;
}

export async function endContract(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const parsed = parseForm(statusDateSchema, formData);
  if (!parsed.ok) return parsed.state;
  const date = parsed.data.date as string;
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (current.status !== "unterzeichnet") return fail("Nur unterzeichnete Verträge können beendet werden.");
  if (current.signedAt && date < current.signedAt) return fail("Bitte prüfe das Datum.", { date: "Das Ende liegt vor der Unterzeichnung." });
  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ status: "beendet", validUntil: date, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, "unterzeichnet")))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Status wurde inzwischen geändert. Bitte Seite neu laden.");
  await logActivity(owners(current), `Vertrag ${current.number} beendet per ${formatDate(date)}.`);
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}: beendet` });
  refresh();
  return ok("Als beendet erfasst.");
}

/** New draft with a new number and the same content; the original stays as it is. */
export async function copyContract(id: number): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  const db = await getDb();
  const row = await insertContractWithNumber(
    db,
    {
      template: current.template,
      title: current.title,
      status: "entwurf",
      companyId: current.companyId,
      contactId: current.contactId,
      candidateId: current.candidateId,
      mandateId: current.mandateId,
      parentId: current.parentId,
      data: current.data,
      validFrom: current.validFrom,
      validUntil: current.template === "einwilligung" ? null : current.validUntil,
      notes: current.notes,
    },
    contractYear(),
  );
  await logActivity({ type: "contract", id: row.id }, `Entwurf als Kopie von ${current.number} erstellt.`);
  await logActivity({ type: "contract", id: contractId }, `Als neuer Entwurf ${row.number} kopiert.`);
  await audit("create", { entity: "contract", entityId: row.id, summary: `Vertrag ${row.number} (Kopie von ${current.number})` });
  redirect(`/admin/vertraege/${row.id}/bearbeiten`);
}

export async function deleteContract(id: number): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const db = await getDb();
  // Only drafts: a sent or signed contract stays on record (cancel it instead).
  const [row] = await db
    .delete(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.status, "entwurf")))
    .returning({ number: contracts.number });
  if (!row) return fail("Nur Entwürfe können gelöscht werden.");
  await audit("delete", { entity: "contract", entityId: contractId, summary: `Vertrag ${row.number}` });
  redirect("/admin/vertraege");
}
