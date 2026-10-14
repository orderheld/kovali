import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, sql, type SQL } from "drizzle-orm";
import type { AuditAction } from "@/lib/admin/audit";
import { getDb } from "@/lib/admin/db/client";
import { auditLog } from "@/lib/admin/db/schema";

/** Audit log queries shared by Einstellungen > Audit-Log and Datenschutz > Löschprotokoll. */

export const AUDIT_PAGE_SIZE = 50;

export async function auditEntries({
  actions,
  entity,
  summaryPrefix,
  page = 1,
  pageSize = AUDIT_PAGE_SIZE,
}: {
  actions?: AuditAction[];
  entity?: string;
  summaryPrefix?: string;
  page?: number;
  pageSize?: number;
}) {
  const filters: SQL[] = [];
  if (actions?.length) filters.push(inArray(auditLog.action, actions));
  if (entity) filters.push(eq(auditLog.entity, entity));
  // Prefixes are fixed strings from the code (no user input), so no LIKE escaping is needed.
  if (summaryPrefix) filters.push(ilike(auditLog.summary, `${summaryPrefix}%`));
  const where = filters.length ? and(...filters) : undefined;
  const db = await getDb();
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.at), desc(auditLog.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(auditLog).where(where),
  ]);
  const n = total?.n ?? 0;
  return { rows, total: n, pageCount: Math.max(1, Math.ceil(n / pageSize)) };
}

export type AuditRow = Awaited<ReturnType<typeof auditEntries>>["rows"][number];

/** Number of entries of one action in the last days (e.g. failed logins of the last 30 days). */
export async function auditCountLastDays(action: AuditAction, days: number): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.action, action), gte(auditLog.at, sql`now() - make_interval(days => ${days})`)));
  return row?.n ?? 0;
}

/** Most recent entry of one action, e.g. the last successful login. */
export async function lastAudit(action: AuditAction) {
  const db = await getDb();
  const [row] = await db.select().from(auditLog).where(eq(auditLog.action, action)).orderBy(desc(auditLog.at), desc(auditLog.id)).limit(1);
  return row ?? null;
}
