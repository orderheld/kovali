"use server";

import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { deleteDormantCandidateData } from "@/lib/admin/data/dormant";
import { fail, type ActionState } from "@/lib/admin/forms";
import { redirectAfterChange } from "@/lib/admin/redirect";

/**
 * Deletes the data of the former candidate module (profiles with their documents, submissions
 * and portal accounts) and its tables. The audit log gets the counts only.
 */
export async function deleteDormantCandidates(): Promise<ActionState> {
  await requireAdmin();
  const deleted = await deleteDormantCandidateData();
  if (!deleted) return fail("Es gibt keine alten Kandidatendaten mehr.");
  await audit("delete", {
    entity: "settings",
    summary: `Alte Kandidatendaten gelöscht: ${deleted.candidates} Profile, ${deleted.documents} Dokumente, Tabellen entfernt`,
  });
  redirectAfterChange("/admin/einstellungen/system?kandidaten=geloescht");
}
