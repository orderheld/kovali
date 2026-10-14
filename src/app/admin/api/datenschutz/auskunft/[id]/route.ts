import { audit } from "@/lib/admin/audit";
import { adminSessionForApi } from "@/lib/admin/auth/session";
import { documentResponse } from "@/lib/admin/documents";
import { displayNo, todayIso } from "@/lib/admin/format";
import { parseId } from "@/lib/admin/forms";
import { buildDisclosure, disclosureDocModel } from "@/lib/admin/privacy";
import { exportFileName } from "@/lib/admin/render/model";
import { renderPdf } from "@/lib/admin/render/pdf";

/**
 * Access report for one candidate (Art. 25 DSG): ?format=pdf (default) for the letter,
 * ?format=json for the machine-readable copy (Art. 28 DSG). File names carry only the
 * display number, never the name, because downloads end up in folders and mail attachments.
 */
export async function GET(request: Request, { params }: RouteContext<"/admin/api/datenschutz/auskunft/[id]">) {
  if (!(await adminSessionForApi())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "pdf";

  const now = new Date();
  const disclosure = await buildDisclosure(id, now);
  if (!disclosure) return Response.json({ error: "not_found" }, { status: 404 });

  const no = displayNo.candidate(id);
  await audit("export", { entity: "candidate", entityId: id, summary: `Auskunft ${no} (${format.toUpperCase()})` });

  if (format === "json") {
    const body = Buffer.from(JSON.stringify(disclosure, null, 2), "utf8");
    return documentResponse({ plain: body, filename: `Auskunft_${no}_${todayIso(now)}.json`, mimeType: "application/json; charset=utf-8" });
  }
  const doc = disclosureDocModel(disclosure);
  const pdf = await renderPdf(doc);
  return documentResponse({ plain: pdf, filename: exportFileName(doc.title, "pdf"), mimeType: "application/pdf" });
}
