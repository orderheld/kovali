import { z } from "zod";

/**
 * Form handling shared by all admin and portal Server Actions: one state shape for
 * useActionState and small Zod helpers that turn FormData strings into typed values.
 */

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: Record<string, string> }
  | { status: "success"; message?: string };

export const idle: ActionState = { status: "idle" };

export function fail(message: string, errors?: Record<string, string>): ActionState {
  return { status: "error", message, errors };
}

export function ok(message?: string): ActionState {
  return { status: "success", message };
}

/** All single-valued fields of a form; internal Next.js fields are dropped. */
export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("$ACTION") || typeof value !== "string") continue;
    out[key] = value;
  }
  return out;
}

/** Validates a form against a Zod schema and maps issues to field messages. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  fd: FormData | Record<string, unknown>,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const raw = fd instanceof FormData ? formObject(fd) : fd;
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_form");
    errors[key] ??= issue.message;
  }
  return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
}

const blankToNull = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null);

export const f = {
  /** Required text. */
  text: (max = 200, message = "Bitte ausfüllen.") =>
    z.preprocess(blankToNull, z.string({ error: message }).min(1, message).max(max, `Höchstens ${max} Zeichen.`)),
  /** Optional text: empty becomes null. */
  optText: (max = 200) => z.preprocess(blankToNull, z.string().max(max, `Höchstens ${max} Zeichen.`).nullable()),
  optEmail: () => z.preprocess(blankToNull, z.email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200).nullable()),
  email: () => z.preprocess(blankToNull, z.email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200)),
  optUrl: () =>
    z.preprocess(
      (v) => {
        const s = blankToNull(v);
        return typeof s === "string" && !/^https?:\/\//i.test(s) ? `https://${s}` : s;
      },
      z.url("Bitte eine gültige Adresse eingeben.").max(300).nullable(),
    ),
  /** Optional whole number within a range. */
  optInt: (min: number, max: number) =>
    z.preprocess(
      (v) => {
        const s = blankToNull(v);
        return typeof s === "string" ? Number(s.replace(/['’\s]/g, "")) : s;
      },
      z.number({ error: "Bitte eine Zahl eingeben." }).int("Bitte eine ganze Zahl eingeben.").min(min, `Mindestens ${min}.`).max(max, `Höchstens ${max}.`).nullable(),
    ),
  /** Optional amount (CHF), accepts 1'250.50 and 1250,50. */
  optAmount: (max = 10_000_000) =>
    z.preprocess(
      (v) => {
        const s = blankToNull(v);
        return typeof s === "string" ? Number(s.replace(/['’\s]/g, "").replace(",", ".")) : s;
      },
      z.number({ error: "Bitte einen Betrag eingeben." }).min(0, "Der Betrag darf nicht negativ sein.").max(max).nullable(),
    ),
  /** Optional ISO date (YYYY-MM-DD, as sent by <input type="date">). */
  optDate: () =>
    z.preprocess(
      blankToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum eingeben.")
        .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Bitte ein gültiges Datum eingeben.")
        .nullable(),
    ),
  enum: <V extends string>(values: readonly [V, ...V[]], message = "Bitte auswählen.") =>
    z.preprocess(blankToNull, z.enum(values, { error: message })),
  optEnum: <V extends string>(values: readonly [V, ...V[]]) =>
    z.preprocess(blankToNull, z.enum(values, { error: "Ungültige Auswahl." }).nullable()),
  /** Checkbox: present ("on") means true. */
  checkbox: () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  /** A list of short strings sent as JSON (TagInput) or comma-separated. */
  stringList: (maxItems = 80, maxLen = 80) =>
    z.preprocess(
      (v) => {
        if (Array.isArray(v)) return v;
        if (typeof v !== "string" || v.trim() === "") return [];
        try {
          const parsed: unknown = JSON.parse(v);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // fall through to comma-separated
        }
        return v.split(",");
      },
      z
        .array(z.string().trim().max(maxLen, `Einträge höchstens ${maxLen} Zeichen.`))
        .max(maxItems, `Höchstens ${maxItems} Einträge.`)
        .transform((list) => dedupe(list.filter(Boolean))),
    ),
  /** A JSON array of objects (repeatable form sections). */
  jsonList: <T extends z.ZodType>(item: T, maxItems = 50) =>
    z.preprocess(
      (v) => {
        if (Array.isArray(v)) return v;
        if (typeof v !== "string" || v.trim() === "") return [];
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      },
      z.array(item, { error: "Die Einträge konnten nicht gelesen werden." }).max(maxItems, `Höchstens ${maxItems} Einträge.`),
    ),
};

export function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Positive integer id from a route parameter, or null. */
export function parseId(value: string | undefined): number | null {
  if (!value || !/^\d{1,12}$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}
