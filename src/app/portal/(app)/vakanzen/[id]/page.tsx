import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Calculator, CheckCircle2, Info, Send, XCircle } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Notice } from "@/components/admin/ui";
import { ASSIGNMENT_NOTE, RATE_NOTE } from "@/components/portal/constants";
import { SeenRefresh } from "@/components/portal/seen-refresh";
import { Chips, Facts, PortalHeading } from "@/components/portal/ui";
import { displayNo, formatChf, formatDate, formatDateTime } from "@/lib/admin/format";
import { parseId } from "@/lib/admin/forms";
import { labelOf, rateUnits, remoteOptions, seniorities } from "@/lib/admin/options";
import { sectionState } from "@/lib/portal/change-requests";
import { hasConfirmedFirm } from "@/lib/portal/data";
import { disciplineLabels } from "@/lib/portal/profile";
import { requireCandidate } from "@/lib/portal/session";
import { getVisibleVacancy, markVacancySeen } from "@/lib/portal/vacancies";
import { rateExample, vacancyTitle } from "@/lib/portal/vacancy-rules";
import { markInterested, markNotInterested } from "../../actions";
import { InterestForm } from "../../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vakanz" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white px-4 py-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:px-6 sm:py-5">
      <h2 className="mb-3 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function VacancyPage({ params }: PageProps<"/portal/vakanzen/[id]">) {
  const session = await requireCandidate();
  const id = parseId((await params).id);
  if (!id) notFound();
  const vacancy = await getVisibleVacancy(session.candidateId, id);
  // Not visible, closed or not existing: all look the same.
  if (!vacancy) notFound();
  // First view: recorded during the render of the page itself (prefetching only loads the
  // static shell), so Ferhat sees who opened the vacancy.
  const firstView = !vacancy.seenAt;
  if (firstView) await markVacancySeen(session.candidateId, id);

  const [firmConfirmed, availability] = await Promise.all([hasConfirmedFirm(session.candidateId), sectionState(session.candidateId, "verfuegbarkeit")]);
  const firmPending = Boolean(availability?.pending?.firm);

  const title = vacancyTitle(vacancy);
  const reference = displayNo.mandate(vacancy.id);
  const unit = vacancy.portalRateUnit === "tag" ? "tag" : "stunde";
  const example = rateExample(vacancy.portalRate, unit, vacancy.workload);
  // Withdrawn consent does not count as interest, even if the last answer was "interessiert".
  const interested = vacancy.response === "interessiert" && Boolean(vacancy.consentAt) && !vacancy.withdrawnAt;
  // Interest again after the profile was sent and the consent withdrawn: KOVALI decides.
  const pendingRenewal = vacancy.response === "interessiert" && Boolean(vacancy.withdrawnAt && vacancy.submittedAt);
  const declined = vacancy.response === "kein_interesse";
  const recipient = `Auftraggeber von KOVALI für dieses Projektmandat (Referenz ${reference})`;

  const facts = [
    { label: "Ort", value: vacancy.location },
    { label: "Arbeitsmodell", value: vacancy.remote ? labelOf(remoteOptions, vacancy.remote) : null },
    { label: "Pensum", value: vacancy.workload ? `${vacancy.workload} %` : null },
    { label: "Start", value: vacancy.startDate ? formatDate(vacancy.startDate) : null },
    { label: "Ende", value: vacancy.endDate ? formatDate(vacancy.endDate) : null },
    { label: "Dauer", value: vacancy.durationText },
    { label: "Seniorität", value: vacancy.seniority ? labelOf(seniorities, vacancy.seniority) : null },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-3xl">
      {firstView ? <SeenRefresh /> : null}
      <PortalHeading title={title} eyebrow={`Vakanz ${reference}`} back={{ href: "/portal/vakanzen", label: "Alle Vakanzen" }} />
      <div className="space-y-4 sm:space-y-5">
        <p className="flex gap-2.5 rounded-lg border border-blue/20 bg-blue/[0.05] px-4 py-3 text-sm text-ink">
          <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
          <span>
            <span className="font-medium">{ASSIGNMENT_NOTE}.</span> Ihre Firma schliesst den Vertrag mit KOVALI ab und stellt KOVALI die geleisteten Stunden in
            Rechnung.
          </span>
        </p>

        <Section title="Eckdaten">
          {facts.length ? <Facts items={facts} /> : <p className="text-sm text-slate">KOVALI ergänzt die Eckdaten auf Anfrage.</p>}
        </Section>

        {vacancy.portalDescription ? (
          <Section title="Projekt und Aufgaben">
            <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink/90">{vacancy.portalDescription}</p>
          </Section>
        ) : null}

        {vacancy.disciplines?.length || vacancy.requiredSkills?.length || vacancy.niceSkills?.length ? (
          <Section title="Anforderungen">
            <div className="space-y-4">
              {vacancy.disciplines?.length ? (
                <div>
                  <h3 className="mb-1.5 text-[0.8125rem] font-medium text-slate">Schwerpunkte</h3>
                  <Chips items={disciplineLabels(vacancy.disciplines)} tone="blue" />
                </div>
              ) : null}
              {vacancy.requiredSkills?.length ? (
                <div>
                  <h3 className="mb-1.5 text-[0.8125rem] font-medium text-slate">Muss</h3>
                  <Chips items={vacancy.requiredSkills} />
                </div>
              ) : null}
              {vacancy.niceSkills?.length ? (
                <div>
                  <h3 className="mb-1.5 text-[0.8125rem] font-medium text-slate">Von Vorteil</h3>
                  <Chips items={vacancy.niceSkills} />
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        <section aria-labelledby="satz" className="rounded-xl border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)]">
          <div className="px-4 pt-4 sm:px-6 sm:pt-5">
            <h2 id="satz" className="text-base font-semibold text-ink">
              Satz für Ihre Firma
            </h2>
            {vacancy.portalRate ? (
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-semibold text-ink tabular-nums">{formatChf(vacancy.portalRate)}</span>
                <span className="text-[0.9375rem] text-slate">{labelOf(rateUnits, unit)}, exkl. MWST</span>
              </p>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-slate">Satz auf Anfrage. KOVALI bespricht ihn gerne mit Ihnen.</p>
            )}
          </div>
          {example ? (
            <div className="mt-4 border-t border-line bg-mist/60 px-4 py-4 sm:px-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Calculator aria-hidden className="size-4 text-blue" />
                Beispielrechnung pro Monat (Ihre Firma an KOVALI)
              </h3>
              <p className="mt-2 text-[0.9375rem] text-ink tabular-nums">{example.text}.</p>
              <p className="mt-3 text-lg font-semibold text-ink tabular-nums">
                {formatChf(example.amount)} <span className="text-sm font-normal text-slate">pro Monat, exkl. MWST</span>
              </p>
              <p className="mt-3 flex gap-2 text-[0.8125rem] text-slate">
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {RATE_NOTE}
              </p>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="antwort" className="rounded-xl border border-line bg-white px-4 py-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:px-6 sm:py-5">
          <h2 id="antwort" className="text-base font-semibold text-ink">
            Ihr Interesse
          </h2>
          <div className="mt-3 space-y-4">
            {!firmConfirmed ? (
              <Notice tone="amber" icon={Building2} title={firmPending ? "Ihre Firma wird noch geprüft" : "Firma noch nicht erfasst"}>
                <p>
                  Sie können Interesse melden. Bevor KOVALI Ihr Profil vorschlagen kann, muss Ihre Firma (GmbH oder AG) erfasst und bestätigt sein.
                </p>
                {firmPending ? null : (
                  <Link href="/portal/profil/firma" className="mt-1.5 inline-flex items-center gap-1 font-medium text-blue-700 underline-offset-2 hover:underline">
                    Firma erfassen <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                )}
              </Notice>
            ) : null}

            {vacancy.objection && !interested ? (
              <Notice tone="neutral" icon={Info} title="Keine Weitergabe Ihres Profils">
                Sie haben KOVALI mitgeteilt, dass Ihr Profil nicht weitergegeben werden soll. Möchten Sie sich für diese Vakanz melden, wenden Sie sich bitte
                direkt an KOVALI.
              </Notice>
            ) : pendingRenewal ? (
              <Notice tone="neutral" icon={Info} title={`Interesse gemeldet am ${formatDateTime(vacancy.responseAt)}`}>
                Ihr Profil wurde für diese Vakanz bereits weitergegeben, danach haben Sie Ihre Einwilligung zurückgezogen. KOVALI meldet sich bei Ihnen, bevor
                Ihr Profil für diese Vakanz wieder verwendet wird.
              </Notice>
            ) : interested ? (
              <>
                <Notice tone="green" icon={CheckCircle2} title={`Interesse gemeldet am ${formatDateTime(vacancy.responseAt ?? vacancy.consentAt)}`}>
                  <p>
                    Sie haben eingewilligt, dass KOVALI Ihr Profil für diese Vakanz an den {recipient} weitergibt. KOVALI nennt Ihnen den Auftraggeber und
                    fragt Sie nochmals, bevor Ihr Profil mit Ihrem Namen weitergegeben wird.
                  </p>
                  {vacancy.responseMessage ? <p className="mt-2 whitespace-pre-line">Ihre Nachricht: {vacancy.responseMessage}</p> : null}
                </Notice>
                {vacancy.submittedAt ? (
                  <Notice tone="blue" icon={Send}>
                    KOVALI hat Ihr Profil am {formatDate(vacancy.submittedAt)} für diese Vakanz weitergegeben.
                  </Notice>
                ) : null}
                <ActionButton
                  action={markNotInterested.bind(null, vacancy.id)}
                  confirm={
                    vacancy.submittedAt
                      ? "Interesse zurückziehen? Ihr Profil wurde bereits weitergegeben; KOVALI informiert den Auftraggeber und gibt es nicht weiter."
                      : "Interesse und Einwilligung für diese Vakanz zurückziehen?"
                  }
                  variant="ghost"
                  className="-ml-3 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  Interesse und Einwilligung zurückziehen
                </ActionButton>
              </>
            ) : (
              <>
                {declined ? (
                  <Notice tone="neutral" icon={XCircle} title={`Kein Interesse, gemeldet am ${formatDateTime(vacancy.responseAt)}`}>
                    {vacancy.submittedAt
                      ? "Ihr Profil wurde vorher bereits weitergegeben. KOVALI gibt es für diese Vakanz nicht weiter."
                      : "KOVALI gibt Ihr Profil für diese Vakanz nicht weiter. Sie können Ihre Antwort jederzeit ändern."}
                  </Notice>
                ) : (
                  <p className="text-[0.9375rem] text-slate">
                    Passt das Projekt zu Ihnen? Mit Ihrer Einwilligung schlägt KOVALI Sie dem Auftraggeber vor. KOVALI nennt Ihnen den Auftraggeber und fragt
                    Sie nochmals, bevor Ihr Profil mit Ihrem Namen weitergegeben wird.
                  </p>
                )}
                <InterestForm
                  action={markInterested.bind(null, vacancy.id)}
                  recipient={recipient}
                  defaultMessage={declined ? null : vacancy.responseMessage}
                  submitLabel={declined ? "Doch Interesse melden" : "Interesse melden"}
                />
                {declined ? null : (
                  <div className="border-t border-line pt-4">
                    <ActionButton action={markNotInterested.bind(null, vacancy.id)} variant="secondary" size="md">
                      Kein Interesse
                    </ActionButton>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
