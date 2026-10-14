import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Briefcase, Building2, CheckCircle2, ChevronRight, Clock, FileText, KeyRound, Mail, PartyPopper, UserRound } from "lucide-react";
import { Badge, Notice } from "@/components/admin/ui";
import { ASSIGNMENT_NOTE } from "@/components/portal/constants";
import { site } from "@/config/site";
import { formatDate } from "@/lib/admin/format";
import { profileCards } from "@/lib/portal/change-requests";
import { pendingUploadCount, portalCandidate } from "@/lib/portal/data";
import { cardTitles, portalCards } from "@/lib/portal/profile";
import { requireCandidate } from "@/lib/portal/session";
import { listVisibleVacancies } from "@/lib/portal/vacancies";
import { vacancyTitle } from "@/lib/portal/vacancy-rules";
import { cn } from "@/lib/utils";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every(isEmpty);
  return false;
}

function Tile({
  href,
  icon: Icon,
  value,
  label,
  hint,
  highlight,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  value: number;
  label: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(11_23_51/0.04)] transition-colors hover:border-blue/40 sm:flex-col sm:items-start sm:gap-2 sm:p-5",
        highlight ? "border-blue/30" : "border-line",
      )}
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", highlight ? "bg-blue text-white" : "bg-mist text-blue")}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink tabular-nums">{value}</span>
          <span className="text-[0.9375rem] font-medium text-ink">{label}</span>
        </span>
        <span className="block text-sm text-slate">{hint}</span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-slate sm:hidden" />
    </Link>
  );
}

export default async function OverviewPage({ searchParams }: PageProps<"/portal">) {
  const session = await requireCandidate();
  const [person, cards, uploadsPending, vacancies] = await Promise.all([
    portalCandidate(session.candidateId),
    profileCards(session.candidateId),
    pendingUploadCount(session.candidateId),
    listVisibleVacancies(session.candidateId),
  ]);
  if (!person || !cards) notFound();
  const sp = await searchParams;

  const pendingCards = portalCards.filter((c) => cards.cards[c].pending);
  const newVacancies = vacancies.filter((v) => !v.seenAt);
  const firm = cards.cards.firma;
  const firmMissing = !firm.current.firm && !firm.pending;
  const emptyCards = portalCards.filter((c) => c !== "firma" && !cards.cards[c].pending && isEmpty(cards.cards[c].current));
  const stammdatenOpen = cards.stammdaten.open;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <p className="eyebrow mb-2">Kandidatenportal</p>
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight text-ink sm:text-3xl">Guten Tag, {person.firstName}</h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-slate">
          Hier pflegen Sie Ihr Profil, sehen Projektmandate, die zu Ihnen passen könnten, und entscheiden selbst, für welche KOVALI Ihr Profil weitergeben darf.
        </p>
      </header>

      {sp.willkommen === "1" ? (
        <Notice tone="green" icon={PartyPopper} title="Willkommen im Kandidatenportal">
          Ihr Zugang ist eingerichtet. Prüfen Sie am besten zuerst Ihr Profil und ergänzen Sie, was fehlt.
        </Notice>
      ) : null}
      {sp.passwort === "neu" ? (
        <Notice tone="green" icon={KeyRound}>
          Ihr neues Passwort ist gespeichert. Auf anderen Geräten wurden Sie abgemeldet.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Tile
          href="/portal/vakanzen"
          icon={Briefcase}
          value={newVacancies.length}
          label={newVacancies.length === 1 ? "neue Vakanz" : "neue Vakanzen"}
          hint={vacancies.length ? `${vacancies.length} offen für Sie sichtbar` : "Derzeit keine offenen Vakanzen"}
          highlight={newVacancies.length > 0}
        />
        <Tile
          href="/portal/profil"
          icon={UserRound}
          value={pendingCards.length}
          label="nicht bestätigt"
          hint={pendingCards.length ? "Änderungen warten auf KOVALI" : "Ihr Profil ist auf dem bestätigten Stand"}
        />
        <Tile
          href="/portal/dokumente"
          icon={FileText}
          value={uploadsPending}
          label={uploadsPending === 1 ? "Dokument in Prüfung" : "Dokumente in Prüfung"}
          hint={uploadsPending ? "KOVALI prüft Ihre Uploads" : "Keine offenen Uploads"}
        />
      </div>

      {firmMissing ? (
        <Notice tone="amber" icon={Building2} title="Bitte erfassen Sie Ihre Firma">
          <p>
            KOVALI arbeitet mit Fachleuten über ihre eigene GmbH oder AG zusammen. Bevor KOVALI Ihr Profil für eine Vakanz vorschlagen kann, braucht es Ihre Firma.
          </p>
          <Link href="/portal/profil/firma" className="mt-2 inline-flex items-center gap-1 font-medium text-blue-700 underline-offset-2 hover:underline">
            Firma erfassen <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <section aria-labelledby="profilstand" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)] lg:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="profilstand" className="text-base font-semibold text-ink">
              Stand Ihres Profils
            </h2>
            <Link href="/portal/profil" className="text-sm font-medium text-blue hover:underline">
              Zum Profil
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {portalCards.map((card) => {
              const state = cards.cards[card];
              const empty = card === "firma" ? firmMissing : emptyCards.includes(card);
              return (
                <li key={card}>
                  <Link href={`/portal/profil#${card}`} className="flex items-center gap-3 px-4 py-3 hover:bg-mist/60 sm:px-5">
                    <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{cardTitles[card]}</span>
                    {state.pending ? (
                      <Badge tone="amber">Nicht bestätigt</Badge>
                    ) : empty ? (
                      <Badge tone="neutral">Noch leer</Badge>
                    ) : state.rejected ? (
                      <Badge tone="red">Nicht übernommen</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.8125rem] text-emerald-700">
                        <CheckCircle2 aria-hidden className="size-3.5" />
                        Bestätigt
                      </span>
                    )}
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-slate" />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/portal/stammdaten" className="flex items-center gap-3 px-4 py-3 hover:bg-mist/60 sm:px-5">
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">Stammdaten</span>
                {stammdatenOpen ? (
                  <Badge tone="amber">Meldung offen</Badge>
                ) : (
                  <span className="text-[0.8125rem] text-slate">Nur lesen</span>
                )}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-slate" />
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="neueste" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)] lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="neueste" className="text-base font-semibold text-ink">
              Vakanzen
            </h2>
            <Link href="/portal/vakanzen" className="text-sm font-medium text-blue hover:underline">
              Alle ansehen
            </Link>
          </div>
          {vacancies.length ? (
            <ul className="divide-y divide-line">
              {vacancies.slice(0, 4).map((v) => (
                <li key={v.id}>
                  <Link href={`/portal/vakanzen/${v.id}`} className="block px-4 py-3 hover:bg-mist/60 sm:px-5">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 font-medium text-ink">{vacancyTitle(v)}</span>
                      {!v.seenAt ? <Badge tone="blue">Neu</Badge> : v.response === "interessiert" ? <Badge tone="green">Interessiert</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate">
                      {[v.location, v.workload ? `${v.workload} %` : null, v.startDate ? `ab ${formatDate(v.startDate)}` : null].filter(Boolean).join(" · ") || "Details ansehen"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-slate sm:px-5">
              Zurzeit gibt es keine Vakanz für Sie. Sobald KOVALI ein passendes Projektmandat hat, erscheint es hier.
            </p>
          )}
          <p className="border-t border-line px-4 py-3 text-[0.8125rem] text-slate sm:px-5">{ASSIGNMENT_NOTE}.</p>
        </section>
      </div>

      {emptyCards.length || stammdatenOpen ? (
        <div className="space-y-3">
          {emptyCards.length ? (
            <Notice tone="blue" icon={Clock}>
              Noch leer: {emptyCards.map((c) => cardTitles[c]).join(", ")}. Ein vollständiges Profil hilft KOVALI, passende Projekte für Sie zu finden.
            </Notice>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="ablauf" className="rounded-xl bg-navy px-5 py-6 text-white sm:px-8 sm:py-8">
        <h2 id="ablauf" className="text-lg font-semibold">
          So arbeiten wir zusammen
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            ["Profil pflegen", "Sie halten Profil, Verfügbarkeit und Dokumente aktuell. KOVALI prüft Änderungen und übernimmt sie."],
            ["Interesse melden", "Bei jeder Vakanz entscheiden Sie selbst. Ihr Profil geht nur mit Ihrer Einwilligung für genau dieses Mandat an den Auftraggeber."],
            ["Projekteinsatz", "Kommt es zum Einsatz, arbeiten Sie über Ihre eigene GmbH oder AG als Subunternehmen von KOVALI."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold tabular-nums">{i + 1}</span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-white/75">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-sm text-white/80">
          <Mail aria-hidden className="size-4" />
          Fragen? {site.contact.person},{" "}
          <a href={`mailto:${site.contact.email.value}`} className="font-medium text-white underline-offset-2 hover:underline">
            {site.contact.email.value}
          </a>
        </p>
      </section>
    </div>
  );
}
