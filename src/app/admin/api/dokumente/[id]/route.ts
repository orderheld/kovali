import { audit } from "@/lib/admin/audit";
import { adminSessionForApi } from "@/lib/admin/auth/session";
import { documentResponse, loadDocument } from "@/lib/admin/documents";
import { parseId } from "@/lib/admin/forms";

/** Decrypts and sends one document. ?ansicht=1 opens PDFs and images in the browser. */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/dokumente/[id]">) {
  if (!(await adminSessionForApi())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  const doc = await loadDocument(id);
  if (!doc) return Response.json({ error: "not_found" }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("ansicht") === "1" && (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/"));
  await audit(inline ? "view_document" : "download_document", { entity: "document", entityId: doc.id });
  return documentResponse(doc, inline ? "inline" : "attachment");
}
