import type { AuditAction } from "@/lib/admin/audit";
import { displayNo } from "@/lib/admin/format";
import type { Tone } from "@/lib/admin/options";

/**
 * German labels for audit log entries. The log stores only actions, entity types and ids,
 * never names, so the pages show display numbers (A-0003, F-0007) built from the ids.
 */

export const auditActionLabels: Record<AuditAction, { label: string; tone: Tone }> = {
  login: { label: "Anmeldung", tone: "green" },
  login_failed: { label: "Anmeldung fehlgeschlagen", tone: "red" },
  logout: { label: "Abmeldung", tone: "neutral" },
  logout_all: { label: "Alle Sitzungen beendet", tone: "amber" },
  create: { label: "Erfasst", tone: "blue" },
  update: { label: "Geändert", tone: "neutral" },
  delete: { label: "Gelöscht", tone: "red" },
  view_document: { label: "Dokument angesehen", tone: "neutral" },
  download_document: { label: "Dokument heruntergeladen", tone: "neutral" },
  export: { label: "Export", tone: "blue" },
};

export const auditActionOptions = (Object.keys(auditActionLabels) as AuditAction[]).map((value) => ({ value, label: auditActionLabels[value].label }));

export function isAuditAction(value: string | undefined): value is AuditAction {
  return Boolean(value && value in auditActionLabels);
}

/** Label of any stored action; entries of removed features show their raw action name. */
export function auditActionMeta(action: string): { label: string; tone: Tone } {
  return isAuditAction(action) ? auditActionLabels[action] : { label: action, tone: "neutral" };
}

const entityLabels: Record<string, string> = {
  assignment: "Auftrag",
  company: "Firma",
  contact: "Kontakt",
  mandate: "Vakanz",
  snippet: "Textbaustein",
  contract: "Vertrag",
  document: "Dokument",
  activity: "Notiz",
  settings: "Einstellungen",
  session: "Sitzung",
};

/** "Auftrag A-0003", "Dokument #12" or "–". */
export function auditObject(entity: string | null, entityId: number | null): string {
  if (!entity) return "–";
  const label = entityLabels[entity] ?? entity;
  if (!entityId) return label;
  switch (entity) {
    case "assignment":
      return `${label} ${displayNo.assignment(entityId)}`;
    case "company":
      return `${label} ${displayNo.company(entityId)}`;
    case "mandate":
      return `${label} ${displayNo.mandate(entityId)}`;
    case "snippet":
      return `${label} ${displayNo.snippet(entityId)}`;
    default:
      return `${label} #${entityId}`;
  }
}
