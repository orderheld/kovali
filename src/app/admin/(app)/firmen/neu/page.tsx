import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { param } from "@/lib/admin/data/query";
import { companyKinds } from "@/lib/admin/options";
import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neue Firma" };

export default async function NewCompanyPage({ searchParams }: PageProps<"/admin/firmen/neu">) {
  await requireAdmin();
  const art = param((await searchParams).art);
  const defaultKind = companyKinds.some((k) => k.value === art) ? art : undefined;
  return (
    <>
      <PageHeader title="Neue Firma" crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: "Neu" }]} />
      <div className="max-w-4xl">
        <CompanyForm action={createCompany} cancelHref="/admin/firmen" defaultKind={defaultKind} />
      </div>
    </>
  );
}
