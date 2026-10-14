import { connection } from "next/server";
import { count, eq, inArray } from "drizzle-orm";
import { AdminShell, type NavCounts } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { assignments, mandates } from "@/lib/admin/db/schema";
import { openMandateStatuses } from "@/lib/admin/options";
import { logout } from "../actions";

/** Running assignments and vacancies in progress, as badges in the navigation. */
async function navCounts(): Promise<NavCounts> {
  const db = await getDb();
  const [[running], [open]] = await Promise.all([
    db.select({ n: count() }).from(assignments).where(eq(assignments.status, "laufend")),
    db.select({ n: count() }).from(mandates).where(inArray(mandates.status, [...openMandateStatuses])),
  ]);
  return { assignments: running?.n ?? 0, vacancies: open?.n ?? 0 };
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
