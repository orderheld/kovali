"use server";

import { audit } from "@/lib/admin/audit";
import { destroyAllAdminSessions, requireAdmin } from "@/lib/admin/auth/session";

/**
 * Ends every admin session, this one included (e.g. after a lost laptop or a password
 * change). The client then loads /admin/login with a full page load.
 */
export async function endAllSessions(): Promise<void> {
  await requireAdmin();
  // Logged first: afterwards there is no session, but audit() does not need one.
  await audit("logout_all", { entity: "session", summary: "Alle Sitzungen beendet" });
  await destroyAllAdminSessions();
}
