import { audit } from "@/lib/admin/audit";
import { adminSessionForApi } from "@/lib/admin/auth/session";
import { documentResponse } from "@/lib/admin/documents";
import { processingRecordDocModel } from "@/lib/admin/privacy";
import { exportFileName } from "@/lib/admin/render/model";
import { renderPdf } from "@/lib/admin/render/pdf";

/** The record of processing activities (Art. 12 DSG) as a PDF. */
export async function GET() {
  if (!(await adminSessionForApi())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const doc = processingRecordDocModel(new Date());
  const pdf = await renderPdf(doc);
  await audit("export", { entity: "privacy", summary: "Verzeichnis der Bearbeitungstätigkeiten (PDF)" });
  return documentResponse({ plain: pdf, filename: exportFileName(doc.title, "pdf"), mimeType: "application/pdf" });
}
