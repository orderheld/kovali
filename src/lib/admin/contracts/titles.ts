import type { TemplateId, TitleInput } from "./types";

/**
 * Suggested contract titles. Kept apart from the templates so the client form can update the
 * suggestion while Ferhat picks a company or candidate, without loading the contract texts.
 */

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function withName(base: string, name: string | null | undefined, sep = " mit "): string {
  return name ? `${base}${sep}${name}` : base;
}

export function suggestTitle(template: TemplateId, t: TitleInput): string {
  const company = t.companyName?.trim() || null;
  const candidate = t.candidateName?.trim() || null;
  switch (template) {
    case "rahmenvertrag":
      return withName("Rahmenvertrag", company);
    case "einzelauftrag": {
      const role = s(t.data.role) || t.mandateTitle?.trim() || "";
      return [`Einzelauftrag${role ? ` ${role}` : ""}`, company].filter(Boolean).join(" – ");
    }
    case "subunternehmer": {
      const base = withName("Subunternehmervertrag", company, " ");
      return candidate ? `${base} (${candidate})` : base;
    }
    case "nda":
      return withName("Geheimhaltungsvereinbarung", company ?? candidate);
    case "einwilligung": {
      const parts = ["Einwilligung Profilweitergabe", candidate, t.mandateTitle?.trim() || s(t.data.mandateText) || null].filter(Boolean);
      return parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(" – ")}` : String(parts[0]);
    }
    case "beratung":
      return withName("Beratungsvertrag", company);
  }
}
