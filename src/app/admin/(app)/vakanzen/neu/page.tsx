import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { skillSuggestions } from "@/lib/admin/data/mandates";
import { param } from "@/lib/admin/data/query";
import { listSnippets } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { createVacancy } from "../actions";
import { VacancyForm } from "../vacancy-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neue Vakanz" };

export default async function NewVacancyPage({ searchParams }: PageProps<"/admin/vakanzen/neu">) {
  await requireAdmin();
  const firma = parseId(param((await searchParams).firma));
  const [companies, contacts, snippets, skills] = await Promise.all([companyOptions(), contactOptions(), listSnippets(), skillSuggestions()]);
  // Opened from a company page: that company is preselected.
  const defaultCompanyId = firma && companies.some((c) => c.value === firma) ? firma : undefined;
  return (
    <>
      <PageHeader
        title="Neue Vakanz"
        description="Eine Stelle, auf die du dich bewerben willst. Der Titel genügt, den Rest kannst du später ergänzen."
        crumbs={[{ label: "Vakanzen", href: "/admin/vakanzen" }, { label: "Neu" }]}
      />
      <div className="max-w-4xl">
        <VacancyForm
          action={createVacancy}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          contacts={contacts}
          snippets={snippets.map(({ id, title, category, pinned, body }) => ({ id, title, category, pinned, body }))}
          skillSuggestions={skills}
          defaultCompanyId={defaultCompanyId}
          cancelHref={defaultCompanyId ? `/admin/firmen/${defaultCompanyId}` : "/admin/vakanzen"}
        />
      </div>
    </>
  );
}
