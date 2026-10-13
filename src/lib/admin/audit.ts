import "server-only";
import { getDb } from "./db/client";
import { auditLog } from "./db/schema";
import { requestIpHash } from "./request";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "logout_all"
  | "create"
  | "update"
  | "delete"
  | "view_document"
  | "download_document"
  | "export"
  | "consent"
  | "share"
  | "portal_login"
  | "portal_login_failed"
  | "portal_change"
  | "review";

/**
 * Writes an entry to the audit log (accountability under the DSG: who accessed or changed
 * what, and when). `summary` must not contain personal data: use display numbers such as
 * "Kandidat K-0042" instead of names.
 */
export async function audit(
  action: AuditAction,
  details: { entity?: string; entityId?: number; summary?: string } = {},
): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(auditLog).values({
      action,
      entity: details.entity ?? null,
      entityId: details.entityId ?? null,
      summary: details.summary?.slice(0, 300) ?? null,
      ipHash: await requestIpHash().catch(() => null),
    });
  } catch (error) {
    // Auditing must never break the action itself, but a failure has to be visible.
    console.error(JSON.stringify({ event: "admin.audit_failed", action, error: String(error) }));
  }
}
