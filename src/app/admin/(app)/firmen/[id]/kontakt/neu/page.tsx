import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCompany } from "@/lib/admin/data/companies";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { createContact } from "../../../actions";
import { ContactForm } from "../../../contact-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neuer Kontakt" };

export default async function NewContactPage({ params }: PageProps<"/admin/firmen/[id]/kontakt/neu">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const company = await getCompany(id);
  if (!company) notFound();
  return (
    <>
      <PageHeader
        title="Neuer Kontakt"
        description={company.name}
        crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: displayNo.company(id), href: `/admin/firmen/${id}` }, { label: "Neuer Kontakt" }]}
      />
      <div className="max-w-4xl">
        <ContactForm action={createContact.bind(null, id)} cancelHref={`/admin/firmen/${id}`} />
      </div>
    </>
  );
}
