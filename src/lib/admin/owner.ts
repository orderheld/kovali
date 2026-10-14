import { z } from "zod";
import type { DocumentOwner } from "./documents";

/**
 * The record a note or document belongs to. Passed from pages to the shared actions
 * (bound arguments), so it is validated again on the server.
 */
export type OwnerType = "candidate" | "company" | "mandate" | "contract";

export interface OwnerRef {
  type: OwnerType;
  id: number;
}

export const ownerSchema = z.object({
  type: z.enum(["candidate", "company", "mandate", "contract"]),
  id: z.number().int().positive(),
});

const paths: Record<OwnerType, string> = {
  candidate: "/admin/kandidaten",
  company: "/admin/firmen",
  mandate: "/admin/mandate",
  contract: "/admin/vertraege",
};

const entityNames: Record<OwnerType, string> = {
  candidate: "candidate",
  company: "company",
  mandate: "mandate",
  contract: "contract",
};

export function ownerPath(owner: OwnerRef): string {
  return `${paths[owner.type]}/${owner.id}`;
}

export function ownerEntity(owner: OwnerRef): string {
  return entityNames[owner.type];
}

/** Column values for tables with candidate_id / company_id / mandate_id / contract_id. */
export function ownerColumns(owner: OwnerRef): DocumentOwner {
  switch (owner.type) {
    case "candidate":
      return { candidateId: owner.id };
    case "company":
      return { companyId: owner.id };
    case "mandate":
      return { mandateId: owner.id };
    case "contract":
      return { contractId: owner.id };
  }
}
