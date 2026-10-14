import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmClock, Briefcase, Calculator, CheckCircle2, ExternalLink, Mail, Pencil, Phone, Plus, TextQuote } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Mono, Notice, PageHeader, TagList } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getMandate, vacancyAssignments } from "@/lib/admin/data/mandates";
import { snippetsForCompany } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, formatDateTime, todayIso } from "@/lib/admin/format";
import {
  assignmentStatuses,
  labelOf,
  mandateKinds,
  mandatePriorities,
  mandateSources,
  mandateStatuses,
  remoteOptions,
  toneOf,
  type DocumentKind,
} from "@/lib/admin/options";
import { formatTextStats, previewText, textStats } from "@/lib/admin/texts";
import { dueState, formatRate, isOpenStatus, quickActions, rechnerHref } from "@/lib/admin/vacancy-rules";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { completeNextStep, saveNextStep, setVacancyStatus } from "../actions";
import { DueBadge, DueDate } from "../_components/due";
import { NextStepForm } from "../_components/next-step-form";
import { StatusControl } from "../_components/status-control";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/vakanzen/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.mandate(id) : "Vakanz" };
}

/** Document kind preselected for an upload, following the stage of the application. */
function uploadKind(status: string): DocumentKind {
  if (status === "neu") return "ausschreibung";
  if (status === "in_bearbeitung") return "bewerbung";
  return "korrespondenz";
}

export default async function VacancyPage({ params }: PageProps<"/admin/vakanzen/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const vacancy = await getMandate(id);
  if (!vacancy) notFound();
  const [snippets, assignments] = await Promise.all([snippetsForCompany(vacancy.companyId), vacancyAssignments(id)]);

  const today = todayIso();
  const active = isOpenStatus(vacancy.status);
  const won = vacancy.status === "gewonnen";
  const owner = { type: "mandate" as const, id };
  // The deadline only matters until the application is out.
  const deadline = dueState(vacancy.deadline, today, active && !vacancy.appliedAt);
  const nextStepDue = dueState(vacancy.nextStepAt, today, active);
  const calculator = rechnerHref(vacancy);
  const newAssignmentHref = `/admin/auftraege/neu?vakanz=${id}`;
  const actions = quickActions(vacancy.status, vacancy.appliedAt);
  const period = [vacancy.startDate ? `ab ${formatDate(vacancy.startDate)}` : null, vacancy.endDate ? `bis ${formatDate(vacancy.endDate)}` : null]
    .filter(Boolean)
    .join(" ");
  const editHref = `/admin/vakanzen/${id}/bearbeiten`;

  return (
    <>
      <PageHeader
        title={vacancy.title}
        crumbs={[{ label: "Vakanzen", href: "/admin/vakanzen" }, { label: displayNo.mandate(id) }]}
        meta={
          <>
            <Badge tone={toneOf(mandateStatuses, vacancy.status)}>{labelOf(mandateStatuses, vacancy.status)}</Badge>
            {vacancy.priority !== "normal" ? (
              <Badge tone={toneOf(mandatePriorities, vacancy.priority)}>Priorität {labelOf(mandatePriorities, vacancy.priority).toLowerCase()}</Badge>
            ) : null}
            <Mono>{displayNo.mandate(id)}</Mono>
            {vacancy.reference ? <Mono>Stellen-Nr. {vacancy.reference}</Mono> : null}
            {vacancy.companyId && vacancy.companyName ? (
              <Link href={`/admin/firmen/${vacancy.companyId}`} className="text-sm font-medium text-blue hover:underline">
                {vacancy.companyName}
              </Link>
            ) : (
              <span className="text-sm text-slate">Keine Firma zugeordnet</span>
            )}
            {vacancy.endClient ? <span className="text-sm text-slate">für {vacancy.endClient}</span> : null}
          </>
        }
        actions={
          <>
            {vacancy.url ? (
              <LinkButton href={vacancy.url} target="_blank" icon={ExternalLink}>
                Ausschreibung öffnen
              </LinkButton>
            ) : null}
            {won ? (
              <LinkButton href={newAssignmentHref} variant="primary" icon={Briefcase}>
                Auftrag erfassen
              </LinkButton>
            ) : null}
            <LinkButton href={editHref} variant={won ? "secondary" : "primary"} icon={Pencil}>
              Bearbeiten
            </LinkButton>
          </>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-sm text-slate">
            {vacancy.appliedAt ? (
              <>
                Beworben am <span className="font-medium text-ink">{formatDate(vacancy.appliedAt)}</span>
              </>
            ) : active ? (
              "Noch nicht beworben."
            ) : (
              <>Status: {labelOf(mandateStatuses, vacancy.status)}</>
            )}
            {vacancy.closedAt ? <> · abgeschlossen am {formatDate(vacancy.closedAt)}</> : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((a) => (
              <ActionButton key={a.status} action={setVacancyStatus.bind(null, id, a.status)} variant={a.primary ? "primary" : "secondary"} size="md">
                {a.label}
              </ActionButton>
            ))}
            <StatusControl label="Status ändern" options={mandateStatuses} value={vacancy.status} action={setVacancyStatus.bind(null, id)} size="md" />
          </div>
        </div>
      </Card>

      {deadline && (deadline.level === "overdue" || deadline.level === "today" || deadline.level === "soon") ? (
        <Notice tone={deadline.level === "overdue" ? "red" : "amber"} icon={AlarmClock} className="mb-4">
          Eingabefrist {deadline.level === "overdue" ? `verpasst (${deadline.label})` : deadline.label}: {formatDate(vacancy.deadline)}.
        </Notice>
      ) : null}
      {won && !assignments.length ? (
        <Notice tone="green" icon={CheckCircle2} className="mb-4" title="Zusage erhalten">
          Erfasse den Auftrag, damit Satz, Pensum und Zeitraum in deine Übersicht kommen.{" "}
          <Link href={newAssignmentHref} className="font-medium text-blue hover:underline">
            Auftrag erfassen
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Eckdaten"
              actions={
                calculator ? (
                  <LinkButton href={calculator} size="sm" icon={Calculator}>
                    Durchrechnen
                  </LinkButton>
                ) : null
              }
            />
            <CardBody>
              <DescriptionList
                columns={3}
                items={[
                  { label: "Satz laut Ausschreibung", value: formatRate(vacancy.rateSell, vacancy.rateUnit) },
                  { label: "Pensum", value: vacancy.workload ? `${vacancy.workload} %` : "–" },
                  {
                    label: "Einsatzort",
                    value: [vacancy.location, vacancy.remote ? labelOf(remoteOptions, vacancy.remote) : null].filter(Boolean).join(", ") || "–",
                  },
                  { label: "Zeitraum", value: [period, vacancy.durationText].filter(Boolean).join(", ") || "–" },
                  { label: "Eingabefrist", value: <DueDate date={vacancy.deadline} today={today} active={active && !vacancy.appliedAt} /> },
                  ...(vacancy.contact
                    ? [
                        {
                          label: "Kontakt",
                          value: (
                            <>
                              {[vacancy.contact.firstName, vacancy.contact.lastName].filter(Boolean).join(" ")}
                              {vacancy.contact.role ? <span className="block text-sm text-slate">{vacancy.contact.role}</span> : null}
                              {vacancy.contact.email ? (
                                <a href={`mailto:${vacancy.contact.email}`} className="flex items-center gap-1 text-sm text-blue hover:underline">
                                  <Mail aria-hidden className="size-3.5" />
                                  {vacancy.contact.email}
                                </a>
                              ) : null}
                              {vacancy.contact.phone ? (
                                <a href={`tel:${vacancy.contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-sm text-blue hover:underline">
                                  <Phone aria-hidden className="size-3.5" />
                                  {vacancy.contact.phone}
                                </a>
                              ) : null}
                            </>
                          ),
                        },
                      ]
                    : []),
                  { label: "Art", value: labelOf(mandateKinds, vacancy.kind) },
                  ...(vacancy.source ? [{ label: "Quelle", value: labelOf(mandateSources, vacancy.source) }] : []),
                  ...(vacancy.url
                    ? [
                        {
                          label: "Link zur Ausschreibung",
                          value: (
                            <a href={vacancy.url} target="_blank" rel="noopener" className="inline-flex max-w-full items-center gap-1 text-blue hover:underline">
                              <span className="truncate">{vacancy.url.replace(/^https?:\/\//, "")}</span>
                              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                            </a>
                          ),
                          wide: true,
                        },
                      ]
                    : []),
                  ...(vacancy.notes ? [{ label: "Notizen", value: <span className="whitespace-pre-line">{vacancy.notes}</span>, wide: true }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <ApplicationCard text={vacancy.applicationText} editHref={`${editHref}#bewerbung`} />

          <Card>
            <CardHeader title="Ausschreibung" />
            <CardBody className="space-y-4">
              {vacancy.description ? (
                <div className="max-h-96 overflow-y-auto text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{vacancy.description}</div>
              ) : (
                <p className="text-sm text-slate">
                  Kein Ausschreibungstext.{" "}
                  <Link href={editHref} className="text-blue hover:underline">
                    Text einfügen
                  </Link>{" "}
                  oder die Ausschreibung als PDF unter Dokumente ablegen.
                </p>
              )}
              {vacancy.requiredSkills.length ? (
                <div>
                  <p className="mb-1.5 text-[0.8125rem] text-slate">Verlangte Kompetenzen</p>
                  <TagList items={vacancy.requiredSkills} tone="blue" />
                </div>
              ) : null}
              {vacancy.niceSkills.length ? (
                <div>
                  <p className="mb-1.5 text-[0.8125rem] text-slate">Weitere Kompetenzen</p>
                  <TagList items={vacancy.niceSkills} />
                </div>
              ) : null}
              <p className="text-xs text-slate">
                Erfasst am {formatDateTime(vacancy.createdAt)}, zuletzt geändert am {formatDateTime(vacancy.updatedAt)}.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Textbausteine"
              icon={TextQuote}
              description={vacancy.companyName ? `Für ${vacancy.companyName} und angeheftete.` : "Angeheftete Textbausteine."}
              actions={
                <LinkButton href={vacancy.companyId ? `/admin/texte/neu?firma=${vacancy.companyId}` : "/admin/texte/neu"} size="sm" icon={Plus}>
                  Neuer Textbaustein
                </LinkButton>
              }
            />
            {snippets.length ? (
              <ul className="divide-y divide-line">
                {snippets.map((s) => (
                  <li key={s.id} className="flex gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/admin/texte/${s.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {s.title}
                        </Link>
                        {s.category ? <Badge>{s.category}</Badge> : null}
                        {s.pinned ? <Badge tone="blue">Angeheftet</Badge> : null}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[0.8125rem] whitespace-pre-line text-slate">{previewText(s.body, 200)}</p>
                    </div>
                    <CopyButton value={s.body} label={`«${s.title}» kopieren`} iconOnly className="shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">
                  {vacancy.companyName
                    ? `Noch keine Textbausteine für ${vacancy.companyName}. Lege zum Beispiel dein Kurzprofil für diesen Vermittler an, oder hefte einen Textbaustein an, damit er hier erscheint.`
                    : "Hefte Textbausteine an, die du bei jeder Bewerbung brauchst, damit sie hier erscheinen."}
                </p>
              </CardBody>
            )}
          </Card>

          {won || assignments.length ? (
            <Card>
              <CardHeader
                title="Aufträge aus dieser Vakanz"
                icon={Briefcase}
                actions={
                  <LinkButton href={newAssignmentHref} size="sm" variant={assignments.length ? "secondary" : "primary"} icon={Plus}>
                    Auftrag erfassen
                  </LinkButton>
                }
              />
              {assignments.length ? (
                <ul className="divide-y divide-line">
                  {assignments.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                      <Link href={`/admin/auftraege/${a.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                        {a.title}
                      </Link>
                      <Mono>{displayNo.assignment(a.id)}</Mono>
                      {a.companyName ? <span className="text-xs text-slate">{a.companyName}</span> : null}
                      <span className="text-xs text-slate">
                        {formatDate(a.startDate)} – {a.endDate ? formatDate(a.endDate) : "offen"}
                      </span>
                      <Badge tone={toneOf(assignmentStatuses, a.status)}>{labelOf(assignmentStatuses, a.status)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-slate">Noch kein Auftrag erfasst. Titel, Firma, Satz und Pensum werden aus der Vakanz übernommen.</p>
                </CardBody>
              )}
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Nächster Schritt"
              icon={AlarmClock}
              actions={
                vacancy.nextStep ? (
                  <ActionButton action={completeNextStep.bind(null, id)} icon={<CheckCircle2 aria-hidden className="size-4" />}>
                    Erledigt
                  </ActionButton>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              {vacancy.nextStep ? (
                <div>
                  <p className="text-[0.9375rem] font-medium text-ink">{vacancy.nextStep}</p>
                  {vacancy.nextStepAt ? (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate">
                      bis {formatDate(vacancy.nextStepAt)}
                      <DueBadge due={nextStepDue} />
                    </p>
                  ) : null}
                </div>
              ) : null}
              {/* Keyed by the saved values, so the fields show them again after saving or "Erledigt". */}
              <NextStepForm
                key={`${vacancy.nextStep ?? ""}|${vacancy.nextStepAt ?? ""}`}
                action={saveNextStep.bind(null, id)}
                nextStep={vacancy.nextStep}
                nextStepAt={vacancy.nextStepAt}
              />
            </CardBody>
          </Card>
          <DocumentsCard
            owner={owner}
            defaultKind={uploadKind(vacancy.status)}
            description="Ausschreibung, gesendeter Lebenslauf, Offerte und Korrespondenz. Verschlüsselt gespeichert, jeder Abruf wird protokolliert."
          />
          <ActivityFeed owner={owner} />
        </div>
      </div>
    </>
  );
}

/** The application text, read-only, with a copy button. */
function ApplicationCard({ text, editHref }: { text: string | null; editHref: string }) {
  return (
    <Card>
      <CardHeader
        title="Bewerbungstext"
        description={text ? formatTextStats(textStats(text)) : undefined}
        actions={
          text ? (
            <>
              <LinkButton href={editHref} size="sm" variant="ghost" icon={Pencil}>
                Bearbeiten
              </LinkButton>
              <CopyButton value={text} label="Text kopieren" variant="primary" />
            </>
          ) : null
        }
      />
      <CardBody>
        {text ? (
          <div className="max-h-[32rem] overflow-y-auto rounded-md border border-line bg-mist/40 px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink">
            {text}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate">Noch kein Bewerbungstext. Leg ihn hier ab, dann kopierst du ihn beim Bewerben mit einem Klick.</p>
            <LinkButton href={editHref} size="sm" icon={Pencil}>
              Text schreiben
            </LinkButton>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
