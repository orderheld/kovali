"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity, ownedByDormantCandidate } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getContract, loadLinkFacts } from "@/lib/admin/contracts/data";
import { insertContractWithNumber } from "@/lib/admin/contracts/numbering";
import { resolveContractLinks, type ResolvedLinks } from "@/lib/admin/contracts/rules";
import { getDb } from "@/lib/admin/db/client";
import { activities, contracts } from "@/lib/admin/db/schema";
import { checkUpload, storeDocument } from "@/lib/admin/documents";
import { formatDate, todayIso } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { contractKinds, contractStatuses, labelOf } from "@/lib/admin/options";
import { ownerLabel, type OwnerRef } from "@/lib/admin/owner";
import { redirectAfterChange } from "@/lib/admin/redirect";
import { contractSchema, signSchema, type ContractInput } from "./schema";

const idSchema = z.number().int().positive();

/** The contract and the records it belongs to, so its history shows there too. */
function owners(contractId: number, links: { companyId: number | null; assignmentId: number | null }): OwnerRef[] {
  return [
    { type: "contract", id: contractId },
    ...(links.companyId ? [{ type: "company" as const, id: links.companyId }] : []),
    ...(links.assignmentId ? [{ type: "assignment" as const, id: links.assignmentId }] : []),
  ];
}

function isLegacyKind(kind: string): boolean {
  return contractKinds.some((k) => k.value === kind && k.legacy);
}

type Checked = { ok: true; data: ContractInput; links: ResolvedLinks } | { ok: false; state: ActionState };

/** Form fields and links; `extraErrors` (e.g. of the file) are reported together with them. */
async function checkForm(formData: FormData, current: { id: number; kind: string } | null, extraErrors: Record<string, string> = {}): Promise<Checked> {
  const parsed = parseForm(contractSchema, formData);
  if (!parsed.ok) {
    const errors = parsed.state.status === "error" ? parsed.state.errors : undefined;
    return { ok: false, state: fail("Bitte prüfe die markierten Felder.", { ...errors, ...extraErrors }) };
  }
  const data = parsed.data;
  const errors: Record<string, string> = { ...extraErrors };
  // Old kinds (Subunternehmer, Beratung, Einwilligung) stay on contracts that have them.
  if (isLegacyKind(data.kind) && data.kind !== current?.kind) errors.kind = "Diese Art wird nicht mehr angeboten.";
  const facts = await loadLinkFacts(data);
  const resolved = resolveContractLinks(data, { ...facts, selfId: current?.id, today: todayIso() });
  Object.assign(errors, resolved.errors);
  if (Object.keys(errors).length) return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
  return { ok: true, data, links: resolved.values };
}

function fieldsOf(data: ContractInput, links: ResolvedLinks) {
  return {
    title: data.title,
    template: data.kind,
    status: data.status,
    ...links,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    signedAt: data.signedAt,
    noticePeriod: data.noticePeriod,
    notes: data.notes,
  };
}

/** Files a contract with the next number of the year; an attached file is stored with it. */
export async function createContract(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  // The file is optional: an empty file field is fine, an unreadable or too large file is not.
  const upload = await checkUpload(formData.get("file"));
  const fileError: Record<string, string> = !upload.ok && !upload.empty ? { file: upload.error } : {};
  const checked = await checkForm(formData, null, fileError);
  if (!checked.ok) return checked.state;
  const { data, links } = checked;

  const db = await getDb();
  const row = await insertContractWithNumber(
    db,
    { ...fieldsOf(data, links), sentAt: data.status === "versendet" ? new Date() : null },
    Number(todayIso().slice(0, 4)),
  );
  let file = "";
  if (upload.ok) {
    const stored = await storeDocument({ owner: { contractId: row.id }, kind: "vertrag", file: upload });
    await audit("create", { entity: "document", entityId: stored.id, summary: `Dokument zu ${ownerLabel({ type: "contract", id: row.id })}` });
    file = `, mit Datei ${upload.filename}`;
  }
  await logActivity(owners(row.id, links), `Vertrag ${row.number} abgelegt: ${data.title} (${labelOf(contractKinds, data.kind)}${file})`);
  await audit("create", { entity: "contract", entityId: row.id, summary: `Vertrag ${row.number}` });
  redirectAfterChange(`/admin/vertraege/${row.id}`);
}

export async function updateContract(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  const checked = await checkForm(formData, { id: contractId, kind: current.template });
  if (!checked.ok) return checked.state;
  const { data, links } = checked;

  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ ...fieldsOf(data, links), ...(data.status === "versendet" && !current.sentAt ? { sentAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning({ id: contracts.id });
  if (!row) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (data.status !== current.status) {
    await logActivity(
      owners(contractId, links),
      `Vertrag ${current.number}: ${labelOf(contractStatuses, current.status)} → ${labelOf(contractStatuses, data.status)}`,
    );
  }
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}` });
  redirectAfterChange(`/admin/vertraege/${contractId}`);
}

/** Status changes with one click. Signing has its own action with a date. */
const transitions: Record<string, string[]> = {
  versendet: ["entwurf"],
  entwurf: ["versendet", "storniert"],
  beendet: ["unterzeichnet"],
  storniert: ["entwurf", "versendet"],
};

export async function setContractStatus(id: number, status: string): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const target = z.enum(["versendet", "entwurf", "beendet", "storniert"]).parse(status);
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (!transitions[target].includes(current.status)) return fail("Dieser Wechsel ist von hier aus nicht möglich. Ändere den Status unter «Bearbeiten».");
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(contracts)
    .set({ status: target, ...(target === "versendet" && !current.sentAt ? { sentAt: now } : {}), updatedAt: now })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, current.status)))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Status wurde inzwischen geändert. Bitte lade die Seite neu.");
  await logActivity(owners(contractId, current), `Vertrag ${current.number}: ${labelOf(contractStatuses, current.status)} → ${labelOf(contractStatuses, target)}`);
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}: Status ${target}` });
  refresh();
  return ok(`Status: ${labelOf(contractStatuses, target)}.`);
}

export async function signContract(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const parsed = parseForm(signSchema, formData);
  if (!parsed.ok) return parsed.state;
  const signedAt = parsed.data.signedAt as string;
  if (signedAt > todayIso()) return fail("Bitte prüfe das Datum.", { signedAt: "Das Datum liegt in der Zukunft." });
  const current = await getContract(contractId);
  if (!current) return fail("Diesen Vertrag gibt es nicht mehr.");
  if (current.status !== "entwurf" && current.status !== "versendet") return fail("Dieser Vertrag ist schon unterzeichnet, beendet oder hinfällig.");
  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ status: "unterzeichnet", signedAt, updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), eq(contracts.status, current.status)))
    .returning({ id: contracts.id });
  if (!row) return fail("Der Status wurde inzwischen geändert. Bitte lade die Seite neu.");
  await logActivity(owners(contractId, current), `Vertrag ${current.number} unterzeichnet am ${formatDate(signedAt)}.`);
  await audit("update", { entity: "contract", entityId: contractId, summary: `Vertrag ${current.number}: Status unterzeichnet` });
  refresh();
  return ok("Als unterzeichnet erfasst.");
}

/**
 * Deletes a contract with its documents and its own notes (on delete cascade). History entries
 * that also belong to its company or assignment (or to a candidate of the former module) stay
 * there; contracts filed under it lose the link to their Rahmenvertrag.
 */
export async function deleteContract(id: number): Promise<ActionState> {
  await requireAdmin();
  const contractId = idSchema.parse(id);
  const db = await getDb();
  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ number: contracts.number, companyId: contracts.companyId, assignmentId: contracts.assignmentId })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .for("update")
      .limit(1);
    if (!row) return null;
    await tx
      .update(activities)
      .set({ contractId: null })
      .where(
        and(
          eq(activities.contractId, contractId),
          or(sql`num_nonnulls(${activities.companyId}, ${activities.mandateId}, ${activities.assignmentId}) > 0`, ownedByDormantCandidate()),
        ),
      );
    await tx.delete(contracts).where(eq(contracts.id, contractId));
    return row;
  });
  if (!deleted) return fail("Diesen Vertrag gibt es nicht mehr.");
  const others = owners(contractId, deleted).filter((o) => o.type !== "contract");
  await logActivity(others, `Vertrag ${deleted.number} gelöscht.`);
  await audit("delete", { entity: "contract", entityId: contractId, summary: `Vertrag ${deleted.number}` });
  redirectAfterChange("/admin/vertraege");
}
