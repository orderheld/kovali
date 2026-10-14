import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCompany, getContact } from "@/lib/admin/data/companies";
import { parseId } from "@/lib/admin/forms";
import { displayNo } from "@/lib/admin/format";
import { updateContact } from "../../../actions";
import { ContactForm } from "../../../contact-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Kontakt bearbeiten" };

export default async function EditContactPage({ params }: PageProps<"/admin/firmen/[id]/kontakt/[kontaktId]">) {
  await requireAdmin();
  const p = await params;
  const id = parseId(p.id);
  const contactId = parseId(p.kontaktId);
  if (!id || !contactId) notFound();
  const [company, contact] = await Promise.all([getCompany(id), getContact(id, contactId)]);
  if (!company || !contact) notFound();
  return (
    <>
      <PageHeader
        title="Kontakt bearbeiten"
        description={company.name}
        crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: displayNo.company(id), href: `/admin/firmen/${id}` }, { label: "Kontakt" }]}
      />
      <div className="max-w-4xl">
        <ContactForm action={updateContact.bind(null, id, contactId)} contact={contact} cancelHref={`/admin/firmen/${id}`} />
      </div>
    </>
  );
}
