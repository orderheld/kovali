import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";

export const metadata: Metadata = { title: "Übersicht" };

export default async function DashboardPage() {
  await requireAdmin();
  return <PageHeader title="Übersicht" description="Mandate, Kandidaten und offene Aufgaben auf einen Blick." />;
}
