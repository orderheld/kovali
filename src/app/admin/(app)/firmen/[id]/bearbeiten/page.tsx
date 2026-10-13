import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCompany } from "@/lib/admin/data/companies";
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
  const company = await getCompany(id);
  if (!company) notFound();
  return (
    <>
      <PageHeader
        title={`${company.name} bearbeiten`}
        crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: displayNo.company(id), href: `/admin/firmen/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <CompanyForm action={updateCompany.bind(null, id)} company={company} cancelHref={`/admin/firmen/${id}`} />
        <Card className="border-red-200">
          <CardHeader title="Firma löschen" description="Kontakte, Notizen und Dokumente der Firma werden mitgelöscht. Mandate und Verträge bleiben, verlieren aber die Zuordnung." />
          <CardBody>
            <ActionButton
              action={deleteCompany.bind(null, id)}
              confirm={`«${company.name}» mit allen Kontakten und Dokumenten endgültig löschen?`}
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
