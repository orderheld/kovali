import type { AuditAction } from "@/lib/admin/audit";
import { displayNo } from "@/lib/admin/format";
import type { Tone } from "@/lib/admin/options";

/**
 * German labels for audit log entries. The log stores only actions, entity types and ids,
 * never names, so the pages show display numbers (K-0042) built from the ids.
 */

export const auditActionLabels: Record<AuditAction, { label: string; tone: Tone }> = {
  login: { label: "Anmeldung", tone: "green" },
  login_failed: { label: "Anmeldung fehlgeschlagen", tone: "red" },
  logout: { label: "Abmeldung", tone: "neutral" },
  logout_all: { label: "Alle Sitzungen beendet", tone: "amber" },
  create: { label: "Erfasst", tone: "blue" },
  update: { label: "Geändert", tone: "neutral" },
  delete: { label: "Gelöscht", tone: "red" },
  anonymise: { label: "Anonymisiert", tone: "violet" },
  view_document: { label: "Dokument angesehen", tone: "neutral" },
  download_document: { label: "Dokument heruntergeladen", tone: "neutral" },
  export: { label: "Export", tone: "blue" },
  consent: { label: "Einwilligung", tone: "green" },
  share: { label: "Freigabe", tone: "blue" },
  portal_login: { label: "Portal-Anmeldung", tone: "green" },
  portal_login_failed: { label: "Portal-Anmeldung fehlgeschlagen", tone: "red" },
  portal_change: { label: "Änderung im Portal", tone: "neutral" },
  portal_logout_all: { label: "Portal-Abmeldung auf allen Geräten", tone: "amber" },
  review: { label: "Geprüft", tone: "green" },
};

export const auditActionOptions = (Object.keys(auditActionLabels) as AuditAction[]).map((value) => ({ value, label: auditActionLabels[value].label }));

export function isAuditAction(value: string | undefined): value is AuditAction {
  return Boolean(value && value in auditActionLabels);
}

const entityLabels: Record<string, string> = {
  candidate: "Kandidat",
  company: "Firma",
  contact: "Kontakt",
  mandate: "Mandat",
  submission: "Vorschlag",
  contract: "Vertrag",
  document: "Dokument",
  activity: "Notiz",
  settings: "Einstellungen",
  session: "Sitzung",
  privacy: "Datenschutz",
  change_request: "Änderungsantrag",
  vacancy_share: "Vakanz-Freigabe",
  candidate_account: "Portal-Konto",
};

/** "Kandidat K-0042", "Dokument #12" or "–". */
export function auditObject(entity: string | null, entityId: number | null): string {
  if (!entity) return "–";
  const label = entityLabels[entity] ?? entity;
  if (!entityId) return label;
  switch (entity) {
    case "candidate":
      return `${label} ${displayNo.candidate(entityId)}`;
    case "company":
      return `${label} ${displayNo.company(entityId)}`;
    case "mandate":
      return `${label} ${displayNo.mandate(entityId)}`;
    case "submission":
      return `${label} ${displayNo.submission(entityId)}`;
    default:
      return `${label} #${entityId}`;
  }
}
