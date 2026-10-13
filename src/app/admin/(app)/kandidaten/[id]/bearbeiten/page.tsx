import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCandidate } from "@/lib/admin/data/candidates";
import { companyOptions } from "@/lib/admin/data/companies";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { deleteCandidate, updateCandidate } from "../../actions";
import { CandidateForm } from "../../candidate-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/kandidaten/[id]/bearbeiten">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? `${displayNo.candidate(id)} bearbeiten` : "Kandidat bearbeiten" };
}

export default async function EditCandidatePage({ params }: PageProps<"/admin/kandidaten/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [candidate, ownFirms] = await Promise.all([getCandidate(id), companyOptions(["subunternehmer"])]);
  if (!candidate) notFound();
  // A linked firm whose kind was changed since stays visible, so saving does not drop the
  // link silently; the server then asks for a subcontractor firm.
  const companyChoices =
    candidate.companyId && !ownFirms.some((o) => o.value === candidate.companyId)
      ? [
          ...(await companyOptions())
            .filter((o) => o.value === candidate.companyId)
            .map((o) => ({ ...o, label: `${o.label} (kein Subunternehmer)` })),
          ...ownFirms,
        ]
      : ownFirms;
  const name = `${candidate.firstName} ${candidate.lastName}`;
  return (
    <>
      <PageHeader
        title={`${name} bearbeiten`}
        crumbs={[{ label: "Kandidaten", href: "/admin/kandidaten" }, { label: displayNo.candidate(id), href: `/admin/kandidaten/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-5xl space-y-6">
        <CandidateForm action={updateCandidate.bind(null, id)} candidate={candidate} cancelHref={`/admin/kandidaten/${id}`} companyChoices={companyChoices} />
        <Card className="border-red-200">
          <CardHeader
            title="Kandidat löschen"
            description="Löscht das Profil endgültig, mit Lebensläufen, Dokumenten, Notizen, Vorschlägen und dem Portal-Zugang. Verträge bleiben, verlieren aber die Zuordnung. Das lässt sich nicht rückgängig machen."
          />
          <CardBody>
            <ActionButton
              action={deleteCandidate.bind(null, id)}
              confirm={`«${name}» mit allen Dokumenten, Notizen und Vorschlägen endgültig löschen?`}
              variant="danger"
              size="md"
            >
              Kandidat endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
