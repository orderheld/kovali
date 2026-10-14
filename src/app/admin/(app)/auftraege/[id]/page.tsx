import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, CircleCheck, FilePlus2, FileSignature, Mail, Pencil, Phone, Play } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, EmptyState, LinkButton, Mono, Notice, PageHeader, StatTile } from "@/components/admin/ui";
import { formatPeriod, periodStatus } from "@/lib/admin/assignment-period";
import { requireAdmin } from "@/lib/admin/auth/session";
import { assignmentContracts, getAssignment } from "@/lib/admin/data/assignments";
import { loadEarningsSettings } from "@/lib/admin/data/earnings";
import { listHref } from "@/lib/admin/data/query";
import { assignmentEarningsInput, computeEarnings, formatHours, formatRate, modelLabel } from "@/lib/admin/earnings";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatChf, formatDate, todayIso } from "@/lib/admin/format";
import { assignmentStatuses, contractKinds, contractStatuses, labelOf, mandateStatuses, remoteOptions, toneOf } from "@/lib/admin/options";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { EarningsBreakdown } from "../../_shared/earnings-breakdown";
import { setAssignmentStatus } from "../actions";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/auftraege/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.assignment(id) : "Auftrag" };
}

export default async function AssignmentPage({ params }: PageProps<"/admin/auftraege/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const [detail, linkedContracts, { settings }] = await Promise.all([getAssignment(id), assignmentContracts(id), loadEarningsSettings()]);
  if (!detail) notFound();
  const a = detail.assignment;
  const today = todayIso();
  const input = assignmentEarningsInput(a);
  const earnings = input ? computeEarnings(input, settings) : null;
  const period = periodStatus(a, today);
  const owner = { type: "assignment" as const, id };
  const contactName = [detail.contactFirstName, detail.contactLastName].filter(Boolean).join(" ");
  const calculatorHref = listHref("/admin/rechner", {
    satz: a.rateAmount,
    einheit: a.rateUnit,
    pensum: a.workload,
    modell: a.billing,
    basis: a.billing === "lohn" ? a.rateBasis : null,
    stunden: a.hoursPerMonth,
    spesen: a.expensesMonthly || null,
  });

  return (
    <>
      <PageHeader
        title={a.title}
        crumbs={[{ label: "Aufträge", href: "/admin/auftraege" }, { label: displayNo.assignment(id) }]}
        meta={
          <>
            <Badge tone={toneOf(assignmentStatuses, a.status)}>{labelOf(assignmentStatuses, a.status)}</Badge>
            <Badge tone="blue">{modelLabel(a.billing, a.rateBasis)}</Badge>
            {period ? <Badge tone={period.tone}>{period.text}</Badge> : null}
            <Mono>{displayNo.assignment(id)}</Mono>
          </>
        }
        actions={
          <>
            {a.status === "geplant" ? (
              <ActionButton action={setAssignmentStatus.bind(null, id, "laufend")} size="md" icon={<Play aria-hidden className="size-4" />}>
                Auftrag starten
              </ActionButton>
            ) : a.status === "laufend" ? (
              <ActionButton
                action={setAssignmentStatus.bind(null, id, "beendet")}
                confirm="Diesen Auftrag als beendet markieren?"
                size="md"
                icon={<CircleCheck aria-hidden className="size-4" />}
              >
                Als beendet markieren
              </ActionButton>
            ) : null}
            {a.rateAmount ? (
              <LinkButton href={calculatorHref} icon={Calculator}>
                Durchrechnen
              </LinkButton>
            ) : null}
            <LinkButton href={`/admin/auftraege/${id}/bearbeiten`} variant="primary" icon={Pencil}>
              Bearbeiten
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Was dir bleibt"
              description={
                earnings
                  ? `${formatHours(earnings.hoursPerMonth)} pro Monat${earnings.hoursOverridden ? ", von dir festgelegt" : ` bei ${a.workload} % Pensum`}.`
                  : undefined
              }
              actions={
                <LinkButton href="/admin/rechner?ansicht=annahmen" size="sm" variant="ghost">
                  Annahmen
                </LinkButton>
              }
            />
            {earnings ? (
              <>
                <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <StatTile
                    label={a.billing === "lohn" ? (a.rateBasis === "kostensatz" ? "Kostensatz" : "Satz all-in") : "Satz ohne MWST"}
                    value={formatRate(a.rateAmount, a.rateUnit)}
                    hint={a.rateUnit === "tag" ? `${formatChf(earnings.revenue.hourly)} pro Stunde` : a.billing === "lohn" ? "Lohn über Payroll" : "Rechnung über die Einzelfirma"}
                  />
                  <StatTile label="Einnahmen pro Monat" value={formatChf(earnings.revenue.month, { round: true })} hint={`${formatChf(earnings.revenue.year, { round: true })} pro Jahr`} />
                  <StatTile
                    label="Bleibt dir pro Monat"
                    value={<span className={earnings.net.month < 0 ? "text-red-700" : "text-blue-700"}>{formatChf(earnings.net.month, { round: true })}</span>}
                    hint={`${formatChf(earnings.net.hourly)} pro Stunde`}
                  />
                  <StatTile label="Bleibt dir pro Jahr" value={formatChf(earnings.net.year, { round: true })} hint="über 12 Monate verteilt" />
                </div>
                {earnings.notices.length ? (
                  <div className="space-y-2 px-5 pt-4">
                    {earnings.notices.map((n) => (
                      <Notice key={n} tone="amber">
                        {n}
                      </Notice>
                    ))}
                  </div>
                ) : null}
                <EarningsBreakdown earnings={earnings} />
              </>
            ) : (
              <EmptyState
                icon={Calculator}
                title="Noch kein Satz erfasst"
                action={
                  <LinkButton href={`/admin/auftraege/${id}/bearbeiten`} variant="primary" icon={Pencil}>
                    Satz erfassen
                  </LinkButton>
                }
              >
                Mit Satz und Abrechnung siehst du hier, was dir pro Monat und Jahr bleibt.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader title="Angaben" />
            <CardBody>
              <DescriptionList
                columns={3}
                items={[
                  {
                    label: "Vertragspartner",
                    value: a.companyId ? (
                      <Link href={`/admin/firmen/${a.companyId}`} className="text-blue hover:underline">
                        {detail.companyName}
                      </Link>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Endkunde", value: a.endClient ?? "–" },
                  {
                    label: "Ansprechperson",
                    value: contactName ? (
                      <span>
                        {contactName}
                        {detail.contactRole ? <span className="block text-xs text-slate">{detail.contactRole}</span> : null}
                        <span className="mt-1 flex flex-wrap gap-x-3 text-[0.8125rem]">
                          {detail.contactEmail ? (
                            <a href={`mailto:${detail.contactEmail}`} className="inline-flex items-center gap-1 text-blue hover:underline">
                              <Mail aria-hidden className="size-3.5" />
                              E-Mail
                            </a>
                          ) : null}
                          {detail.contactPhone ? (
                            <a href={`tel:${detail.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-blue hover:underline">
                              <Phone aria-hidden className="size-3.5" />
                              {detail.contactPhone}
                            </a>
                          ) : null}
                        </span>
                      </span>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Zeitraum", value: formatPeriod(a.startDate, a.endDate) },
                  { label: "Pensum", value: `${a.workload} %` },
                  { label: "Stunden pro Monat", value: a.hoursPerMonth ? `${formatHours(a.hoursPerMonth)} (festgelegt)` : earnings ? `${formatHours(earnings.hoursPerMonth)} (aus Pensum)` : "–" },
                  { label: "Satz", value: formatRate(a.rateAmount, a.rateUnit) },
                  { label: "Abrechnung", value: modelLabel(a.billing, a.rateBasis) },
                  { label: "Eigene Spesen", value: a.expensesMonthly ? `${formatChf(a.expensesMonthly)} pro Monat` : "–" },
                  { label: "Arbeitsort", value: [a.location, a.remote ? labelOf(remoteOptions, a.remote) : null].filter(Boolean).join(", ") || "–" },
                  {
                    label: "Aus Vakanz",
                    value: a.mandateId ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/vakanzen/${a.mandateId}`} className="text-blue hover:underline">
                          {displayNo.mandate(a.mandateId)} {detail.mandateTitle}
                        </Link>
                        {detail.mandateStatus ? <Badge tone={toneOf(mandateStatuses, detail.mandateStatus)}>{labelOf(mandateStatuses, detail.mandateStatus)}</Badge> : null}
                      </span>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Erfasst", value: formatDate(a.createdAt) },
                  { label: "Notizen", value: a.notes ? <span className="whitespace-pre-line">{a.notes}</span> : "–", wide: true },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Verträge"
              description="Rahmenvertrag, Einzelauftrag oder Arbeitsvertrag zu diesem Auftrag."
              actions={
                <LinkButton href={`/admin/vertraege/neu?auftrag=${id}`} size="sm" icon={FilePlus2}>
                  Vertrag ablegen
                </LinkButton>
              }
            />
            {linkedContracts.length ? (
              <ul className="divide-y divide-line">
                {linkedContracts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                    <FileSignature aria-hidden className="size-4 shrink-0 text-blue" />
                    <Link href={`/admin/vertraege/${c.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                      {c.title}
                      <span className="block text-xs font-normal text-slate">{labelOf(contractKinds, c.kind)}</span>
                    </Link>
                    <Mono>{c.number}</Mono>
                    <span className="text-xs text-slate">{c.validUntil ? `bis ${formatDate(c.validUntil)}` : c.validFrom ? `ab ${formatDate(c.validFrom)}` : "ohne Laufzeit"}</span>
                    <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">Noch kein Vertrag abgelegt. Lege den unterschriebenen Vertrag mit Laufzeit und Kündigungsfrist ab.</p>
              </CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <DocumentsCard owner={owner} defaultKind="rapport" description="Rapporte, Rechnungen, Lohnabrechnungen. Verschlüsselt gespeichert, jeder Abruf wird protokolliert." />
          <ActivityFeed owner={owner} />
        </div>
      </div>
    </>
  );
}
