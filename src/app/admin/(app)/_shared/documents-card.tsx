import { desc, eq } from "drizzle-orm";
import { Download, Eye, FileText } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, LinkButton } from "@/components/admin/ui";
import { getDb } from "@/lib/admin/db/client";
import { documents } from "@/lib/admin/db/schema";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_LABEL, documentListColumns } from "@/lib/admin/documents";
import { formatBytes, formatDateTime } from "@/lib/admin/format";
import { documentKindOptions, documentKinds, labelOf, type DocumentKind } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { deleteDocument, uploadDocument } from "./actions";
import { UploadForm } from "./upload-form";

function ownerFilter(owner: OwnerRef) {
  switch (owner.type) {
    case "company":
      return eq(documents.companyId, owner.id);
    case "mandate":
      return eq(documents.mandateId, owner.id);
    case "contract":
      return eq(documents.contractId, owner.id);
    case "assignment":
      return eq(documents.assignmentId, owner.id);
  }
}

/**
 * Encrypted documents of one record: list, view, download, upload, delete. The upload offers
 * the document kinds of the owner type (documentKindsByOwner in options.ts); `defaultKind`
 * preselects one of them, otherwise the first.
 */
export async function DocumentsCard({
  owner,
  title = "Dokumente",
  defaultKind,
  description,
}: {
  owner: OwnerRef;
  title?: string;
  defaultKind?: DocumentKind;
  description?: string;
}) {
  const db = await getDb();
  const rows = await db.select(documentListColumns).from(documents).where(ownerFilter(owner)).orderBy(desc(documents.createdAt), desc(documents.id));
  const kinds = documentKindOptions(owner.type);
  const preselected = defaultKind && kinds.some((k) => k.value === defaultKind) ? defaultKind : kinds[0].value;
  return (
    <Card>
      <CardHeader title={title} description={description ?? "Verschlüsselt gespeichert (AES-256). Jeder Abruf wird protokolliert."} />
      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((d) => (
            <li key={d.id} className="flex gap-3 px-5 py-3">
              <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={d.filename}>
                  {d.filename}
                </p>
                <p className="text-xs text-slate">
                  {labelOf(documentKinds, d.kind)} · {formatBytes(d.sizeBytes)} · {formatDateTime(d.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {d.mimeType === "application/pdf" || d.mimeType.startsWith("image/") ? (
                    <LinkButton href={`/admin/api/dokumente/${d.id}?ansicht=1`} target="_blank" size="sm" variant="secondary" icon={Eye}>
                      Ansehen
                    </LinkButton>
                  ) : null}
                  <LinkButton href={`/admin/api/dokumente/${d.id}`} size="sm" variant="secondary" icon={Download}>
                    Herunterladen
                  </LinkButton>
                  <ActionButton action={deleteDocument.bind(null, d.id)} confirm={`«${d.filename}» endgültig löschen?`} variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800">
                    Löschen
                  </ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <CardBody className={rows.length ? "border-t border-line" : undefined}>
        <UploadForm action={uploadDocument.bind(null, owner)} kinds={kinds} defaultKind={preselected} accept={DOCUMENT_ACCEPT} maxLabel={DOCUMENT_MAX_LABEL} />
      </CardBody>
    </Card>
  );
}
