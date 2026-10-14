"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { settings } from "@/lib/admin/db/schema";
import { ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { CALCULATOR_SETTINGS_KEY } from "./defaults";
import { calculatorFormSchema, toDefaults } from "./schema";

/** Stores the current rates and scenario as Ferhat's own defaults. */
export async function saveCalculatorDefaults(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseForm(calculatorFormSchema, formData);
  if (!parsed.ok) return parsed.state;
  const value = { ...toDefaults(parsed.data), savedAt: new Date().toISOString() };
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: CALCULATOR_SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  await audit("update", { entity: "settings", summary: "Rechner: eigene Standardwerte gespeichert" });
  refresh();
  return ok("Als deine Standardwerte gespeichert.");
}

/** Removes Ferhat's own defaults; the calculator then starts with the official values. */
export async function clearCalculatorDefaults(): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, CALCULATOR_SETTINGS_KEY));
  await audit("update", { entity: "settings", summary: "Rechner: eigene Standardwerte entfernt" });
  refresh();
  return ok("Eigene Standardwerte entfernt. Es gelten wieder die amtlichen Werte.");
}
