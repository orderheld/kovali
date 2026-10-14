import { z } from "zod";
import { f } from "@/lib/admin/forms";

/** Server-side validation of the fields every contract has; template fields are validated by the template. */

const optId = () => f.optInt(1, 999_999_999_999);

export const contractSchema = z.object({
  title: f.text(200, "Bitte einen Titel eingeben."),
  companyId: optId(),
  contactId: optId(),
  candidateId: optId(),
  mandateId: optId(),
  parentId: optId(),
  validFrom: f.optDate(),
  validUntil: f.optDate(),
  notes: f.optText(5000),
});

export type ContractInput = z.output<typeof contractSchema>;

export const statusDateSchema = z.object({
  date: f.optDate().refine((v) => v !== null, "Bitte ein Datum eingeben."),
});

/** Prefix of template fields in the form: d_role is data.role. */
export const DATA_PREFIX = "d_";
