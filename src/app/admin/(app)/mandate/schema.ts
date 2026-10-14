import { z } from "zod";
import { f } from "@/lib/admin/forms";
import {
  disciplines,
  mandateKinds,
  manualConsentMethods,
  mandatePriorities,
  mandateSources,
  mandateStatuses,
  portalVisibilities,
  profileVariants,
  rateUnits,
  remoteOptions,
  seniorities,
  submissionStatuses,
  valuesOf,
} from "@/lib/admin/options";

/** Server-side validation of the mandate, submission and portal forms. */

/** Optional record id from a select field. */
const optId = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : v ?? null),
    z.number({ error: "Ungültige Auswahl." }).int("Ungültige Auswahl.").positive("Ungültige Auswahl.").nullable(),
  );

const disciplineValues = new Set<string>(valuesOf(disciplines));

/**
 * Cross-field checks normally run only when the whole object parsed. This lets one run as soon
 * as the fields it reads are valid, so all errors appear after a single submit.
 */
function fieldsValid(issues: readonly { path?: readonly PropertyKey[] }[], fields: readonly string[]): boolean {
  return !issues.some((issue) => fields.includes(String(issue.path?.[0])));
}

export const mandateSchema = z
  .object({
    kind: f.enum(valuesOf(mandateKinds)),
    title: f.text(200, "Bitte einen Titel eingeben."),
    companyId: optId(),
    contactId: optId(),
    reference: f.optText(80),
    endClient: f.optText(160),
    description: f.optText(20_000),
    disciplines: f.stringList(20, 60).refine((list) => list.every((d) => disciplineValues.has(d)), "Ungültige Auswahl."),
    requiredSkills: f.stringList(60, 80),
    niceSkills: f.stringList(60, 80),
    seniority: f.optEnum(valuesOf(seniorities)),
    location: f.optText(120),
    remote: f.optEnum(valuesOf(remoteOptions)),
    workload: f.optInt(10, 100),
    startDate: f.optDate(),
    endDate: f.optDate(),
    durationText: f.optText(120),
    rateSell: f.optAmount(100_000),
    rateUnit: f.enum(valuesOf(rateUnits)),
    deadline: f.optDate(),
    source: f.optEnum(valuesOf(mandateSources)),
    status: f.enum(valuesOf(mandateStatuses)),
    priority: f.enum(valuesOf(mandatePriorities)),
    nextStep: f.optText(200),
    nextStepAt: f.optDate(),
    notes: f.optText(5000),
  })
  .refine((d) => !(d.startDate && d.endDate && d.endDate < d.startDate), {
    path: ["endDate"],
    message: "Das Ende liegt vor dem Start.",
    // Also report it while other fields still have errors, so one round trip shows everything.
    when: (payload) => fieldsValid(payload.issues, ["startDate", "endDate"]),
  });

export type MandateInput = z.output<typeof mandateSchema>;

export const mandateStatusSchema = z.enum(valuesOf(mandateStatuses));
export const submissionStatusSchema = z.enum(valuesOf(submissionStatuses));

/** Required ISO date (YYYY-MM-DD) from a date input. */
const isoDate = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ error: "Bitte ein Datum eingeben." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum eingeben.")
      .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Bitte ein gültiges Datum eingeben."),
  );

/** Methods recorded by hand; portal and contract consents are written by those modules. */
const consentMethodValues = valuesOf(manualConsentMethods);

export const consentSchema = z
  .object({
    consentDate: isoDate(),
    consentMethod: f.enum(consentMethodValues, "Bitte wählen, wie die Einwilligung erteilt wurde."),
    consentNote: f.optText(300),
    /** For which dossier the candidate agreed: anonymised only, or with the name. */
    consentScope: f.enum(valuesOf(profileVariants), "Bitte wählen, wofür die Einwilligung gilt."),
  })
  // A verbal consent is only documented with a note of when and how it was given.
  .refine((d) => d.consentMethod !== "muendlich" || Boolean(d.consentNote), {
    path: ["consentNote"],
    message: "Bitte festhalten, wann und wie (z. B. «Telefon 13.10.2026»).",
    when: (payload) => fieldsValid(payload.issues, ["consentMethod", "consentNote"]),
  });

export const withdrawalSchema = z.object({
  withdrawalDate: isoDate(),
  withdrawalMethod: f.enum(consentMethodValues, "Bitte wählen, wie der Widerruf mitgeteilt wurde."),
  withdrawalReason: f.optText(300),
  /** Objection to any further hand-over: sets candidates.objection_at as well. */
  allMandates: f.checkbox(),
});

export const submissionTermsSchema = z.object({
  profileVariant: f.enum(valuesOf(profileVariants)),
  rateBuy: f.optAmount(100_000),
  rateSell: f.optAmount(100_000),
  rateUnit: f.enum(valuesOf(rateUnits)),
  feedback: f.optText(4000),
  notes: f.optText(4000),
});

export const portalSchema = z
  .object({
    portalVisibility: f.enum(valuesOf(portalVisibilities)),
    portalTitle: f.optText(200),
    portalDescription: f.optText(10_000),
    portalRate: f.optAmount(100_000),
    portalRateUnit: f.enum(valuesOf(rateUnits)),
  })
  .superRefine((d, ctx) => {
    // Without its own title and text the portal would have nothing neutral to show.
    if (d.portalVisibility === "keine") return;
    if (!d.portalTitle) ctx.addIssue({ code: "custom", path: ["portalTitle"], message: "Für das Portal braucht es einen Titel." });
    if (!d.portalDescription) {
      ctx.addIssue({ code: "custom", path: ["portalDescription"], message: "Für das Portal braucht es eine Beschreibung." });
    }
  });

export const shareSchema = z.object({
  candidateIds: z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    },
    z
      .array(z.number().int().positive(), { error: "Die Auswahl konnte nicht gelesen werden." })
      .min(1, "Bitte mindestens einen Kandidaten wählen.")
      .max(200, "Höchstens 200 Kandidaten auf einmal."),
  ),
});
