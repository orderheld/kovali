import { z } from "zod";
import type { DocumentOwner } from "./documents";
import { displayNo } from "./format";

/**
 * The record a note or document belongs to. Passed from pages to the shared actions
 * (bound arguments), so it is validated again on the server. "mandate" is a vacancy (the table
 * kept its old name), shown under /admin/vakanzen.
 */
export const ownerTypes = ["company", "mandate", "contract", "assignment"] as const;

export type OwnerType = (typeof ownerTypes)[number];

export interface OwnerRef {
  type: OwnerType;
  id: number;
}

export const ownerSchema = z.object({
  type: z.enum(ownerTypes),
  id: z.number().int().positive(),
});

/** Name of the record without personal data, for audit summaries: "Auftrag A-0003", "Vertrag #12". */
export function ownerLabel(owner: OwnerRef): string {
  switch (owner.type) {
    case "company":
      return `Firma ${displayNo.company(owner.id)}`;
    case "mandate":
      return `Vakanz ${displayNo.mandate(owner.id)}`;
    case "contract":
      return `Vertrag #${owner.id}`;
    case "assignment":
      return `Auftrag ${displayNo.assignment(owner.id)}`;
  }
}

/** Column values for tables with company_id / mandate_id / contract_id / assignment_id. */
export function ownerColumns(owner: OwnerRef): DocumentOwner {
  switch (owner.type) {
    case "company":
      return { companyId: owner.id };
    case "mandate":
      return { mandateId: owner.id };
    case "contract":
      return { contractId: owner.id };
    case "assignment":
      return { assignmentId: owner.id };
  }
}
