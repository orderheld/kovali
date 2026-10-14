import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/admin/ui";
import { ASSIGNMENT_NOTE } from "@/components/portal/constants";
import { Chips, PortalHeading } from "@/components/portal/ui";
import { formatChf, formatDate } from "@/lib/admin/format";
import { labelOf, rateUnits, remoteOptions } from "@/lib/admin/options";
import { requireCandidate } from "@/lib/portal/session";
import { listVisibleVacancies, type PortalVacancy } from "@/lib/portal/vacancies";
import { vacancyTitle } from "@/lib/portal/vacancy-rules";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vakanzen" };

function ResponseBadge({ v }: { v: PortalVacancy }) {
  if (v.response === "interessiert") return <Badge tone="green">Interesse gemeldet</Badge>;
  if (v.response === "kein_interesse") return <Badge tone="neutral">Kein Interesse</Badge>;
  if (!v.seenAt) return <Badge tone="blue">Neu</Badge>;
  return null;
}

function VacancyCard({ v }: { v: PortalVacancy }) {
  const skills = v.requiredSkills ?? [];
  return (
    <li>
      <Link
        href={`/portal/vakanzen/${v.id}`}
        className="group block rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] transition-colors hover:border-blue/40 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.0625rem] font-semibold text-ink group-hover:text-blue">{vacancyTitle(v)}</h2>
              <ResponseBadge v={v} />
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate">
              {v.location || v.remote ? (
                <li className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5" />
                  {[v.location, v.remote ? labelOf(remoteOptions, v.remote) : null].filter(Boolean).join(", ")}
                </li>
              ) : null}
              {v.workload ? (
                <li className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden className="size-3.5" />
                  {v.workload} %
                </li>
              ) : null}
              {v.startDate || v.durationText ? (
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {[v.startDate ? `ab ${formatDate(v.startDate)}` : null, v.durationText].filter(Boolean).join(", ")}
                </li>
              ) : null}
            </ul>
          </div>
          <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-slate group-hover:text-blue" />
        </div>
        {skills.length ? (
          <div className="mt-3">
            <Chips items={skills.slice(0, 6)} />
          </div>
        ) : null}
        <p className="mt-3 border-t border-line pt-3 text-sm text-ink">
          {v.portalRate ? (
            <>
              <span className="font-semibold">
                {formatChf(v.portalRate)} {labelOf(rateUnits, v.portalRateUnit ?? "stunde")}
              </span>
              <span className="text-slate"> für Ihre Firma, exkl. MWST</span>
            </>
          ) : (
            <span className="text-slate">Satz auf Anfrage</span>
          )}
        </p>
      </Link>
    </li>
  );
}

export default async function VacanciesPage() {
  const session = await requireCandidate();
  const vacancies = await listVisibleVacancies(session.candidateId);
  const open = vacancies.filter((v) => v.response !== "kein_interesse");
  const declined = vacancies.filter((v) => v.response === "kein_interesse");

  return (
    <>
      <PortalHeading
        title="Vakanzen"
        description="Projektmandate, für die KOVALI Fachleute sucht. Ihr Profil geht nur an einen Auftraggeber, wenn Sie bei der jeweiligen Vakanz einwilligen."
      />
      <p className="mb-5 flex gap-2.5 rounded-lg border border-blue/20 bg-blue/[0.05] px-4 py-3 text-sm text-ink">
        <Briefcase aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
        {ASSIGNMENT_NOTE}. Vertragspartner Ihrer Firma ist KOVALI.
      </p>
      {vacancies.length ? (
        <div className="space-y-8">
          {open.length ? (
            <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {open.map((v) => (
                <VacancyCard key={v.id} v={v} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-slate">Keine weiteren offenen Vakanzen.</p>
          )}
          {declined.length ? (
            <section aria-labelledby="abgelehnt">
              <h2 id="abgelehnt" className="mb-3 text-sm font-semibold text-slate">
                Kein Interesse gemeldet
              </h2>
              <ul className="grid gap-3 opacity-80 sm:gap-4 lg:grid-cols-2">
                {declined.map((v) => (
                  <VacancyCard key={v.id} v={v} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <Briefcase aria-hidden className="mx-auto size-8 text-slate/60" />
          <p className="mt-3 font-medium text-ink">Zurzeit keine Vakanzen für Sie</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate">
            Sobald KOVALI ein Projektmandat hat, das zu Ihrem Profil passen könnte, erscheint es hier. Ein aktuelles Profil hilft dabei.
          </p>
        </div>
      )}
    </>
  );
}
