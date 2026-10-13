import * as z from "zod";
import { requestTypes, serviceOptions, startOptions, values, workModes } from "./options";
import type { ContactField } from "./state";

/** Empty form fields arrive as "", treat them as missing. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const contactSchema = z.object({
  name: z
    .string({ error: "Bitte geben Sie Ihren Namen an." })
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen an.")
    .max(120, "Der Name ist zu lang."),
  company: z.preprocess(blankToUndefined, z.string().trim().max(160, "Der Firmenname ist zu lang.").optional()),
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
  service: z.preprocess(blankToUndefined, z.enum(values(serviceOptions)).optional()),
  projectDescription: z
    .string({ error: "Bitte beschreiben Sie Ihr Vorhaben." })
    .trim()
    .min(20, "Bitte beschreiben Sie Ihr Vorhaben in ein bis zwei Sätzen (mindestens 20 Zeichen).")
    .max(5000, "Die Beschreibung ist zu lang (maximal 5000 Zeichen)."),
  start: z.preprocess(blankToUndefined, z.enum(values(startOptions)).optional()),
  workMode: z.preprocess(blankToUndefined, z.enum(values(workModes)).optional()),
  location: z.preprocess(blankToUndefined, z.string().trim().max(120, "Der Einsatzort ist zu lang.").optional()),
  message: z.preprocess(
    blankToUndefined,
    z.string().trim().max(5000, "Die Nachricht ist zu lang (maximal 5000 Zeichen).").optional(),
  ),
  consent: z.literal("on", { error: "Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben." }),
} satisfies Record<ContactField, z.ZodType>);

export type ContactInput = z.infer<typeof contactSchema>;

export const contactFields = Object.keys(contactSchema.shape) as ContactField[];

export function fieldErrors(error: z.ZodError): Partial<Record<ContactField, string>> {
  const flat = z.flattenError(error).fieldErrors as Partial<Record<ContactField, string[]>>;
  const result: Partial<Record<ContactField, string>> = {};
  for (const key of contactFields) {
    const first = flat[key]?.[0];
    if (first) result[key] = first;
  }
  return result;
}

