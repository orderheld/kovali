import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { count, eq, isNotNull, and } from "drizzle-orm";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { getMandate } from "@/lib/admin/data/mandates";
import { getDb } from "@/lib/admin/db/client";
import { submissions } from "@/lib/admin/db/schema";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { deleteMandate, updateMandate } from "../../actions";
import { MandateForm } from "../../mandate-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Mandat bearbeiten" };

export default async function EditMandatePage({ params }: PageProps<"/admin/mandate/[id]/bearbeiten">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const mandate = await getMandate(id);
  if (!mandate) notFound();
  const db = await getDb();
  const [companies, contacts, [proposed]] = await Promise.all([
    companyOptions(),
    contactOptions(),
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.mandateId, id), isNotNull(submissions.submittedAt))),
  ]);
  const sent = proposed?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Mandat bearbeiten"
        description={mandate.title}
        crumbs={[{ label: "Mandate", href: "/admin/mandate" }, { label: displayNo.mandate(id), href: `/admin/mandate/${id}` }, { label: "Bearbeiten" }]}
      />
      <div className="max-w-4xl space-y-6">
        <MandateForm
          action={updateMandate.bind(null, id)}
          mandate={mandate}
          companies={companies.map(({ value, label }) => ({ value, label }))}
          contacts={contacts}
          cancelHref={`/admin/mandate/${id}`}
        />
        <Card className="border-red-200">
          <CardHeader
            title="Mandat löschen"
            description={
              <>
                Vorschläge, Freigaben im Kandidatenportal, Notizen und Dokumente des Mandats werden mitgelöscht, auch Verlaufseinträge, die bei Kandidaten
                zu diesem Mandat stehen. Verträge bleiben, verlieren aber die Zuordnung.
                {sent ? ` Bereits ${sent === 1 ? "ein Profil" : `${sent} Profile`} vorgeschlagen: Für die Nachvollziehbarkeit ist «Zurückgezogen» oder «Verloren» meist besser.` : null}
              </>
            }
          />
          <CardBody>
            <ActionButton
              action={deleteMandate.bind(null, id)}
              confirm={`Mandat ${displayNo.mandate(id)} mit allen Vorschlägen, Notizen und Dokumenten endgültig löschen?`}
              variant="danger"
              size="md"
            >
              Mandat endgültig löschen
            </ActionButton>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
