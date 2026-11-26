import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { settings } from "../db/schema";
import { EARNINGS_DEFAULTS, type EarningsSettings } from "../earnings";
import { EARNINGS_SETTINGS_KEY, parseEarningsSettings, savedAtOf, withFirmVat } from "../earnings-settings";
import { kovaliVatRegistered } from "../party";

/** Defaults with the MWST status from the firm data (src/config/site.ts). */
export function earningsFallback(): EarningsSettings {
  return { ...EARNINGS_DEFAULTS, vatRegistered: kovaliVatRegistered() };
}

/**
 * Ferhat's earnings settings (settings "einkommen"), or the defaults when none are saved. A
 * confirmed MWST number in site.ts always counts, even against older saved assumptions.
 */
export async function loadEarningsSettings(): Promise<{ settings: EarningsSettings; savedAt: string | null; saved: boolean }> {
  const db = await getDb();
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, EARNINGS_SETTINGS_KEY)).limit(1);
  const fallback = earningsFallback();
  if (!row) return { settings: fallback, savedAt: null, saved: false };
  return { settings: withFirmVat(parseEarningsSettings(row.value, fallback), kovaliVatRegistered()), savedAt: savedAtOf(row.value), saved: true };
}
