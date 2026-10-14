import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { assignmentDeleteImpact, getAssignment } from "@/lib/admin/data/assignments";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { loadEarningsSettings } from "@/lib/admin/data/earnings";
import { mandateOptions } from "@/lib/admin/data/lookups";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { deleteAssignment, updateAssignment } from "../../actions";
import { AssignmentForm } from "../../assignment-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Auftrag bearbeiten" };

export default async function EditAssignmentPage({ params }: PageProps<"/admin/auftraege/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [detail, impact, companies, contacts, vacancies, { settings }] = await Promise.all([
    getAssignment(id),
    assignmentDeleteImpact(id),
    companyOptions(),
    contactOptions(),
    mandateOptions(),
    loadEarningsSettings(),
  ]);
  if (!detail) notFound();
  const a = detail.assignment;

  const lost = [impact.documents === 1 ? "1 Dokument" : impact.documents ? `${impact.documents} Dokumente` : null, "die Notizen"].filter(Boolean).join(" und ");
  const kept = impact.contracts ? (impact.contracts === 1 ? "Der verknüpfte Vertrag bleibt erhalten, aber ohne diesen Auftrag." : `Die ${impact.contracts} verknüpften Verträge bleiben erhalten, aber ohne diesen Auftrag.`) : null;
  const description = [`Mit dem Auftrag werden ${lost} gelöscht.`, kept, "Die Vakanz bleibt unverändert."].filter(Boolean).join(" ");
  const confirm = [`${displayNo.assignment(id)} «${a.title}» endgültig löschen?`, `${lost[0].toUpperCase()}${lost.slice(1)} werden mitgelöscht.`, kept].filter(Boolean).join("\n\n");

  return (
    <>
      <PageHeader
        title={`${a.title} bearbeiten`}
        crumbs={[{ label: "Aufträge", href: "/admin/auftraege" }, { label: displayNo.assignment(id), href: `/admin/auftraege/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <AssignmentForm
          action={updateAssignment.bind(null, id)}
          values={a}
          companies={companies}
          contacts={contacts}
          vacancies={vacancies}
          settings={settings}
          cancelHref={`/admin/auftraege/${id}`}
          submitLabel="Änderungen speichern"
        />
        <Card className="border-red-200">
          <CardHeader title="Auftrag löschen" description={description} />
          <CardBody>
            <ActionButton action={deleteAssignment.bind(null, id)} confirm={confirm} variant="danger" size="md">
              Auftrag endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
