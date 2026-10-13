import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { companyOptions } from "@/lib/admin/data/companies";
import { createCandidate } from "../actions";
import { CandidateForm } from "../candidate-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neuer Kandidat" };

export default async function NewCandidatePage() {
  await requireAdmin();
  const companyChoices = await companyOptions(["subunternehmer"]);
  return (
    <>
      <PageHeader title="Neuer Kandidat" crumbs={[{ label: "Kandidaten", href: "/admin/kandidaten" }, { label: "Neu" }]} />
      <div className="max-w-5xl">
        <CandidateForm action={createCandidate} cancelHref="/admin/kandidaten" companyChoices={companyChoices} />
      </div>
    </>
  );
}
