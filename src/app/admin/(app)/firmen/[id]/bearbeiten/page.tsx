import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyDeleteImpact, getCompany } from "@/lib/admin/data/companies";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { deleteCompany, updateCompany } from "../../actions";
import { CompanyForm } from "../../company-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Firma bearbeiten" };

export default async function EditCompanyPage({ params }: PageProps<"/admin/firmen/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [company, impact] = await Promise.all([getCompany(id), companyDeleteImpact(id)]);
  if (!company) notFound();
  const linked = [
    impact.assignments ? (impact.assignments === 1 ? "1 Auftrag" : `${impact.assignments} Aufträge`) : null,
    impact.mandates ? (impact.mandates === 1 ? "1 Vakanz" : `${impact.mandates} Vakanzen`) : null,
    impact.contracts ? (impact.contracts === 1 ? "1 Vertrag" : `${impact.contracts} Verträge`) : null,
  ].filter((part) => part !== null);
  const total = impact.assignments + impact.mandates + impact.contracts;
  const consequences = linked.length ? [`${linked.join(", ")} ${total === 1 ? "bleibt" : "bleiben"} erhalten, aber ohne diese Firma.`] : [];
  const description = ["Kontakte, Notizen und Dokumente der Firma werden mitgelöscht. Aufträge, Vakanzen, Verträge und Textbausteine bleiben, verlieren aber die Zuordnung.", ...consequences].join(" ");
  const confirm = [`«${company.name}» mit allen Kontakten und Dokumenten endgültig löschen?`, ...consequences].join("\n\n");
  return (
    <>
      <PageHeader
        title={`${company.name} bearbeiten`}
        crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: displayNo.company(id), href: `/admin/firmen/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <CompanyForm action={updateCompany.bind(null, id)} company={company} cancelHref={`/admin/firmen/${id}`} />
        <Card className="border-red-200">
          <CardHeader title="Firma löschen" description={description} />
          <CardBody>
            <ActionButton
              action={deleteCompany.bind(null, id)}
              confirm={confirm}
              variant="danger"
              size="md"
            >
              Firma endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
