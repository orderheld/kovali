import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/admin/db/client";
import { settings } from "@/lib/admin/db/schema";
import { parseStoredDefaults } from "./schema";

/** Settings key of Ferhat's own calculator defaults (rates and scenario). */
export const CALCULATOR_SETTINGS_KEY = "rechner_defaults";

export async function loadCalculatorDefaults() {
  const db = await getDb();
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, CALCULATOR_SETTINGS_KEY)).limit(1);
  return row ? parseStoredDefaults(row.value) : null;
}
