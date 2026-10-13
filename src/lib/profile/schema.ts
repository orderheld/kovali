import * as z from "zod";
import { values } from "@/lib/contact/options";
import { availabilityOptions, engagementOptions, focusOptions } from "./options";
import type { ProfileField } from "./state";

/** Empty form fields arrive as "", treat them as missing. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Text fields of the profile form. The CV file is checked separately (see checkCv). */
export const profileSchema = z.object({
  name: z
    .string({ error: "Bitte geben Sie Ihren Namen an." })
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen an.")
    .max(120, "Der Name ist zu lang."),
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
  focus: z.enum(values(focusOptions), { error: "Bitte wählen Sie Ihren Schwerpunkt." }),
  availability: z.preprocess(blankToUndefined, z.enum(values(availabilityOptions)).optional()),
  engagement: z.preprocess(blankToUndefined, z.enum(values(engagementOptions)).optional()),
  profileUrl: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .max(300, "Der Link ist zu lang.")
      .regex(/^https:\/\/\S+$/, "Bitte geben Sie einen vollständigen Link an, der mit https:// beginnt.")
      .optional(),
  ),
  message: z.preprocess(
    blankToUndefined,
    z.string().trim().max(3000, "Die Nachricht ist zu lang (maximal 3000 Zeichen).").optional(),
  ),
  consent: z.literal("on", {
    error: "Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben.",
  }),
});

export type ProfileInput = z.infer<typeof profileSchema>;

const textFields = Object.keys(profileSchema.shape) as ProfileField[];

export function profileFieldErrors(error: z.ZodError): Partial<Record<ProfileField, string>> {
  const flat = z.flattenError(error).fieldErrors as Partial<Record<ProfileField, string[]>>;
  const result: Partial<Record<ProfileField, string>> = {};
  for (const key of textFields) {
    const first = flat[key]?.[0];
    if (first) result[key] = first;
  }
  return result;
}
