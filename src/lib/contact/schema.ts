import * as z from "zod";
import {
  durationOptions,
  labelOf,
  requestTypes,
  serviceChoices,
  serviceLabels,
  startOptions,
  values,
  workloadOptions,
  workModes,
  type ServiceChoice,
  type ServiceOption,
} from "./options";
import type { ContactField } from "./state";

/** Empty form fields arrive as "", treat them as missing. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Checkbox values arrive as a list (FormData.getAll). A single value or none is accepted too. */
const toList = (v: unknown) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]);

/** The fields of the contact form, as the visitor fills them in. */
export const contactFormSchema = z.object({
  name: z
    .string({ error: "Bitte geben Sie Ihren Namen an." })
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen an.")
    .max(120, "Der Name ist zu lang."),
  company: z
    .string({ error: "Bitte geben Sie den Namen Ihres Unternehmens an." })
    .trim()
    .min(2, "Bitte geben Sie den Namen Ihres Unternehmens an.")
    .max(160, "Der Firmenname ist zu lang."),
  email: z
    .string({ error: "Bitte geben Sie Ihre E-Mail-Adresse an." })
    .trim()
    .max(200, "Die E-Mail-Adresse ist zu lang.")
    .pipe(z.email("Bitte geben Sie eine gültige E-Mail-Adresse an.")),
  phone: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .max(40, "Die Telefonnummer ist zu lang.")
      .regex(/^\+?[0-9\s()./-]{6,}$/, "Bitte geben Sie eine gültige Telefonnummer an.")
      .optional(),
  ),
  requestType: z.enum(values(requestTypes), { error: "Bitte wählen Sie die Art Ihrer Anfrage." }),
  services: z.preprocess(
    toList,
    z
      .array(z.enum(values(serviceChoices), { error: "Bitte wählen Sie die Leistungen aus der Liste." }))
      .max(serviceChoices.length, "Bitte wählen Sie die Leistungen aus der Liste."),
  ),
  projectDescription: z
    .string({ error: "Bitte beschreiben Sie Ihr Vorhaben." })
    .trim()
    .min(20, "Bitte beschreiben Sie Ihr Vorhaben in ein bis zwei Sätzen (mindestens 20 Zeichen).")
    .max(5000, "Die Beschreibung ist zu lang (maximal 5000 Zeichen)."),
  start: z.preprocess(blankToUndefined, z.enum(values(startOptions)).optional()),
  duration: z.preprocess(blankToUndefined, z.enum(values(durationOptions)).optional()),
  workload: z.preprocess(blankToUndefined, z.enum(values(workloadOptions)).optional()),
  workMode: z.preprocess(blankToUndefined, z.enum(values(workModes)).optional()),
  location: z.preprocess(blankToUndefined, z.string().trim().max(120, "Der Einsatzort ist zu lang.").optional()),
  requirements: z.preprocess(
    blankToUndefined,
    z.string().trim().max(3000, "Die Voraussetzungen sind zu lang (maximal 3000 Zeichen).").optional(),
  ),
  message: z.preprocess(
    blankToUndefined,
    z.string().trim().max(5000, "Die Nachricht ist zu lang (maximal 5000 Zeichen).").optional(),
  ),
  consent: z.literal("on", { error: "Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben." }),
} satisfies Record<ContactField, z.ZodType>);

type Discipline = Exclude<ServiceChoice, "offen">;

/**
 * The single value of contact_requests.service, which store.ts reads as `service`: the one
 * selected discipline, "mehrere" for several, "offen" for none ("Noch offen" alone included).
 */
export function storedService(services: readonly ServiceChoice[]): ServiceOption {
  const disciplines = services.filter((s): s is Discipline => s !== "offen");
  if (disciplines.length === 0) return "offen";
  if (disciplines.length === 1) return disciplines[0];
  return "mehrere";
}

/** Validated request: the form fields plus the derived single `service` for storage. */
export const contactSchema = contactFormSchema.transform((input) => {
  const services = [...new Set(input.services)];
  return { ...input, services, service: storedService(services) };
});

export type ContactInput = z.output<typeof contactSchema>;

/**
 * contact_requests (migration 0006_contact_requests, read by store.ts) has a single `service` column and no
 * columns for duration, workload and requirements. The stored copy puts them at the top of
 * `message`, so a request kept while the e-mail failed is still complete. The e-mail lists
 * every field on its own.
 */
export function storageCopy(input: ContactInput): ContactInput {
  const lines = [
    input.service === "mehrere" ? `Leistungen: ${serviceLabels(input.services)}` : null,
    input.duration ? `Laufzeit: ${labelOf(durationOptions, input.duration)}` : null,
    input.workload ? `Pensum: ${labelOf(workloadOptions, input.workload)}` : null,
  ].filter((line) => line !== null);
  if (lines.length === 0 && !input.requirements) return input;
  const message = [
    lines.join("\n"),
    input.requirements ? `Voraussetzungen:\n${input.requirements}` : "",
    input.message ? `Nachricht:\n${input.message}` : "",
  ]
    .filter((block) => block !== "")
    .join("\n\n");
  return { ...input, message };
}

export const contactFields = Object.keys(contactFormSchema.shape) as ContactField[];

export function fieldErrors(error: z.ZodError): Partial<Record<ContactField, string>> {
  const flat = z.flattenError(error).fieldErrors as Partial<Record<ContactField, string[]>>;
  const result: Partial<Record<ContactField, string>> = {};
  for (const key of contactFields) {
    const first = flat[key]?.[0];
    if (first) result[key] = first;
  }
  return result;
}
