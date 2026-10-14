import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, Lock } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, LinkButton, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractFormOptions, getContract } from "@/lib/admin/contracts/data";
import { getTemplate, templateInfo } from "@/lib/admin/contracts/templates";
import { parseId } from "@/lib/admin/forms";
import { contractStatuses, labelOf } from "@/lib/admin/options";
import { copyContract, deleteContract, updateContract } from "../../actions";
import { ContractForm } from "../../contract-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag bearbeiten" };

export default async function EditContractPage({ params }: PageProps<"/admin/vertraege/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const row = await getContract(id);
  if (!row) notFound();
  const template = getTemplate(row.template);
  const crumbs = [{ label: "Verträge", href: "/admin/vertraege" }, { label: row.number, href: `/admin/vertraege/${id}` }, { label: "Bearbeiten" }];

  // Sent and signed contracts stay as they are; changes go into a new draft.
  if (row.status !== "entwurf" || !template) {
    return (
      <>
        <PageHeader title={`${row.title} bearbeiten`} crumbs={crumbs} />
        <div className="max-w-2xl space-y-4">
          <Notice tone="amber" icon={Lock} title={`Der Vertrag ist ${labelOf(contractStatuses, row.status).toLowerCase()}`}>
            {template
              ? "Nur Entwürfe können bearbeitet werden. Für Änderungen kopierst du ihn als neuen Entwurf mit neuer Nummer; der bisherige Vertrag bleibt unverändert."
              : "Die Vorlage dieses Vertrags gibt es nicht mehr."}
          </Notice>
          <div className="flex flex-wrap gap-2">
            {template ? (
              <ActionButton action={copyContract.bind(null, id)} variant="primary" size="md" icon={<Copy aria-hidden className="size-4" />}>
                Als neuen Entwurf kopieren
              </ActionButton>
            ) : null}
            <LinkButton href={`/admin/vertraege/${id}`} variant="ghost">
              Zurück zum Vertrag
            </LinkButton>
          </div>
        </div>
      </>
    );
  }

  const options = await contractFormOptions();
  return (
    <>
      <PageHeader title={`${row.title} bearbeiten`} description={`${template.name} · ${row.number}`} crumbs={crumbs} />
      <div className="max-w-4xl space-y-6">
        <ContractForm
          key={id}
          action={updateContract.bind(null, id)}
          template={templateInfo(template)}
          options={options}
          initial={{
            title: row.title,
            companyId: row.companyId,
            contactId: row.contactId,
            candidateId: row.candidateId,
            mandateId: row.mandateId,
            parentId: row.parentId,
            validFrom: row.validFrom,
            validUntil: row.validUntil,
            notes: row.notes,
          }}
          initialData={{ ...template.defaults, ...row.data }}
          cancelHref={`/admin/vertraege/${id}`}
          submitLabel="Änderungen speichern"
        />
        <Card className="border-red-200">
          <CardHeader title="Entwurf löschen" description="Nur Entwürfe können gelöscht werden. Hochgeladene Dokumente und Notizen des Entwurfs werden mitgelöscht." />
          <CardBody>
            <ActionButton action={deleteContract.bind(null, id)} confirm={`Entwurf ${row.number} endgültig löschen?`} variant="danger" size="md">
              Entwurf endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
