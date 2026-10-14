import type { Metadata } from "next";
import Link from "next/link";
import { Check, Download, Eye, FileCheck2, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Card, EmptyState, Mono, Table, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatBytes, formatDateTime } from "@/lib/admin/format";
import { documentKinds, labelOf } from "@/lib/admin/options";
import { pendingUploads } from "@/lib/portal/admin";
import { confirmDocument, deleteDocument } from "../../_shared/actions";
import { PortalHeader } from "../header";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Portal-Dokumente" };

const linkClass = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-slate hover:bg-mist hover:text-ink";

export default async function PortalDocumentsPage() {
  await requireAdmin();
  const uploads = await pendingUploads();

  return (
    <>
      <PortalHeader active="dokumente" />
      <Card>
        {uploads.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Dokument</Th>
                <Th>Hochgeladen</Th>
                <Th align="right">Aktionen</Th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((d) => {
                const viewable = d.mimeType === "application/pdf" || d.mimeType.startsWith("image/");
                return (
                  <tr key={d.id} className="hover:bg-mist/50">
                    <Td>
                      {d.candidateId ? (
                        <>
                          <Link href={`/admin/kandidaten/${d.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
                            {d.firstName} {d.lastName}
                          </Link>
                          <div className="mt-0.5">
                            <Mono>{displayNo.candidate(d.candidateId)}</Mono>
                          </div>
                        </>
                      ) : (
                        "–"
                      )}
                    </Td>
                    <Td>
                      <span className="block max-w-xs truncate font-medium text-ink" title={d.filename}>
                        {d.filename}
                      </span>
                      <span className="text-xs text-slate">
                        {labelOf(documentKinds, d.kind)} · {formatBytes(d.sizeBytes)}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(d.createdAt)}</Td>
                    <Td align="right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {viewable ? (
                          <a href={`/admin/api/dokumente/${d.id}?ansicht=1`} target="_blank" rel="noopener" className={linkClass}>
                            <Eye aria-hidden className="size-4" />
                            Ansehen
                          </a>
                        ) : null}
                        <a href={`/admin/api/dokumente/${d.id}`} className={linkClass}>
                          <Download aria-hidden className="size-4" />
                          Herunterladen
                        </a>
                        <ActionButton action={confirmDocument.bind(null, d.id)} variant="primary" icon={<Check aria-hidden className="size-4" />}>
                          Bestätigen
                        </ActionButton>
                        <ActionButton
                          action={deleteDocument.bind(null, d.id)}
                          confirm={`«${d.filename}» löschen? Die Person sieht im Portal, dass das Dokument nicht mehr da ist.`}
                          variant="ghost"
                          icon={<Trash2 aria-hidden className="size-4" />}
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          Löschen
                        </ActionButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={FileCheck2} title="Keine Dokumente zu prüfen">
            Lädt jemand im Portal einen Lebenslauf oder ein Zeugnis hoch, erscheint es hier, bis du es bestätigst.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
