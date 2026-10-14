import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { getMandate, mandateDeleteImpact, skillSuggestions } from "@/lib/admin/data/mandates";
import { listSnippets } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { deleteVacancy, updateVacancy } from "../../actions";
import { VacancyForm } from "../../vacancy-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vakanz bearbeiten" };

function plural(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

export default async function EditVacancyPage({ params }: PageProps<"/admin/vakanzen/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [vacancy, impact, companies, contacts, snippets, skills] = await Promise.all([
    getMandate(id),
    mandateDeleteImpact(id),
    companyOptions(),
    contactOptions(),
    listSnippets(),
    skillSuggestions(),
  ]);
  if (!vacancy) notFound();

  const linked = [
    impact.assignments ? plural(impact.assignments, "Auftrag", "Aufträge") : null,
    impact.contracts ? plural(impact.contracts, "Vertrag", "Verträge") : null,
  ].filter((part) => part !== null);
  const kept = linked.length ? ` ${linked.join(" und ")} ${impact.assignments + impact.contracts === 1 ? "bleibt" : "bleiben"} erhalten, ohne Verknüpfung.` : "";
  const docs = impact.documents ? ` Das ${impact.documents === 1 ? "betrifft 1 Dokument" : `betrifft ${impact.documents} Dokumente`}.` : "";
  // Submissions and shares of the former candidate module go with the vacancy (on delete cascade).
  const legacy = impact.legacy
    ? ` Auch ${impact.legacy === 1 ? "1 alter Eintrag" : `${impact.legacy} alte Einträge`} aus dem früheren Kandidatenmodul ${impact.legacy === 1 ? "wird" : "werden"} gelöscht.`
    : "";

  return (
    <>
      <PageHeader
        title="Vakanz bearbeiten"
        description={vacancy.title}
        crumbs={[{ label: "Vakanzen", href: "/admin/vakanzen" }, { label: displayNo.mandate(id), href: `/admin/vakanzen/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <VacancyForm
          action={updateVacancy.bind(null, id)}
          vacancy={vacancy}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          contacts={contacts}
          snippets={snippets.map((s) => ({ id: s.id, title: s.title, category: s.category, pinned: s.pinned, body: s.body }))}
          skillSuggestions={skills}
          cancelHref={`/admin/vakanzen/${id}`}
        />
        <Card className="border-red-200">
          <CardHeader
            title="Vakanz löschen"
            description={`Notizen und Dokumente der Vakanz werden mitgelöscht.${docs}${legacy}${kept} Für den Überblick ist «Absage» oder «Zurückgezogen» meist besser als Löschen.`}
          />
          <CardBody>
            <ActionButton
              action={deleteVacancy.bind(null, id)}
              confirm={`Vakanz ${displayNo.mandate(id)} mit allen Notizen und Dokumenten endgültig löschen?${legacy}${kept}`}
              variant="danger"
              size="md"
            >
              Vakanz endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
