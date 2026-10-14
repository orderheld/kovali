import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth/session";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Nicht gefunden" };

/**
 * Any other address under /admin: the admin not-found page (../not-found.tsx) within the
 * navigation, instead of the public site's 404 page. Real routes always take precedence.
 */
export default async function UnknownAdminPage() {
  await requireAdmin();
  notFound();
}
