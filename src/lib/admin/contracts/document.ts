import type { DocModel } from "../render/model";
import { getTemplate } from "./templates";
import type { ContractContext } from "./types";

/**
 * Turns a stored contract into the DocModel that the PDF, the Word file and the HTML preview
 * render: header with document type and number, footer "<KOVALI> · <number>", then the
 * blocks of the template.
 */
export function buildContractDocument(input: { template: string; data: unknown }, ctx: ContractContext): DocModel {
  const template = getTemplate(input.template);
  if (!template) throw new Error(`Unbekannte Vertragsvorlage: ${input.template}`);
  const counterparty = template.counterpartyName(ctx);
  return {
    docType: template.docType,
    title: `${template.docType} ${ctx.number} – ${counterparty}`,
    reference: ctx.number,
    footer: `${ctx.kovali.name} · ${ctx.number}`,
    confidential: false,
    blocks: template.build(input.data, ctx),
  };
}

/** Gaps Ferhat should close before sending the contract. */
export function contractIssues(input: { template: string; data: unknown }, ctx: ContractContext): string[] {
  const template = getTemplate(input.template);
  return template ? template.issues(input.data, ctx) : [];
}
