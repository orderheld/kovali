import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractFormOptions, contractPrefill, upcomingContractNumber } from "@/lib/admin/contracts/data";
import { listHref, param } from "@/lib/admin/data/query";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_LABEL } from "@/lib/admin/documents";
import { todayIso } from "@/lib/admin/format";
import { parseId } from "@/lib/admin/forms";
import { createContract } from "../actions";
import { ContractForm } from "../contract-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag ablegen" };

export default async function NewContractPage({ searchParams }: PageProps<"/admin/vertraege/neu">) {
  await requireAdmin();
  const sp = await searchParams;
  // Opened from an assignment (?auftrag=), a company (?firma=) or a Rahmenvertrag (?rahmen=).
  const ids = { auftrag: parseId(param(sp.auftrag)), firma: parseId(param(sp.firma)), rahmen: parseId(param(sp.rahmen)) };
  const [options, initial, number] = await Promise.all([contractFormOptions(), contractPrefill(ids), upcomingContractNumber(Number(todayIso().slice(0, 4)))]);
  // "Abbrechen" leads back to where the form was opened.
  const back = ids.auftrag ? `/admin/auftraege/${ids.auftrag}` : ids.rahmen ? `/admin/vertraege/${ids.rahmen}` : ids.firma ? `/admin/firmen/${ids.firma}` : "/admin/vertraege";

  return (
    <>
      <PageHeader
        title="Vertrag ablegen"
        description="Erfasse die Eckdaten und lade die Datei gleich mit hoch. Die Nummer wird automatisch vergeben."
        crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: "Neu" }]}
      />
      <div className="max-w-4xl">
        <ContractForm
          // Same route with other search params: start a fresh form, not the previous state.
          key={listHref("", ids)}
          action={createContract}
          options={options}
          initial={initial}
          number={{ value: number, pending: true }}
          file={{ accept: DOCUMENT_ACCEPT, maxLabel: DOCUMENT_MAX_LABEL }}
          cancelHref={back}
          submitLabel="Vertrag ablegen"
        />
      </div>
    </>
  );
}
