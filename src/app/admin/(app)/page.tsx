import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

export default async function DashboardPage() {
  await requireAdmin();
  return <PageHeader title="Übersicht" description="Mandate, Kandidaten und offene Aufgaben auf einen Blick." />;
}
