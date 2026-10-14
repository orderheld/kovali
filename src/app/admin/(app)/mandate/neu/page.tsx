import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { param } from "@/lib/admin/data/query";
import { parseId } from "@/lib/admin/forms";
import { createMandate } from "../actions";
import { MandateForm } from "../mandate-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neues Mandat" };

export default async function NewMandatePage({ searchParams }: PageProps<"/admin/mandate/neu">) {
  await requireAdmin();
  const firma = parseId(param((await searchParams).firma));
  const [companies, contacts] = await Promise.all([companyOptions(), contactOptions()]);
  // Opened from a company page: that company is preselected.
  const defaultCompanyId = firma && companies.some((c) => c.value === firma) ? firma : undefined;
  return (
    <>
      <PageHeader
        title="Neues Mandat"
        description="Anfrage, Ausschreibung oder Direktmandat erfassen."
        crumbs={[{ label: "Mandate", href: "/admin/mandate" }, { label: "Neu" }]}
      />
      <div className="max-w-4xl">
        <MandateForm
          action={createMandate}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          contacts={contacts}
          defaultCompanyId={defaultCompanyId}
          cancelHref={defaultCompanyId ? `/admin/firmen/${defaultCompanyId}` : "/admin/mandate"}
        />
      </div>
    </>
  );
}
