import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, FileText, Handshake, Lightbulb, Lock, Scale, UserCheck } from "lucide-react";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractFormOptions, loadPrefill } from "@/lib/admin/contracts/data";
import { contractTemplates, getTemplate, templateInfo } from "@/lib/admin/contracts/templates";
import type { TemplateId } from "@/lib/admin/contracts/types";
import { templateIds } from "@/lib/admin/contracts/types";
import { listHref, param } from "@/lib/admin/data/query";
import { parseId } from "@/lib/admin/forms";
import { createContract } from "../actions";
import { ContractForm } from "../contract-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag erstellen" };

const icons: Record<TemplateId, LucideIcon> = {
  rahmenvertrag: Handshake,
  einzelauftrag: FileText,
  subunternehmer: Building2,
  nda: Lock,
  einwilligung: UserCheck,
  beratung: Lightbulb,
};

export default async function NewContractPage({ searchParams }: PageProps<"/admin/vertraege/neu">) {
  await requireAdmin();
  const sp = await searchParams;
  // Links from other records: ?firma=, ?kontakt=, ?kandidat=, ?mandat=, ?rahmen=
  const ids = {
    firma: parseId(param(sp.firma)),
    kontakt: parseId(param(sp.kontakt)),
    kandidat: parseId(param(sp.kandidat)),
    mandat: parseId(param(sp.mandat)),
    rahmen: parseId(param(sp.rahmen)),
  };
  const template = getTemplate(param(sp.vorlage));
  const chooserHref = listHref("/admin/vertraege/neu", ids);

  if (!template) {
    return (
      <>
        <PageHeader
          title="Vertrag erstellen"
          description="Wähle eine Vorlage. Parteien, Adressen und Beträge kommen aus den verknüpften Firmen, Personen und Mandaten."
          crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: "Neu" }]}
        />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templateIds.map((id) => {
            const t = contractTemplates[id];
            const Icon = icons[id];
            return (
              <li key={id}>
                <Card as="article" className="h-full transition-colors hover:border-blue/40">
                  <Link href={listHref("/admin/vertraege/neu", { vorlage: id, ...ids })} className="group flex h-full flex-col gap-3 p-5">
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-blue">
                        <Icon aria-hidden className="size-4.5" />
                      </span>
                      <span className="font-semibold text-ink group-hover:text-blue">{t.name}</span>
                    </span>
                    <span className="text-sm text-slate">{t.description}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.8125rem] text-slate">
                      {t.counterparty}
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-blue transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
        <Notice tone="neutral" icon={Scale} className="mt-6">
          Vorlage, keine Rechtsberatung. Vor dem ersten Einsatz einmal von einer Anwältin oder einem Anwalt prüfen lassen.
        </Notice>
      </>
    );
  }

  const [options, prefill] = await Promise.all([contractFormOptions(), loadPrefill(template.id, ids)]);
  return (
    <>
      <PageHeader
        title={`${template.name} erstellen`}
        description={template.description}
        crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: "Neu", href: chooserHref }, { label: template.name }]}
        actions={
          <Link href={chooserHref} className="text-sm font-medium text-blue hover:underline">
            Andere Vorlage wählen
          </Link>
        }
      />
      <div className="max-w-4xl">
        <ContractForm
          // Same route with other search params: start a fresh form, not the previous state.
          key={chooserHref.replace("/admin/vertraege/neu", template.id)}
          action={createContract.bind(null, template.id)}
          template={templateInfo(template)}
          options={options}
          initial={prefill.common}
          initialData={{ ...template.defaults, ...prefill.data }}
          cancelHref="/admin/vertraege"
          submitLabel="Entwurf erstellen"
        />
      </div>
    </>
  );
}
