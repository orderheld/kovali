import { connection } from "next/server";
import { and, count, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { AdminShell, type NavCounts } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { candidates, changeRequests, documents, mandates, vacancyShares } from "@/lib/admin/db/schema";
import { todayIso } from "@/lib/admin/format";
import { openMandateStatuses } from "@/lib/admin/options";
import { logout } from "../actions";

async function navCounts(): Promise<NavCounts> {
  const db = await getDb();
  const today = todayIso();
  const [[portal], [uploads], [answers], [privacy], [open]] = await Promise.all([
    db.select({ n: count() }).from(changeRequests).where(eq(changeRequests.status, "offen")),
    db.select({ n: count() }).from(documents).where(and(eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt))),
    db.select({ n: count() }).from(vacancyShares).where(and(eq(vacancyShares.response, "interessiert"), isNull(vacancyShares.reviewedAt))),
    db.select({ n: count() }).from(candidates).where(and(isNotNull(candidates.retentionUntil), lte(candidates.retentionUntil, today))),
    db.select({ n: count() }).from(mandates).where(inArray(mandates.status, [...openMandateStatuses])),
  ]);
  return {
    portal: (portal?.n ?? 0) + (uploads?.n ?? 0) + (answers?.n ?? 0),
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
