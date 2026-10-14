import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle2, ChevronRight, Clock, IdCard, Pencil } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, LinkButton, Notice } from "@/components/admin/ui";
import { CardValuesView } from "@/components/portal/profile-view";
import { PortalHeading } from "@/components/portal/ui";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { profileCards, type CardState } from "@/lib/portal/change-requests";
import { cardTitles, isPortalCard, portalCards } from "@/lib/portal/profile";
import { requireCandidate } from "@/lib/portal/session";
import { withdrawCardChange } from "../actions";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Profil" };

const descriptions: Partial<Record<CardState["card"], string>> = {
  firma: "KOVALI arbeitet mit Fachleuten über ihre eigene GmbH oder AG zusammen.",
  verfuegbarkeit: "Ab wann und zu welchen Bedingungen Sie für Projekte zur Verfügung stehen.",
};

function ProfileCard({ state }: { state: CardState }) {
  const { card, pending } = state;
  const missingFirm = card === "firma" && !state.current.firm && !pending;
  return (
    <section id={card} aria-labelledby={`${card}-titel`} className="scroll-mt-32 rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 id={`${card}-titel`} className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
            {cardTitles[card]}
            {pending ? <Badge tone="amber">Nicht bestätigt</Badge> : null}
          </h2>
          {descriptions[card] ? <p className="mt-0.5 text-sm text-slate">{descriptions[card]}</p> : null}
        </div>
        <LinkButton href={`/portal/profil/${card}`} size="sm" icon={Pencil}>
          {missingFirm ? (state.draft ? "Ergänzen" : "Erfassen") : "Bearbeiten"}
        </LinkButton>
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {pending ? (
          <>
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>
                Ihre Änderung vom {formatDateTime(state.submittedAt)} ist noch nicht bestätigt. KOVALI prüft sie und übernimmt sie dann in Ihr Profil.
              </p>
            </div>
            <CardValuesView card={card} values={pending} />
            {state.message ? (
              <p className="rounded-md bg-mist px-3 py-2 text-sm text-slate">
                <span className="font-medium text-ink">Ihre Bemerkung:</span> {state.message}
              </p>
            ) : null}
            <details className="group rounded-lg border border-line">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
                Bisher bestätigt (zum Vergleich)
              </summary>
              <div className="border-t border-line px-3.5 py-3">
                <CardValuesView card={card} values={state.current} />
              </div>
            </details>
            {state.openId ? (
              <ActionButton
                action={withdrawCardChange.bind(null, card, state.openId)}
                confirm={`Ihre Änderung bei «${cardTitles[card]}» zurückziehen? Es gelten dann wieder die bestätigten Angaben.`}
                variant="ghost"
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Änderung zurückziehen
              </ActionButton>
            ) : null}
          </>
        ) : (
          <>
            {state.rejected ? (
              <Notice tone="red" icon={AlertTriangle} title={`Ihre letzte Änderung wurde am ${formatDate(state.rejected.at)} nicht übernommen`}>
                {state.rejected.note ?? "Bitte wenden Sie sich bei Fragen an KOVALI."}
              </Notice>
            ) : null}
            {missingFirm && state.draft ? (
              <>
                <Notice tone="amber" icon={Building2} title="Bitte ergänzen Sie die Angaben Ihrer Firma">
                  Bevor KOVALI Ihr Profil für eine Vakanz vorschlagen kann, braucht es die vollständigen Angaben Ihrer Firma: GmbH oder AG, UID und Adresse. Bisher
                  erfasst:
                </Notice>
                <CardValuesView card={card} values={state.draft} />
              </>
            ) : missingFirm ? (
              <Notice tone="amber" icon={Building2} title="Firma noch nicht erfasst">
                Bevor KOVALI Ihr Profil für eine Vakanz vorschlagen kann, braucht es Ihre Firma (GmbH oder AG).
              </Notice>
            ) : (
              <CardValuesView card={card} values={state.current} />
            )}
            {state.confirmedAt && !state.rejected ? (
              <p className="flex items-center gap-1.5 text-[0.8125rem] text-slate">
                <CheckCircle2 aria-hidden className="size-3.5 text-emerald-600" />
                Zuletzt bestätigt am {formatDate(state.confirmedAt)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default async function ProfilePage({ searchParams }: PageProps<"/portal/profil">) {
  const session = await requireCandidate();
  const state = await profileCards(session.candidateId);
  if (!state) notFound();
  const sp = await searchParams;
  const saved = isPortalCard(sp.gespeichert) ? sp.gespeichert : null;
  const pendingCount = portalCards.filter((c) => state.cards[c].pending).length;

  return (
    <>
      <PortalHeading
        title="Mein Profil"
        description="Halten Sie Ihr Profil aktuell. Änderungen erscheinen als «Nicht bestätigt», bis KOVALI sie geprüft und übernommen hat."
      />
      <div className="space-y-4 sm:space-y-5">
        {saved ? (
          <Notice tone="green" icon={CheckCircle2} title={`«${cardTitles[saved]}» gespeichert`}>
            Ihre Änderung ist bei KOVALI angekommen und bis zur Prüfung als «Nicht bestätigt» markiert.
          </Notice>
        ) : pendingCount ? (
          <Notice tone="amber" icon={Clock}>
            {pendingCount === 1 ? "Eine Änderung wartet" : `${pendingCount} Änderungen warten`} auf die Bestätigung durch KOVALI.
          </Notice>
        ) : null}
        <Link
          href="/portal/stammdaten"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(11_23_51/0.04)] transition-colors hover:border-blue/40 sm:px-5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-blue">
            <IdCard aria-hidden className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink">Stammdaten</span>
            <span className="block text-sm text-slate">Name, Adresse, Telefon, E-Mail und Geburtsdatum ansehen oder eine Änderung melden</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-slate" />
        </Link>
        {portalCards.map((card) => (
          <ProfileCard key={card} state={state.cards[card]} />
        ))}
      </div>
    </>
  );
}
