"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyExists } from "@/lib/admin/data/mandates";
import { deleteSnippet, insertSnippet, setSnippetPinned, snippetCategories, updateSnippet, type SnippetValues } from "@/lib/admin/data/snippets";
import { displayNo } from "@/lib/admin/format";
import { fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { redirectAfterChange } from "@/lib/admin/redirect";
import { snippetSchema, type SnippetInput } from "./schema";

const idSchema = z.number().int().positive();
const label = (id: number) => `Textbaustein ${displayNo.snippet(id)}`;

/**
 * Checks the company and takes over the spelling of an existing category ("bewerbung" becomes
 * "Bewerbung" when that exists), so the list does not split one category in two.
 */
async function prepare(input: SnippetInput): Promise<{ ok: true; values: SnippetValues } | { ok: false; state: ActionState }> {
  if (input.companyId && !(await companyExists(input.companyId))) {
    return { ok: false, state: fail("Bitte prüfe die markierten Felder.", { companyId: "Diese Firma gibt es nicht mehr." }) };
  }
  let category = input.category;
  if (category) {
    const existing = (await snippetCategories()).find((c) => c.category.toLowerCase() === category!.toLowerCase());
    if (existing) category = existing.category;
  }
  return { ok: true, values: { ...input, category } };
}

export async function createSnippet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(snippetSchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepare(parsed.data);
  if (!prepared.ok) return prepared.state;
  const id = await insertSnippet(prepared.values);
  await audit("create", { entity: "snippet", entityId: id, summary: label(id) });
  redirectAfterChange(`/admin/texte/${id}`);
}

export async function editSnippet(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const snippetId = idSchema.parse(id);
  const parsed = parseForm(snippetSchema, formData);
  if (!parsed.ok) return parsed.state;
  const prepared = await prepare(parsed.data);
  if (!prepared.ok) return prepared.state;
  if (!(await updateSnippet(snippetId, prepared.values))) return fail("Diesen Textbaustein gibt es nicht mehr.");
  await audit("update", { entity: "snippet", entityId: snippetId, summary: label(snippetId) });
  redirectAfterChange(`/admin/texte/${snippetId}`);
}

export async function removeSnippet(id: number): Promise<ActionState> {
  await requireAdmin();
  const snippetId = idSchema.parse(id);
  if (!(await deleteSnippet(snippetId))) return fail("Diesen Textbaustein gibt es nicht mehr.");
  await audit("delete", { entity: "snippet", entityId: snippetId, summary: label(snippetId) });
  redirectAfterChange("/admin/texte");
}

/** Pins a snippet (shown first, on vacancies and on the dashboard) or releases it. */
export async function pinSnippet(id: number, pinned: boolean): Promise<ActionState> {
  await requireAdmin();
  const snippetId = idSchema.parse(id);
  const value = z.boolean().parse(pinned);
  if (!(await setSnippetPinned(snippetId, value))) return fail("Diesen Textbaustein gibt es nicht mehr.");
  await audit("update", { entity: "snippet", entityId: snippetId, summary: `${label(snippetId)}: ${value ? "angeheftet" : "gelöst"}` });
  refresh();
  return ok();
}
