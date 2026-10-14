import { z } from "zod";
import { f } from "@/lib/admin/forms";
import { mandateKinds, mandatePriorities, mandateSources, mandateStatuses, rateUnits, remoteOptions, valuesOf } from "@/lib/admin/options";
import { optMultilineText } from "@/lib/admin/text-schema";

/** Server-side validation of the vacancy forms. */

/** Optional record id from a select field. */
const optId = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : (v ?? null)),
    z.number({ error: "Ungültige Auswahl." }).int("Ungültige Auswahl.").positive("Ungültige Auswahl.").nullable(),
  );

/**
 * Cross-field checks normally run only when the whole object parsed. This lets one run as soon
 * as the fields it reads are valid, so all errors appear after a single submit.
 */
function fieldsValid(issues: readonly { path?: readonly PropertyKey[] }[], fields: readonly string[]): boolean {
  return !issues.some((issue) => fields.includes(String(issue.path?.[0])));
}

export const vacancySchema = z
  .object({
    kind: f.enum(valuesOf(mandateKinds)),
    title: f.text(200, "Bitte einen Titel eingeben."),
    companyId: optId(),
    contactId: optId(),
    reference: f.optText(80),
    url: f.optUrl(),
    endClient: f.optText(160),
    source: f.optEnum(valuesOf(mandateSources)),
    description: optMultilineText(20_000),
    requiredSkills: f.stringList(60, 80),
    location: f.optText(120),
    remote: f.optEnum(valuesOf(remoteOptions)),
    workload: f.optInt(10, 100),
    startDate: f.optDate(),
    endDate: f.optDate(),
    durationText: f.optText(120),
    rateSell: f.optAmount(100_000),
    rateUnit: f.enum(valuesOf(rateUnits)),
    deadline: f.optDate(),
    appliedAt: f.optDate(),
    status: f.enum(valuesOf(mandateStatuses)),
    priority: f.enum(valuesOf(mandatePriorities)),
    nextStep: f.optText(200),
    nextStepAt: f.optDate(),
    notes: optMultilineText(5000),
    applicationText: optMultilineText(20_000),
  })
  .refine((d) => !(d.startDate && d.endDate && d.endDate < d.startDate), {
    path: ["endDate"],
    message: "Das Ende liegt vor dem Start.",
    // Also report it while other fields still have errors, so one round trip shows everything.
    when: (payload) => fieldsValid(payload.issues, ["startDate", "endDate"]),
  });

export type VacancyInput = z.output<typeof vacancySchema>;

export const vacancyStatusSchema = z.enum(valuesOf(mandateStatuses));

export const nextStepSchema = z
  .object({
    nextStep: f.optText(200),
    nextStepAt: f.optDate(),
  })
  .refine((d) => Boolean(d.nextStep) || !d.nextStepAt, {
    path: ["nextStep"],
    message: "Was ist bis dann zu tun?",
  });
