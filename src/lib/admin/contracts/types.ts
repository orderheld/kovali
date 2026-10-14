import type { z } from "zod";
import type { Party } from "../party";
import type { Block } from "../render/model";

/**
 * Types shared by the contract templates, the form and the document builder. Everything a
 * template needs to render is passed in a ContractContext, so builders are pure functions
 * and can be tested without a database.
 */

export const templateIds = ["rahmenvertrag", "einzelauftrag", "subunternehmer", "nda", "einwilligung", "beratung"] as const;
export type TemplateId = (typeof templateIds)[number];

/** Records a contract can be linked to (columns of the contracts table). */
export type LinkKey = "company" | "contact" | "candidate" | "mandate" | "parent";
/** required: must be set; optional: may be set; hidden: not offered in the form. */
export type LinkMode = "required" | "optional" | "hidden";

interface FieldBase {
  /** Key in contracts.data; the form field is named `d_<name>`. */
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  /** Spans the full width of the section. */
  wide?: boolean;
}

/** One template field in the form. Serializable, so it can be passed to the client form. */
export type FieldDef = FieldBase &
  (
    | { kind: "text" }
    | { kind: "textarea"; rows?: number }
    | { kind: "amount" }
    | { kind: "int"; min?: number; max?: number; suffix?: string }
    | { kind: "date" }
    | { kind: "select"; options: readonly { value: string; label: string }[] }
    | { kind: "checkbox" }
  );

export interface FieldSection {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  fields: FieldDef[];
}

export interface CompanyInfo {
  id: number;
  name: string;
  legalName: string | null;
  legalForm: string | null;
  uid: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  kind: string;
}

export interface PersonInfo {
  id: number;
  firstName: string;
  lastName: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  /** Display number, e.g. K-0042. */
  ref: string;
}

export interface ContactInfo {
  id: number;
  name: string;
  role: string | null;
}

export interface MandateInfo {
  id: number;
  /** Display number, e.g. M-0007. */
  ref: string;
  title: string;
  reference: string | null;
  endClient: string | null;
  companyName: string | null;
}

export interface ParentInfo {
  id: number;
  number: string;
  title: string;
  template: string;
  validFrom: string | null;
  signedAt: string | null;
}

/** Everything a template builder may use. */
export interface ContractContext {
  number: string;
  title: string;
  validFrom: string | null;
  validUntil: string | null;
  signedAt: string | null;
  kovali: Party;
  company: CompanyInfo | null;
  contact: ContactInfo | null;
  candidate: PersonInfo | null;
  mandate: MandateInfo | null;
  parent: ParentInfo | null;
}

/** Data available when the "new contract" form is opened with query parameters. */
export interface PrefillContext {
  company: CompanyInfo | null;
  candidate: (PersonInfo & { rateAmount: number | null; rateUnit: string | null }) | null;
  mandate:
    | (MandateInfo & {
        location: string | null;
        remote: string | null;
        workload: number | null;
        startDate: string | null;
        endDate: string | null;
        rateSell: number | null;
        rateUnit: string | null;
        portalRate: number | null;
        portalRateUnit: string | null;
        description: string | null;
      })
    | null;
  submission: { rateBuy: number | null; rateSell: number | null; rateUnit: string | null; profileVariant: string } | null;
  parent: ParentInfo | null;
}

/** Names used to suggest a title while the form is filled in. */
export interface TitleInput {
  companyName?: string | null;
  candidateName?: string | null;
  mandateTitle?: string | null;
  parentNumber?: string | null;
  data: Record<string, unknown>;
}

export type Labels = Partial<Record<LinkKey, string>>;

/** Serializable part of a template, passed to the client form and the template chooser. */
export interface TemplateInfo {
  id: TemplateId;
  name: string;
  docType: string;
  description: string;
  /** Short line on the chooser card: who the counterparty is. */
  counterparty: string;
  links: Record<LinkKey, LinkMode>;
  /** At least one link of each group must be set, e.g. a company or a candidate. */
  oneOf: LinkKey[][];
  /** Company kinds offered in the company select (all when empty). */
  companyKinds: string[];
  labels: Labels;
  hints: Labels;
  /** Labels of the validFrom / validUntil fields; null hides the field. */
  dates: { validFrom: string | null; validUntil: string | null };
  sections: FieldSection[];
  defaults: Record<string, unknown>;
}

export interface TemplateDefinition extends TemplateInfo {
  schema: z.ZodType<Record<string, unknown>>;
  suggestTitle(input: TitleInput): string;
  prefill?(p: PrefillContext): Record<string, unknown>;
  /** Builds the document blocks from stored data (re-validated, defaults filled in). */
  build(raw: unknown, ctx: ContractContext): Block[];
  /** Missing information Ferhat should add before sending (shown on the detail page). */
  issues(raw: unknown, ctx: ContractContext): string[];
  /** Name of the counterparty for footers, file names and lists. */
  counterpartyName(ctx: ContractContext): string;
  /** Checks across fields and links; returns messages by form field name (d_<name> for data). */
  validate?(data: Record<string, unknown>, linked: Partial<Record<LinkKey, number | null>>): Record<string, string>;
}
