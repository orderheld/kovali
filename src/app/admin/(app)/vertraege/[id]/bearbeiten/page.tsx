import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractFormOptions, countContractDocuments, getContract, listChildContracts } from "@/lib/admin/contracts/data";
import { parseId } from "@/lib/admin/forms";
import { deleteContract, updateContract } from "../../actions";
import { ContractForm } from "../../contract-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag bearbeiten" };

export default async function EditContractPage({ params }: PageProps<"/admin/vertraege/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const contract = await getContract(id);
  if (!contract) notFound();
  const [options, files, children] = await Promise.all([contractFormOptions(id), countContractDocuments(id), listChildContracts(id)]);

  const consequences = [
    files ? (files === 1 ? "Die abgelegte Datei wird mitgelöscht." : `Die ${files} abgelegten Dateien werden mitgelöscht.`) : null,
    "Notizen nur zu diesem Vertrag werden mitgelöscht; Einträge, die auch bei der Firma oder beim Auftrag stehen, bleiben dort.",
    children.length ? `${children.length === 1 ? "Ein Vertrag ist" : `${children.length} Verträge sind`} diesem Rahmenvertrag zugeordnet und verlieren die Zuordnung.` : null,
  ].filter((s) => s !== null);
  const confirm = [
    `Vertrag ${contract.number} endgültig löschen?`,
    files ? (files === 1 ? "Die abgelegte Datei wird mitgelöscht." : `Die ${files} abgelegten Dateien werden mitgelöscht.`) : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <>
      <PageHeader
        title={`${contract.title} bearbeiten`}
        crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: contract.number, href: `/admin/vertraege/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <ContractForm
          action={updateContract.bind(null, id)}
          options={options}
          initial={{
            title: contract.title,
            kind: contract.template,
            status: contract.status,
            companyId: contract.companyId,
            contactId: contract.contactId,
            assignmentId: contract.assignmentId,
            parentId: contract.parentId,
            validFrom: contract.validFrom,
            validUntil: contract.validUntil,
            signedAt: contract.signedAt,
            noticePeriod: contract.noticePeriod,
            notes: contract.notes,
          }}
          number={{ value: contract.number, pending: false }}
          currentKind={contract.template}
          cancelHref={`/admin/vertraege/${id}`}
          submitLabel="Änderungen speichern"
        />
        <Card className="border-red-200">
          <CardHeader title="Vertrag löschen" description={consequences.join(" ")} />
          <CardBody>
            <p className="mb-3 text-sm text-slate">Nur für Fehleinträge. Ein Vertrag, der nicht mehr gilt, bleibt besser als «Beendet» oder «Hinfällig» abgelegt.</p>
            <ActionButton action={deleteContract.bind(null, id)} confirm={confirm} variant="danger" size="md">
              {files ? "Vertrag und Dateien löschen" : "Vertrag löschen"}
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
