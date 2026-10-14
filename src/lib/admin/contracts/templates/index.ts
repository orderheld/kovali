import type { TemplateDefinition, TemplateId, TemplateInfo } from "../types";
import { templateIds } from "../types";
import { beratung } from "./beratung";
import { einwilligung } from "./einwilligung";
import { einzelauftrag } from "./einzelauftrag";
import { nda } from "./nda";
import { rahmenvertrag } from "./rahmenvertrag";
import { subunternehmer } from "./subunternehmer";

/** All contract templates, in the order of the template chooser. */
export const contractTemplates: Record<TemplateId, TemplateDefinition> = {
  rahmenvertrag,
  einzelauftrag,
  subunternehmer,
  nda,
  einwilligung,
  beratung,
};

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (templateIds as readonly string[]).includes(value);
}

export function getTemplate(id: unknown): TemplateDefinition | null {
  return isTemplateId(id) ? contractTemplates[id] : null;
}

/** Name of a template for lists; unknown ids are shown as they are. */
export function templateName(id: string): string {
  return getTemplate(id)?.name ?? id;
}

/** Options for select fields and filters. */
export const templateOptions = templateIds.map((id) => ({ value: id, label: contractTemplates[id].name }));

/** The serializable part, for client components. */
export function templateInfo(t: TemplateDefinition): TemplateInfo {
  return {
    id: t.id,
    name: t.name,
    docType: t.docType,
    description: t.description,
    counterparty: t.counterparty,
    links: t.links,
    oneOf: t.oneOf,
    companyKinds: t.companyKinds,
    labels: t.labels,
    hints: t.hints,
    dates: t.dates,
    sections: t.sections,
    defaults: t.defaults,
  };
}
