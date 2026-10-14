/**
 * Checks of a filed contract's links before it is saved: the contact belongs to the company,
 * the Rahmenvertrag is one of the same company, the period is in order. Pure, so the server
 * action passes in what it loaded from the database.
 */

export interface ContractLinkInput {
  kind: string;
  companyId: number | null;
  contactId: number | null;
  assignmentId: number | null;
  parentId: number | null;
  validFrom: string | null;
  validUntil: string | null;
  signedAt: string | null;
}

export interface ContractLinkFacts {
  /** The contract being edited (it cannot be its own Rahmenvertrag). */
  selfId?: number;
  today: string;
  company: { id: number } | null;
  contact: { id: number; companyId: number } | null;
  assignment: { id: number } | null;
  parent: { id: number; template: string; companyId: number | null } | null;
}

export interface ResolvedLinks {
  companyId: number | null;
  contactId: number | null;
  assignmentId: number | null;
  parentId: number | null;
}

/**
 * Returns the links to store and field errors. Without a company, the company of the chosen
 * contact or Rahmenvertrag is taken (there is only one that fits). A Rahmenvertrag itself has
 * no parent.
 */
export function resolveContractLinks(input: ContractLinkInput, facts: ContractLinkFacts): { values: ResolvedLinks; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const parentId = input.kind === "rahmenvertrag" ? null : input.parentId;
  let companyId = input.companyId;

  if (input.companyId !== null && !facts.company) errors.companyId = "Diese Firma gibt es nicht mehr.";

  if (input.contactId !== null) {
    if (!facts.contact) errors.contactId = "Diesen Kontakt gibt es nicht mehr.";
    else if (companyId === null && !errors.companyId) companyId = facts.contact.companyId;
  }

  if (parentId !== null) {
    const parent = facts.parent;
    if (!parent) errors.parentId = "Diesen Rahmenvertrag gibt es nicht mehr.";
    else if (parent.id === facts.selfId) errors.parentId = "Ein Vertrag kann nicht unter sich selbst stehen.";
    else if (parent.template !== "rahmenvertrag") errors.parentId = "Bitte einen Rahmenvertrag wählen.";
    else if (companyId === null && !errors.companyId) companyId = parent.companyId;
    else if (parent.companyId !== companyId) errors.parentId = "Dieser Rahmenvertrag gehört zu einer anderen Firma.";
  }

  if (facts.contact && companyId !== null && facts.contact.companyId !== companyId) {
    errors.contactId ??= "Diese Person gehört nicht zur gewählten Firma.";
  }

  if (input.assignmentId !== null && !facts.assignment) errors.assignmentId = "Diesen Auftrag gibt es nicht mehr.";

  if (input.validFrom && input.validUntil && input.validUntil < input.validFrom) errors.validUntil = "Das Ende liegt vor dem Beginn.";
  if (input.signedAt && input.signedAt > facts.today) errors.signedAt = "Das Datum liegt in der Zukunft.";

  return { values: { companyId, contactId: input.contactId, assignmentId: input.assignmentId, parentId }, errors };
}
