import { z } from "zod";
import { f } from "@/lib/admin/forms";
import { contractKinds, contractStatuses, valuesOf } from "@/lib/admin/options";

/** Server-side validation of the contract form. Links are checked against the database in the action. */

const optId = () => f.optInt(1, 999_999_999_999);

export const contractSchema = z.object({
  title: f.text(200, "Bitte einen Titel eingeben."),
  // Old kinds stay valid for contracts that have them; the action checks that.
  kind: f.enum(valuesOf(contractKinds), "Bitte die Art des Vertrags wählen."),
  status: f.enum(valuesOf(contractStatuses)),
  companyId: optId(),
  contactId: optId(),
  assignmentId: optId(),
  parentId: optId(),
  validFrom: f.optDate(),
  validUntil: f.optDate(),
  signedAt: f.optDate(),
  noticePeriod: f.optText(120),
  notes: f.optText(5000),
});

export type ContractInput = z.output<typeof contractSchema>;

export const signSchema = z.object({
  signedAt: f.optDate().refine((v) => v !== null, "Bitte ein Datum eingeben."),
});
