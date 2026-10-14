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
  const people = impact.candidates === 1 ? "1 Fachperson" : `${impact.candidates} Fachpersonen`;
  const proposals = impact.submissions === 1 ? "1 Vorschlag" : `${impact.submissions} Vorschlägen`;
  const consequences = [
    impact.candidates ? `${people}, die über diese Firma ${impact.candidates === 1 ? "arbeitet, verliert" : "arbeiten, verlieren"} ihre Firma.` : null,
    impact.submissions ? `Bei ${proposals} geht die Angabe «über Firma» verloren.` : null,
  ].filter((line) => line !== null);
  const description = ["Kontakte, Notizen und Dokumente der Firma werden mitgelöscht. Mandate und Verträge bleiben, verlieren aber die Zuordnung.", ...consequences].join(" ");
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
