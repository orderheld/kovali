import { z } from "zod";
import { f } from "@/lib/admin/forms";
import { assignmentStatuses, billingModels, rateBases, rateUnits, remoteOptions, valuesOf } from "@/lib/admin/options";

/** Server-side validation of the assignment form. */

const optId = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number({ error: "Ungültige Auswahl." }).int().positive().nullable());

/** Optional decimal (hours), accepts 160,5 and 160.5. */
const optDecimal = (min: number, max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v ?? null;
      const s = v.trim().replace(/['’\s]/g, "").replace(",", ".");
      return s === "" ? null : Number(s);
    },
    z.number({ error: message }).gt(min, message).max(max, message).nullable(),
  );

export const assignmentSchema = z
  .object({
    title: f.text(200, "Bitte die Rolle oder den Titel eingeben."),
    status: f.enum(valuesOf(assignmentStatuses)),
    companyId: optId(),
    contactId: optId(),
    mandateId: optId(),
    endClient: f.optText(160),
    startDate: f.optDate(),
    endDate: f.optDate(),
    workload: z.preprocess(
      (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim().replace("%", ""))) : v),
      z.number({ error: "Bitte ein Pensum zwischen 1 und 100 % eingeben." }).int("Bitte eine ganze Zahl eingeben.").min(1, "Mindestens 1 %.").max(100, "Höchstens 100 %."),
    ),
    rateAmount: f.optAmount(100_000),
    rateUnit: f.enum(valuesOf(rateUnits)),
    billing: f.enum(valuesOf(billingModels)),
    rateBasis: f.enum(valuesOf(rateBases)),
    hoursPerMonth: optDecimal(0, 400, "Bitte Stunden zwischen 0 und 400 eingeben."),
    expensesMonthly: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? "0" : v), f.optAmount(1_000_000)).transform((v) => v ?? 0),
    location: f.optText(160),
    remote: f.optEnum(valuesOf(remoteOptions)),
    notes: f.optText(5000),
  })
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Das Ende liegt vor dem Start." });
    }
  });

export type AssignmentInput = z.output<typeof assignmentSchema>;
