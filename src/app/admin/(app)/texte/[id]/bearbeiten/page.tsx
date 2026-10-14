import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions } from "@/lib/admin/data/companies";
import { getSnippet, snippetCategories } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { editSnippet, removeSnippet } from "../../actions";
import { SnippetForm } from "../../snippet-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Textbaustein bearbeiten" };

export default async function EditSnippetPage({ params }: PageProps<"/admin/texte/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [snippet, companies, categories] = await Promise.all([getSnippet(id), companyOptions(), snippetCategories()]);
  if (!snippet) notFound();
  return (
    <>
      <PageHeader
        title="Textbaustein bearbeiten"
        description={snippet.title}
        crumbs={[{ label: "Textbausteine", href: "/admin/texte" }, { label: displayNo.snippet(id), href: `/admin/texte/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <SnippetForm
          action={editSnippet.bind(null, id)}
          snippet={snippet}
          categories={categories.map((c) => c.category)}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          cancelHref={`/admin/texte/${id}`}
        />
        <Card className="border-red-200">
          <CardHeader title="Textbaustein löschen" description="Der Text ist danach weg. Bewerbungstexte, in die du ihn eingefügt hast, bleiben unverändert." />
          <CardBody>
            <ActionButton action={removeSnippet.bind(null, id)} confirm={`Textbaustein «${snippet.title}» endgültig löschen?`} variant="danger" size="md">
              Textbaustein endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
