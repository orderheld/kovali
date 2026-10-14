import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions } from "@/lib/admin/data/companies";
import { param } from "@/lib/admin/data/query";
import { snippetCategories } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { createSnippet } from "../actions";
import { SnippetForm } from "../snippet-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neuer Textbaustein" };

export default async function NewSnippetPage({ searchParams }: PageProps<"/admin/texte/neu">) {
  await requireAdmin();
  const firma = parseId(param((await searchParams).firma));
  const [companies, categories] = await Promise.all([companyOptions(), snippetCategories()]);
  // Opened from a company or a vacancy: that company is preselected.
  const defaultCompanyId = firma && companies.some((c) => c.value === firma) ? firma : undefined;
  return (
    <>
      <PageHeader
        title="Neuer Textbaustein"
        description="Ein Text, den du immer wieder brauchst, zum Beispiel dein Kurzprofil für eine Bewerbung."
        crumbs={[{ label: "Textbausteine", href: "/admin/texte" }, { label: "Neu" }]}
      />
      <div className="max-w-4xl">
        <SnippetForm
          action={createSnippet}
          categories={categories.map((c) => c.category)}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          defaultCompanyId={defaultCompanyId}
          cancelHref="/admin/texte"
        />
      </div>
    </>
  );
}
