import type { Metadata } from "next";
import { CheckCircle2, Clock, Download, Eye, FileText, ShieldAlert, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Notice } from "@/components/admin/ui";
import { SENSITIVE_DATA_HINT } from "@/components/portal/constants";
import { PortalHeading } from "@/components/portal/ui";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_LABEL } from "@/lib/admin/documents";
import { formatBytes, formatDate } from "@/lib/admin/format";
import { documentKinds, labelOf } from "@/lib/admin/options";
import { candidateDocumentKinds, ownUploads } from "@/lib/portal/data";
import { requireCandidate } from "@/lib/portal/session";
import { deleteOwnDocument } from "../actions";
import { UploadForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Dokumente" };

const kindOptions = candidateDocumentKinds.map((value) => ({ value, label: labelOf(documentKinds, value) }));

export default async function DocumentsPage() {
  const session = await requireCandidate();
  const uploads = await ownUploads(session.candidateId);
  const pending = uploads.filter((d) => !d.confirmedAt).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PortalHeading
        title="Dokumente"
        description="Laden Sie Ihren aktuellen Lebenslauf, Zeugnisse, Diplome und Zertifikate hoch. Die Dateien werden verschlüsselt gespeichert und gelten als «Nicht bestätigt», bis KOVALI sie geprüft hat."
      />
      <div className="space-y-4 sm:space-y-5">
        <section aria-labelledby="upload-titel" className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:p-6">
          <h2 id="upload-titel" className="mb-4 text-base font-semibold text-ink">
            Dokument hochladen
          </h2>
          <Notice tone="neutral" icon={ShieldAlert} className="mb-5">
            {SENSITIVE_DATA_HINT} Schwärzen Sie solche Angaben in Zeugnissen bei Bedarf.
          </Notice>
          <UploadForm kinds={kindOptions} accept={DOCUMENT_ACCEPT} maxLabel={DOCUMENT_MAX_LABEL} />
        </section>

        <section aria-labelledby="liste-titel" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="liste-titel" className="flex-1 text-base font-semibold text-ink">
              Ihre Uploads
            </h2>
            {pending ? <Badge tone="amber">{pending} nicht bestätigt</Badge> : null}
          </div>
          {uploads.length ? (
            <ul className="divide-y divide-line">
              {uploads.map((doc) => {
                const viewable = doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/");
                return (
                  <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mist text-blue">
                      <FileText aria-hidden className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <p className="text-sm text-slate">
                        {labelOf(documentKinds, doc.kind)} · {formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    {doc.confirmedAt ? (
                      <Badge tone="green">
                        <CheckCircle2 aria-hidden className="size-3" />
                        Bestätigt
                      </Badge>
                    ) : (
                      <Badge tone="amber">
                        <Clock aria-hidden className="size-3" />
                        Nicht bestätigt
                      </Badge>
                    )}
                    <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
                      {viewable ? (
                        <a
                          href={`/portal/api/dokumente/${doc.id}?ansicht=1`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-slate hover:bg-mist hover:text-ink"
                        >
                          <Eye aria-hidden className="size-4" />
                          Ansehen
                        </a>
                      ) : null}
                      <a
                        href={`/portal/api/dokumente/${doc.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-slate hover:bg-mist hover:text-ink"
                      >
                        <Download aria-hidden className="size-4" />
                        Herunterladen
                      </a>
                      {doc.confirmedAt ? null : (
                        <ActionButton
                          action={deleteOwnDocument.bind(null, doc.id)}
                          confirm={`«${doc.filename}» löschen?`}
                          variant="ghost"
                          icon={<Trash2 aria-hidden className="size-4" />}
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          Löschen
                        </ActionButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate sm:px-5">Sie haben noch keine Dokumente hochgeladen.</p>
          )}
          <p className="border-t border-line px-4 py-3 text-[0.8125rem] text-slate sm:px-5">
            Hier erscheinen nur Dateien, die Sie selbst hochgeladen haben. Bestätigte Dokumente kann nur KOVALI löschen; schreiben Sie uns, wenn ein Dokument
            entfernt werden soll.
          </p>
        </section>
      </div>
    </div>
  );
}
