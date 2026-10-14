import { audit } from "@/lib/admin/audit";
import { adminSessionForApi } from "@/lib/admin/auth/session";
import { getContract, loadContractContext } from "@/lib/admin/contracts/data";
import { buildContractDocument } from "@/lib/admin/contracts/document";
import { getTemplate } from "@/lib/admin/contracts/templates";
import { documentResponse } from "@/lib/admin/documents";
import { parseId } from "@/lib/admin/forms";
import { exportFileName } from "@/lib/admin/render/model";
import { renderDocx } from "@/lib/admin/render/docx";
import { renderPdf } from "@/lib/admin/render/pdf";

const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/**
 * A contract as PDF or Word file: ?format=pdf (default) or ?format=docx; ?ansicht=1 opens
 * the PDF in the browser. Built from the stored data and the current records each time.
 */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/vertraege/[id]">) {
  if (!(await adminSessionForApi())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  const search = new URL(request.url).searchParams;
  const format = search.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "docx") return Response.json({ error: "bad_format" }, { status: 400 });

  const row = await getContract(id);
  if (!row || !getTemplate(row.template)) return Response.json({ error: "not_found" }, { status: 404 });
  const doc = buildContractDocument(row, await loadContractContext(row));
  const plain = format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
  const inline = format === "pdf" && search.get("ansicht") === "1";
  await audit("export", { entity: "contract", entityId: id, summary: `Vertrag ${row.number} als ${format.toUpperCase()}` });
  return documentResponse({ plain, filename: exportFileName(doc.title, format), mimeType: MIME[format] }, inline ? "inline" : "attachment");
}
