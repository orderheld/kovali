import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Info, Lock, XCircle } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Notice } from "@/components/admin/ui";
import { Facts, PortalHeading } from "@/components/portal/ui";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { candidateRequests } from "@/lib/portal/change-requests";
import { portalCandidate } from "@/lib/portal/data";
import { requireCandidate } from "@/lib/portal/session";
import { withdrawStammdaten } from "../actions";
import { StammdatenForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Stammdaten" };

const DELETION_MESSAGE =
  "Löschung meiner Daten: Bitte löschen Sie meine Daten bei KOVALI und meinen Zugang zum Kandidatenportal, soweit keine gesetzliche Aufbewahrungspflicht besteht.";

export default async function StammdatenPage({ searchParams }: PageProps<"/portal/stammdaten">) {
  const session = await requireCandidate();
  const [person, requests] = await Promise.all([portalCandidate(session.candidateId), candidateRequests(session.candidateId)]);
  if (!person) notFound();
  const sp = await searchParams;
  const { open, lastReviewed } = requests.stammdaten;
  const showReviewed = lastReviewed && (!open || (lastReviewed.reviewedAt && lastReviewed.reviewedAt > open.createdAt));
  const address = [person.street, [person.postalCode, person.city].filter(Boolean).join(" "), person.country && person.country !== "Schweiz" ? person.country : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl">
      <PortalHeading
        title="Stammdaten"
        description="Diese Angaben pflegt KOVALI für Sie. Stimmt etwas nicht mehr, melden Sie die Änderung hier."
        back={{ href: "/portal/profil", label: "Zum Profil" }}
      />
      <div className="space-y-4 sm:space-y-5">
        <section aria-labelledby="stammdaten-titel" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="stammdaten-titel" className="flex-1 text-base font-semibold text-ink">
              Ihre Angaben
            </h2>
            <span className="inline-flex items-center gap-1 text-[0.8125rem] text-slate">
              <Lock aria-hidden className="size-3.5" />
              Nur lesen
            </span>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <Facts
              items={[
                { label: "Vorname", value: person.firstName },
                { label: "Nachname", value: person.lastName },
                { label: "E-Mail", value: person.email },
                { label: "Telefon", value: person.phone },
                { label: "Geburtsdatum", value: person.dateOfBirth ? formatDate(person.dateOfBirth) : null },
                { label: "Wohnadresse", value: address },
              ]}
            />
            <p className="mt-4 flex gap-2 text-[0.8125rem] text-slate">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Die E-Mail-Adresse für die Anmeldung sehen Sie unter Konto. Sie kann von dieser Kontaktadresse abweichen.
            </p>
          </div>
        </section>

        {open ? (
          <Notice tone="amber" icon={Clock} title={`Ihre Meldung vom ${formatDateTime(open.updatedAt)} ist noch offen`}>
            <p className="whitespace-pre-line">{open.message}</p>
            <div className="mt-2">
              <ActionButton
                action={withdrawStammdaten.bind(null, open.id)}
                confirm="Ihre offene Meldung zurückziehen?"
                variant="ghost"
                className="-ml-3 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Meldung zurückziehen
              </ActionButton>
            </div>
          </Notice>
        ) : null}
        {showReviewed && lastReviewed?.reviewedAt ? (
          lastReviewed.status === "abgelehnt" ? (
            <Notice tone="red" icon={XCircle} title={`Ihre Meldung vom ${formatDate(lastReviewed.createdAt)} wurde nicht übernommen`}>
              {lastReviewed.reviewNote ?? "Bitte wenden Sie sich bei Fragen an KOVALI."}
            </Notice>
          ) : (
            <Notice tone="green" icon={CheckCircle2} title={`Ihre Meldung wurde am ${formatDate(lastReviewed.reviewedAt)} erledigt`}>
              {lastReviewed.reviewNote ?? null}
            </Notice>
          )
        ) : null}

        <section aria-labelledby="melden-titel" className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:p-6">
          <h2 id="melden-titel" className="text-base font-semibold text-ink">
            Änderung melden
          </h2>
          <p className="mt-1 mb-5 text-sm text-slate">
            {open ? "Ihre Nachricht wird der offenen Meldung angefügt." : "Beschreiben Sie kurz, was sich geändert hat. KOVALI passt die Angaben nach der Prüfung an."}
          </p>
          <StammdatenForm defaultMessage={sp.nachricht === "loeschung" ? DELETION_MESSAGE : undefined} />
        </section>
      </div>
    </div>
  );
}
