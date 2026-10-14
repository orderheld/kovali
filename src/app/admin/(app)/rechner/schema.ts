import { z } from "zod";
import { OFFICIAL_RATES, parseDecimal, WAGE_DEFAULTS, type PayrollRates, type WageDefaults } from "@/lib/admin/payroll";

/**
 * Fields of the wage calculator. One list drives the live calculation in the browser, the
 * validation of "Als Standard speichern" on the server and the parsing of stored defaults,
 * so the three cannot disagree.
 */

type NumberKey = { [K in keyof PayrollRates]: PayrollRates[K] extends number ? K : never }[keyof PayrollRates];
type BoolKey = { [K in keyof PayrollRates]: PayrollRates[K] extends boolean ? K : never }[keyof PayrollRates];

export interface NumberField {
  name: NumberKey | keyof WageDefaults;
  min: number;
  max: number;
  integer?: boolean;
}

export const NUMBER_FIELDS: NumberField[] = [
  { name: "holidayWeeks", min: 4, max: 6, integer: true },
  { name: "holidayPercent", min: 0, max: 30 },
  { name: "publicHolidayPercent", min: 0, max: 10 },
  { name: "thirteenthPercent", min: 0, max: 20 },
  { name: "ahvIvEo", min: 0, max: 20 },
  { name: "alv", min: 0, max: 10 },
  { name: "alvMaxSalary", min: 0, max: 1_000_000 },
  { name: "fak", min: 0, max: 10 },
  { name: "famel", min: 0, max: 5 },
  { name: "akAdminPercent", min: 0, max: 10 },
  { name: "uvgBu", min: 0, max: 20 },
  { name: "uvgNbu", min: 0, max: 20 },
  { name: "uvgMaxSalary", min: 0, max: 1_000_000 },
  { name: "ktgEmployer", min: 0, max: 10 },
  { name: "ktgEmployee", min: 0, max: 10 },
  { name: "bvgEntryThreshold", min: 0, max: 1_000_000 },
  { name: "bvgCoordinationDeduction", min: 0, max: 1_000_000 },
  { name: "bvgUpperLimit", min: 0, max: 1_000_000 },
  { name: "bvgMinCoordinated", min: 0, max: 1_000_000 },
  { name: "bvgCredit25", min: 0, max: 40 },
  { name: "bvgCredit35", min: 0, max: 40 },
  { name: "bvgCredit45", min: 0, max: 40 },
  { name: "bvgCredit55", min: 0, max: 40 },
  { name: "bvgRiskPercent", min: 0, max: 20 },
  { name: "bvgEmployerShare", min: 50, max: 100 },
  { name: "gavEmployer", min: 0, max: 5 },
  { name: "gavEmployee", min: 0, max: 5 },
  { name: "retainedPercent", min: 0, max: 90 },
  { name: "hoursPerMonth", min: 1, max: 400 },
  { name: "age", min: 16, max: 70, integer: true },
];

export const BOOL_FIELDS: BoolKey[] = ["thirteenthEnabled", "gavEnabled"];

export interface CalculatorDefaults {
  rates: PayrollRates;
  wage: WageDefaults;
}

export const OFFICIAL_DEFAULTS: CalculatorDefaults = { rates: OFFICIAL_RATES, wage: WAGE_DEFAULTS };

function numberSchema(field: NumberField) {
  const message = `Bitte eine Zahl zwischen ${field.min} und ${field.max} eingeben.`;
  const n = z.number({ error: message }).min(field.min, message).max(field.max, message);
  return z.preprocess((v) => {
    const parsed = parseDecimal(v);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, field.integer ? n.int("Bitte eine ganze Zahl eingeben.") : n);
}

/** Validates the submitted form (strings, checkboxes as "on"). */
export const calculatorFormSchema = z.object({
  ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f.name, numberSchema(f)])),
  ...Object.fromEntries(BOOL_FIELDS.map((name) => [name, z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())])),
}) as unknown as z.ZodType<Record<NumberField["name"] | BoolKey, number | boolean>>;

/** Splits validated flat values into rates and scenario defaults. */
export function toDefaults(flat: Record<string, number | boolean>): CalculatorDefaults {
  const rates = { ...OFFICIAL_RATES };
  const wage = { ...WAGE_DEFAULTS };
  for (const key of Object.keys(flat)) {
    if (key in wage) (wage as Record<string, number>)[key] = flat[key] as number;
    else if (key in rates) (rates as Record<string, number | boolean>)[key] = flat[key];
  }
  return { rates, wage };
}

/** Flat values for the form fields. */
export function toFlat(d: CalculatorDefaults): Record<string, number | boolean> {
  return { ...d.rates, ...d.wage };
}

/**
 * Reads the form in the browser for the live calculation. Fields that are empty or invalid
 * fall back to the official default and are reported, so the result never shows NaN.
 */
export function readCalculatorForm(form: HTMLFormElement): { values: CalculatorDefaults; invalid: string[] } {
  const fd = new FormData(form);
  const flat: Record<string, number | boolean> = {};
  const invalid: string[] = [];
  const fallback = toFlat(OFFICIAL_DEFAULTS);
  for (const f of NUMBER_FIELDS) {
    const raw = fd.get(f.name);
    if (raw === null) continue;
    const v = parseDecimal(raw);
    if (Number.isNaN(v) || v < f.min || v > f.max) {
      invalid.push(f.name);
      flat[f.name] = fallback[f.name] as number;
    } else {
      flat[f.name] = v;
    }
  }
  for (const name of BOOL_FIELDS) flat[name] = fd.get(name) === "on";
  return { values: toDefaults(flat), invalid };
}

/** Parses a stored settings value; unknown or invalid entries fall back to the official values. */
export function parseStoredDefaults(value: unknown): (CalculatorDefaults & { savedAt: string | null }) | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { rates?: Record<string, unknown>; wage?: Record<string, unknown>; savedAt?: unknown };
  const parsed = calculatorFormSchema.safeParse({ ...toFlat(OFFICIAL_DEFAULTS), ...(v.rates ?? {}), ...(v.wage ?? {}) });
  if (!parsed.success) return null;
  return { ...toDefaults(parsed.data), savedAt: typeof v.savedAt === "string" ? v.savedAt : null };
}
