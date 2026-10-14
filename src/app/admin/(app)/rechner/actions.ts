"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { settings } from "@/lib/admin/db/schema";
import { earningsFallback } from "@/lib/admin/data/earnings";
import { EARNINGS_SETTINGS_KEY, earningsFormSchema, settingsFromForm } from "@/lib/admin/earnings-settings";
import { ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { redirectAfterChange } from "@/lib/admin/redirect";

/** Stores Ferhat's assumptions (settings "einkommen"); assignments and the dashboard use them. */
export async function saveEarningsSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(earningsFormSchema, formData);
  if (!parsed.ok) return parsed.state;
  const value = { ...settingsFromForm(parsed.data, earningsFallback()), savedAt: new Date().toISOString() };
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: EARNINGS_SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  await audit("update", { entity: "settings", summary: "Rechner: Annahmen gespeichert" });
  refresh();
  return ok("Gespeichert. Aufträge und Übersicht rechnen ab jetzt mit diesen Werten.");
}

/**
 * Removes the saved assumptions; everything uses the researched defaults again. The redirect
 * carries a new value of ?zurueckgesetzt=, so the page remounts the form with the defaults (a
 * save keeps the form and its success message).
 */
export async function clearEarningsSettings(): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, EARNINGS_SETTINGS_KEY));
  await audit("update", { entity: "settings", summary: "Rechner: Annahmen zurückgesetzt" });
  redirectAfterChange(`/admin/rechner?ansicht=annahmen&zurueckgesetzt=${Date.now()}`);
}
