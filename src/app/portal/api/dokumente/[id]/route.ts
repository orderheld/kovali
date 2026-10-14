import { audit } from "@/lib/admin/audit";
import { documentResponse } from "@/lib/admin/documents";
import { displayNo } from "@/lib/admin/format";
import { parseId } from "@/lib/admin/forms";
import { loadOwnUpload } from "@/lib/portal/data";
import { candidateSessionForApi } from "@/lib/portal/session";

/**
 * Sends one of the candidate's own uploads. Documents of other people (and documents Ferhat
 * stored himself) answer 404 like missing ones, so ids cannot be probed.
 * ?ansicht=1 opens PDFs and images in the browser.
 */
export async function GET(request: Request, { params }: RouteContext<"/portal/api/dokumente/[id]">) {
  const session = await candidateSessionForApi();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  const doc = await loadOwnUpload(session.candidateId, id);
  if (!doc) return Response.json({ error: "not_found" }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("ansicht") === "1" && (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/"));
  await audit(inline ? "view_document" : "download_document", {
    entity: "document",
    entityId: doc.id,
    summary: `Kandidatenportal, Kandidat ${displayNo.candidate(session.candidateId)}`,
  });
  return documentResponse(doc, inline ? "inline" : "attachment");
}
