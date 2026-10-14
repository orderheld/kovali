import { z } from "zod";
import { sortExperience } from "@/lib/admin/dossier";
import { todayIso } from "@/lib/admin/format";
import { f, fail, formObject, type ActionState } from "@/lib/admin/forms";
import {
  candidateSources,
  candidateStatuses,
  disciplines,
  engagements,
  languageLevels,
  manualConsentMethods,
  rateUnits,
  remoteOptions,
  seniorities,
  valuesOf,
  workPermits,
} from "@/lib/admin/options";
import { normalizeSkills } from "@/lib/admin/skills";

/** Server-side validation of the candidate form, including its repeatable sections. */

const text = (max: number, required?: string) => {
  const base = z.preprocess((v) => (v === null || v === undefined ? "" : v), z.string().trim().max(max, `Höchstens ${max} Zeichen.`));
  return required ? base.refine((s) => s.length > 0, required) : base;
};

/**
 * Month as YYYY-MM. Browsers without a month picker (Firefox, Safari) send what was typed,
 * so "03.2024" and "3/2024" are accepted as well.
 */
export function normalizeMonth(value: unknown): unknown {
  if (typeof value !== "string") return value ?? "";
  const s = value.trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{1,2})\s*[./]\s*(\d{4})$/.exec(s);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return s;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = (message: string) => z.preprocess(normalizeMonth, z.string().regex(MONTH, message));
const optMonth = (message: string) => z.preprocess(normalizeMonth, z.union([z.literal(""), z.string().regex(MONTH, message)]));

export const languageItem = z.object({
  language: text(60, "Bitte die Sprache angeben."),
  level: z.enum(valuesOf(languageLevels), { error: "Bitte das Niveau wählen." }),
});

export const educationItem = z.object({
  title: text(200, "Bitte den Abschluss angeben."),
  institution: text(200),
  year: text(20),
});

export const experienceItem = z
  .object({
    role: text(160, "Bitte die Rolle angeben."),
    client: text(160),
    industry: text(120),
    from: month("Bitte den Beginn als Monat und Jahr angeben, z. B. 2024-03."),
    to: optMonth("Bitte das Ende als Monat und Jahr angeben oder leer lassen."),
    description: text(4000),
    technologies: z
      .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.string().trim().max(80, "Technologien höchstens 80 Zeichen.")).max(40, "Höchstens 40 Technologien."))
      .transform((list) => normalizeSkills(list.filter(Boolean))),
  })
  .refine((e) => !e.to || e.to >= e.from, { message: "Das Ende liegt vor dem Beginn.", path: ["to"] });

/** A row the user added but left empty is dropped instead of failing validation. */
function isBlankRow(row: unknown, ignore: string[] = []): boolean {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  return Object.entries(row).every(
    ([k, v]) => ignore.includes(k) || v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0),
  );
}

/** JSON list from a hidden input (repeatable section), validated item by item with f.jsonList. */
function rows<T extends z.ZodType>(item: T, max: number, ignore: string[] = []) {
  return z.preprocess((v) => {
    let value: unknown = v;
    if (typeof v === "string") {
      if (v.trim() === "") return [];
      try {
        value = JSON.parse(v);
      } catch {
        return v; // f.jsonList reports it as unreadable
      }
    }
    return Array.isArray(value) ? value.filter((row) => !isBlankRow(row, ignore)) : value;
  }, f.jsonList(item, max));
}

export const languagesField = rows(languageItem, 20, ["level"]);
export const educationField = rows(educationItem, 30);
export const experienceField = rows(experienceItem, 60);

/** Labels for error messages of repeatable sections ("Werdegang, Eintrag 2: …"). */
const sectionLabels: Record<string, string> = { languages: "Sprachen", education: "Ausbildung", experience: "Werdegang" };

const skillList = (maxItems: number) => f.stringList(maxItems, 80).transform((list) => normalizeSkills(list));

export const candidateSchema = z
  .object({
    firstName: f.text(80, "Bitte den Vornamen eingeben."),
    lastName: f.text(80, "Bitte den Nachnamen eingeben."),
    email: f.optEmail(),
    phone: f.optText(40),
    dateOfBirth: f.optDate(),
    street: f.optText(160),
    postalCode: f.optText(12),
    city: f.optText(80),
    country: f.text(80, "Bitte das Land eingeben."),
    nationality: f.optText(80),
    workPermit: f.optEnum(valuesOf(workPermits)),

    headline: f.optText(160),
    summary: f.optText(4000),
    disciplines: f.stringList(20, 60).pipe(z.array(z.enum(valuesOf(disciplines), { error: "Ungültiger Schwerpunkt." }))),
    seniority: f.optEnum(valuesOf(seniorities)),
    skills: skillList(100),
    sapModules: skillList(60),
    certifications: f.stringList(40, 120),
    languages: languagesField,
    education: educationField,
    // Stored newest first, so the form, the detail page and the dossier show the same order.
    experience: experienceField.transform((list) => sortExperience(list)),

    engagement: f.enum(valuesOf(engagements)),
    companyId: f.optInt(1, Number.MAX_SAFE_INTEGER),
    availableFrom: f.optDate(),
    workloadMin: f.optInt(0, 100),
    workloadMax: f.optInt(0, 100),
    rateAmount: f.optAmount(100_000),
    rateUnit: f.optEnum(valuesOf(rateUnits)),
    salaryExpectation: f.optInt(0, 10_000_000),
    remote: f.optEnum(valuesOf(remoteOptions)),
    regions: f.optText(200),
    noticePeriod: f.optText(80),

    // Origin of the data is required: a request for information under the DSG must name it.
    source: f.enum(valuesOf(candidateSources), "Bitte die Herkunft der Daten wählen."),
    status: f.enum(valuesOf(candidateStatuses)),
    rating: f.optInt(1, 5),
    notes: f.optText(5000),

    consentAt: f.optDate(),
    consentNote: f.optText(300),
    privacyInfoAt: f.optDate(),
    retentionUntil: f.optDate(),
  })
  .superRefine((d, ctx) => {
    const today = todayIso();
    if (d.workloadMin !== null && d.workloadMax !== null && d.workloadMin > d.workloadMax) {
      ctx.addIssue({ code: "custom", path: ["workloadMax"], message: "Das maximale Pensum ist kleiner als das minimale." });
    }
    if (d.rateAmount !== null && !d.rateUnit) {
      ctx.addIssue({ code: "custom", path: ["rateUnit"], message: "Bitte wählen: pro Stunde oder pro Tag." });
    }
    if (d.dateOfBirth && (d.dateOfBirth >= today || d.dateOfBirth < "1900-01-01")) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Bitte ein gültiges Geburtsdatum eingeben." });
    }
    if (d.consentAt && d.consentAt > today) {
      ctx.addIssue({ code: "custom", path: ["consentAt"], message: "Die Einwilligung kann nicht in der Zukunft liegen." });
    }
    if (d.privacyInfoAt && d.privacyInfoAt > today) {
      ctx.addIssue({ code: "custom", path: ["privacyInfoAt"], message: "Das Datum kann nicht in der Zukunft liegen." });
    }
  });

export type CandidateInput = z.output<typeof candidateSchema>;

/**
 * Like parseForm(), but errors inside a repeatable section name the entry, e.g.
 * "Werdegang, Eintrag 2: Bitte die Rolle angeben.", because the whole section shares one
 * error slot.
 */
export function parseCandidateForm(
  fd: FormData | Record<string, unknown>,
): { ok: true; data: CandidateInput } | { ok: false; state: ActionState } {
  const raw = fd instanceof FormData ? formObject(fd) : fd;
  const result = candidateSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_form");
    const index = issue.path[1];
    const section = sectionLabels[key];
    errors[key] ??= section && typeof index === "number" ? `${section}, Eintrag ${index + 1}: ${issue.message}` : issue.message;
  }
  return { ok: false, state: fail("Bitte prüfe die markierten Felder.", errors) };
}

/** Skills chosen from "Im Lebenslauf erkannt". */
export const adoptSkillsSchema = z.object({
  id: z.number().int().positive(),
  skills: z.array(z.string().trim().min(1).max(80)).min(1, "Bitte mindestens ein Stichwort auswählen.").max(200),
});

/** Required ISO date (YYYY-MM-DD), not in the future. */
const pastDate = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ error: "Bitte ein Datum eingeben." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum eingeben.")
      .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Bitte ein gültiges Datum eingeben.")
      .refine((s) => s <= todayIso(), "Das Datum liegt in der Zukunft."),
  );

/** Objection to any further hand-over (Widerspruch), as the candidate communicated it. */
export const objectionSchema = z.object({
  objectionDate: pastDate(),
  objectionMethod: f.enum(valuesOf(manualConsentMethods), "Bitte wählen, wie der Widerspruch mitgeteilt wurde."),
  objectionReason: f.optText(300),
});

/** Lifting an objection needs a reason; it ends up in the history. */
export const liftObjectionSchema = z.object({
  liftNote: f.text(300, "Bitte festhalten, warum der Widerspruch aufgehoben wird."),
});
