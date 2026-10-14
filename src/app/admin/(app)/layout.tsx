import { connection } from "next/server";
import { and, count, inArray, isNotNull, lt, not } from "drizzle-orm";
import { AdminShell, type NavCounts } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { candidates, mandates } from "@/lib/admin/db/schema";
import { todayIso } from "@/lib/admin/format";
import { openMandateStatuses } from "@/lib/admin/options";
import { isAnonymisedSql } from "@/lib/admin/privacy";
import { portalCounts } from "@/lib/portal/admin";
import { logout } from "../actions";

async function navCounts(): Promise<NavCounts> {
  const db = await getDb();
  const today = todayIso();
  const [portal, [privacy], [open]] = await Promise.all([
    // Same counts as the tabs of /admin/portal and the dashboard.
    portalCounts(),
    // Same rule as privacyCounts().overdue: overdue from the day after «Aufbewahren bis».
    db.select({ n: count() }).from(candidates).where(and(isNotNull(candidates.retentionUntil), lt(candidates.retentionUntil, today), not(isAnonymisedSql))),
    db.select({ n: count() }).from(mandates).where(inArray(mandates.status, [...openMandateStatuses])),
  ]);
  return {
    portal: portal.total,
    privacy: privacy?.n ?? 0,
    mandates: open?.n ?? 0,
  };
}

export default async function AdminAppLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  await connection();
  const counts = await navCounts();
  return (
    <AdminShell counts={counts} logout={logout}>
      {children}
    </AdminShell>
  );
}
