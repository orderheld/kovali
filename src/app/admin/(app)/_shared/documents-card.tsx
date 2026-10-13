import { desc, eq } from "drizzle-orm";
import { Download, Eye, FileText } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, LinkButton } from "@/components/admin/ui";
import { getDb } from "@/lib/admin/db/client";
import { documents } from "@/lib/admin/db/schema";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_LABEL, documentListColumns } from "@/lib/admin/documents";
import { formatBytes, formatDateTime } from "@/lib/admin/format";
import { documentKinds, labelOf } from "@/lib/admin/options";
import type { OwnerRef } from "@/lib/admin/owner";
import { confirmDocument, deleteDocument, uploadDocument } from "./actions";
import { UploadForm } from "./upload-form";

function ownerFilter(owner: OwnerRef) {
  switch (owner.type) {
    case "candidate":
      return eq(documents.candidateId, owner.id);
    case "company":
      return eq(documents.companyId, owner.id);
    case "mandate":
      return eq(documents.mandateId, owner.id);
    case "contract":
      return eq(documents.contractId, owner.id);
  }
}

/** Encrypted documents of one record: list, download, upload, delete. */
export async function DocumentsCard({
  owner,
  title = "Dokumente",
  defaultKind,
  description,
}: {
  owner: OwnerRef;
  title?: string;
  defaultKind?: string;
  description?: string;
}) {
  const db = await getDb();
  const rows = await db.select(documentListColumns).from(documents).where(ownerFilter(owner)).orderBy(desc(documents.createdAt));
  return (
    <Card>
      <CardHeader title={title} description={description ?? "Verschlüsselt gespeichert (AES-256). Jeder Abruf wird protokolliert."} />
      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((d) => (
            <li key={d.id} className="flex gap-3 px-5 py-3">
              <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-ink" title={d.filename}>
                    {d.filename}
                  </span>
                  {!d.confirmedAt ? <Badge tone="amber">Nicht bestätigt</Badge> : null}
                </p>
                <p className="text-xs text-slate">
                  {labelOf(documentKinds, d.kind)} · {formatBytes(d.sizeBytes)} · {formatDateTime(d.createdAt)}
                  {d.uploadedBy === "kandidat" ? " · aus dem Portal" : ""}
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
                  {!d.confirmedAt ? (
                    <ActionButton action={confirmDocument.bind(null, d.id)} variant="primary">
                      Bestätigen
                    </ActionButton>
                  ) : null}
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
        <UploadForm action={uploadDocument.bind(null, owner)} defaultKind={defaultKind} accept={DOCUMENT_ACCEPT} maxLabel={DOCUMENT_MAX_LABEL} />
      </CardBody>
    </Card>
  );
}
