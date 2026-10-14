import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { adminSessionForApi } from "@/lib/admin/auth/session";
import { getCandidate, getMandateForDossier, getSubmissionFor } from "@/lib/admin/data/candidates";
import { getCompany } from "@/lib/admin/data/companies";
import { buildDossier, dossierFileName, mandateDraftReasons } from "@/lib/admin/dossier";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { renderDocx } from "@/lib/admin/render/docx";
import { renderPdf } from "@/lib/admin/render/pdf";

/**
 * Candidate dossier as PDF or Word:
 * GET /admin/api/kandidaten/[id]/dossier?format=pdf|docx&variante=anonym|namentlich[&mandat=<id>]
 * With a mandate, the dossier carries its number, the selling rate of the proposal and, while
 * the candidate's consent for that mandate is missing or withdrawn, or the candidate objects to
 * any hand-over, a prominent draft notice "Nicht weitergeben".
 */

const querySchema = z.object({
  format: z.enum(["pdf", "docx"]).default("pdf"),
  variante: z.enum(["anonym", "namentlich"]).default("anonym"),
  mandat: z.string().regex(/^\d{1,12}$/).optional(),
});

const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function GET(request: Request, { params }: RouteContext<"/admin/api/kandidaten/[id]/dossier">) {
  if (!(await adminSessionForApi())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });
  const sp = new URL(request.url).searchParams;
  const query = querySchema.safeParse({
    format: sp.get("format") ?? undefined,
    variante: sp.get("variante") ?? undefined,
    mandat: sp.get("mandat") || undefined,
  });
  if (!query.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { format, variante: variant } = query.data;
  const mandateId = query.data.mandat ? parseId(query.data.mandat) : null;
  if (query.data.mandat && !mandateId) return Response.json({ error: "bad_request" }, { status: 400 });

  const candidate = await getCandidate(id);
  if (!candidate) return Response.json({ error: "not_found" }, { status: 404 });
  const mandate = mandateId ? await getMandateForDossier(mandateId) : null;
  if (mandateId && !mandate) return Response.json({ error: "not_found" }, { status: 404 });
  const [submission, company] = await Promise.all([
    mandate ? getSubmissionFor(mandate.id, id) : null,
    candidate.companyId ? getCompany(candidate.companyId) : null,
  ]);

  const objection = Boolean(candidate.objectionAt);
  const doc = buildDossier(candidate, { variant, mandate, submission, company, objection, template: "kovali" });
  const body = format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
  const filename = dossierFileName(candidate, { variant, mandate }, format);

  const variantLabel = variant === "anonym" ? "anonym" : "namentlich";
  const formatLabel = format === "pdf" ? "PDF" : "Word";
  const mandateNo = mandate ? displayNo.mandate(mandate.id) : null;
  const draft = mandate && mandateDraftReasons({ submission, company, objection }).length ? ", Entwurf" : "";
  await audit("export", {
    entity: "candidate",
    entityId: id,
    summary: `Dossier ${displayNo.candidate(id)} ${variantLabel} ${formatLabel}${mandateNo ? ` (${mandateNo})` : ""}${draft}`,
  });
  await logActivity(
    mandate ? [{ type: "candidate", id }, { type: "mandate", id: mandate.id }] : { type: "candidate", id },
    `Dossier erstellt: ${variant === "anonym" ? "anonymisiert" : "mit Namen"}, ${formatLabel}${mandateNo ? `, für ${mandateNo}` : ""}${draft}`,
  );

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": MIME[format],
      "Content-Length": String(body.length),
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
