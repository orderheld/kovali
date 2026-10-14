import { z } from "zod";
import { EARNINGS_DEFAULTS, EARNINGS_FIELDS, flatFromSettings, settingsFromFlat, type EarningsField, type EarningsSettings } from "./earnings";
import { parseDecimal } from "./payroll";

/**
 * Validation of the earnings settings (settings key "einkommen"): the strict form schema for
 * "Als Standard speichern" on /admin/rechner, and a tolerant parser for the stored value that
 * keeps every valid field and falls back to the default for missing, old or invalid ones.
 * Both are built from EARNINGS_FIELDS, so form and storage cannot disagree.
 */

/** Settings key in the settings table. */
export const EARNINGS_SETTINGS_KEY = "einkommen";

function fieldSchema(field: EarningsField) {
  if (field.type === "boolean") return z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
  if (field.type === "choice") {
    const values = (field.choices ?? []).map((c) => c.value) as [string, ...string[]];
    return z.enum(values, { error: "Bitte auswählen." });
  }
  const min = field.min ?? 0;
  const max = field.max ?? 1_000_000;
  const message = `Bitte eine Zahl zwischen ${min} und ${max} eingeben.`;
  const n = z.number({ error: message }).min(min, message).max(max, message);
  return z.preprocess((v) => {
    const parsed = parseDecimal(v);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, field.integer ? n.int("Bitte eine ganze Zahl eingeben.") : n);
}

/** The submitted settings form (strings, checkboxes as "on"). */
export const earningsFormSchema = z
  .object(Object.fromEntries(EARNINGS_FIELDS.map((f) => [f.key, fieldSchema(f)])))
  .superRefine((v, ctx) => {
    const min = v.accidentMinIncome as number;
    const max = v.accidentMaxIncome as number;
    if (typeof min === "number" && typeof max === "number" && max < min) {
      ctx.addIssue({ code: "custom", path: ["accidentMaxIncome"], message: "Muss mindestens so hoch sein wie der Mindestverdienst." });
    }
  });

/** Settings from a validated form. */
export function settingsFromForm(data: Record<string, unknown>, base: EarningsSettings = EARNINGS_DEFAULTS): EarningsSettings {
  return settingsFromFlat(data, base);
}

/**
 * Reads a stored settings value. Accepts the nested shape that is saved ({ ..., payroll: {...} })
 * and flat "payroll.x" keys; every field that is missing or invalid takes the value of
 * `fallback`, so older or partial values never break the pages.
 */
export function parseEarningsSettings(value: unknown, fallback: EarningsSettings = EARNINGS_DEFAULTS): EarningsSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const stored = value as Record<string, unknown>;
  const payroll = stored.payroll && typeof stored.payroll === "object" && !Array.isArray(stored.payroll) ? (stored.payroll as Record<string, unknown>) : {};
  const defaults = flatFromSettings(fallback);
  const flat: Record<string, unknown> = {};
  for (const f of EARNINGS_FIELDS) {
    const raw = f.key.startsWith("payroll.") ? (payroll[f.key.slice(8)] ?? stored[f.key]) : stored[f.key];
    let next: unknown = defaults[f.key];
    if (f.type === "boolean") {
      // Only real booleans: a missing or odd value must not turn into false.
      if (typeof raw === "boolean") next = raw;
    } else if (raw !== undefined && raw !== null) {
      const parsed = fieldSchema(f).safeParse(raw);
      if (parsed.success) next = parsed.data;
    }
    flat[f.key] = next;
  }
  return settingsFromFlat(flat, fallback);
}

/** When the settings were last saved, if the stored value says so. */
export function savedAtOf(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const savedAt = (value as { savedAt?: unknown }).savedAt;
  return typeof savedAt === "string" ? savedAt : null;
}
