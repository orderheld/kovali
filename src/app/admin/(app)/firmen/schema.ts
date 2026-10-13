import { z } from "zod";
import { f } from "@/lib/admin/forms";
import { companyKinds, companyStatuses, salutations, valuesOf } from "@/lib/admin/options";

/** Server-side validation of the company and contact forms. */

const uid = () =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return null;
      const digits = v.replace(/\D/g, "");
      return digits.length === 9 ? `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}` : v.trim();
    },
    z.string().regex(/^CHE-\d{3}\.\d{3}\.\d{3}$/, "Format CHE-123.456.789").nullable(),
  );

export const companySchema = z.object({
  name: f.text(160, "Bitte den Namen eingeben."),
  kind: f.enum(valuesOf(companyKinds)),
  status: f.enum(valuesOf(companyStatuses)),
  legalName: f.optText(200),
  legalForm: f.optText(80),
  uid: uid(),
  street: f.optText(160),
  postalCode: f.optText(12),
  city: f.optText(80),
  country: f.text(80),
  email: f.optEmail(),
  phone: f.optText(40),
  website: f.optUrl(),
  industry: f.optText(120),
  notes: f.optText(5000),
});

export const contactSchema = z.object({
  salutation: f.optEnum(valuesOf(salutations)),
  firstName: f.optText(80),
  lastName: f.text(80, "Bitte den Nachnamen eingeben."),
  role: f.optText(120),
  email: f.optEmail(),
  phone: f.optText(40),
  isSignatory: f.checkbox(),
  notes: f.optText(2000),
});
