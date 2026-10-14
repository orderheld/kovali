import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmClock, FileSignature, Pencil } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Mono, Notice, PageHeader, TagList } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { candidateOptions } from "@/lib/admin/data/lookups";
import { getMandate, matchCandidateRow, matchPool } from "@/lib/admin/data/mandates";
import { listHref, param } from "@/lib/admin/data/query";
import { candidateWithdrawals, firmOf, listMandateShares, listMandateSubmissions, subcontractorCheck } from "@/lib/admin/data/submissions";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, formatDateTime, todayIso } from "@/lib/admin/format";
import { matchCandidate, rankCandidates } from "@/lib/admin/matching";
import { kovaliVatRegistered } from "@/lib/admin/party";
import {
  disciplines,
  labelOf,
  mandateKinds,
  mandatePriorities,
  mandateSources,
  mandateStatuses,
  remoteOptions,
  seniorities,
  toneOf,
} from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { setMandateStatus } from "../actions";
import { MatchingCard, type MatchItem } from "../_components/matching-card";
import { PortalCard } from "../_components/portal-card";
import type { ShareChoice } from "../_components/portal-forms";
import { ScrollTo } from "../_components/scroll-to";
import { StatusControl } from "../_components/status-control";
import { SubmissionsCard } from "../_components/submissions-card";
import { deadlineUrgency, formatRate, isOpenStatus, suggestedShareIds, topMatches, type Urgency } from "../rules";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

/** Matches shown in the list; a candidate opened from the candidate page is added on top. */
const MATCH_LIMIT = 20;

export async function generateMetadata({ params }: PageProps<"/admin/mandate/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.mandate(id) : "Mandat" };
}

function UrgentText({ date, urgency }: { date: string | null; urgency: Urgency | null }) {
  if (!date) return <>–</>;
  return (
    <span className={cn(urgency?.level === "overdue" && "font-medium text-red-700", urgency?.level === "soon" && "font-medium text-amber-800")}>
      {formatDate(date)}
      {urgency?.label ? ` (${urgency.label})` : null}
    </span>
  );
}

export default async function MandatePage({ params, searchParams }: PageProps<"/admin/mandate/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const mandate = await getMandate(id);
  if (!mandate) notFound();
  const sp = await searchParams;
  const highlightId = parseId(param(sp.kandidat));
  const showAll = param(sp.ohneFirma) === "1";
  const today = todayIso();
  // Without its own VAT number KOVALI cannot reclaim the subcontractor's VAT: margins count it as cost.
  const vatRegistered = kovaliVatRegistered();

  const [pool, submissions, shares, people, highlightRow] = await Promise.all([
    matchPool(),
    listMandateSubmissions(id),
    listMandateShares(id),
    candidateOptions(),
    highlightId ? matchCandidateRow(highlightId) : null,
  ]);

  // Matching: profiles only go through the candidate's own firm, so by default only those count.
  const hasFirm = new Map(pool.map((c) => [c.id, subcontractorCheck(firmOf(c)).ok]));
  const rankedAll = rankCandidates(pool, mandate, today, { kovaliVatRegistered: vatRegistered });
  const ranked = showAll ? rankedAll : rankedAll.filter((r) => hasFirm.get(r.candidate.id));
  const top = topMatches(ranked, MATCH_LIMIT, highlightId);
  let items: MatchItem[] = top.items;
  if (highlightId && !top.highlighted) {
    // Not in the filtered ranking (no own firm, or archived): computed separately, shown on top.
    const extra =
      rankedAll.find((r) => r.candidate.id === highlightId) ??
      (highlightRow ? { candidate: highlightRow, match: matchCandidate(highlightRow, mandate, today, { kovaliVatRegistered: vatRegistered }) } : null);
    if (extra) items = [extra, ...items.slice(0, MATCH_LIMIT - 1)];
  }
  const withdrawals = await candidateWithdrawals([...new Set([...items.map((i) => i.candidate.id), ...submissions.map((s) => s.candidateId)])]);

  // Portal sharing: everybody not yet shared; good matches with own firm preselected.
  const shared = new Set(shares.map((s) => s.candidateId));
  const scores = new Map(rankedAll.map((r) => [r.candidate.id, r.match.score]));
  const suggested = new Set(suggestedShareIds(rankedAll.filter((r) => hasFirm.get(r.candidate.id)), shared));
  const choices: ShareChoice[] = people
    .filter((p) => !shared.has(p.value))
    .map((p) => ({ value: p.value, label: p.label, score: scores.get(p.value) ?? null, suggested: suggested.has(p.value), noFirm: !hasFirm.get(p.value) }))
    .sort((a, b) => Number(b.suggested) - Number(a.suggested) || (a.suggested ? (b.score ?? 0) - (a.score ?? 0) : 0));

  const active = isOpenStatus(mandate.status);
  const deadline = deadlineUrgency(mandate.deadline, today, active);
  const nextStep = deadlineUrgency(mandate.nextStepAt, today, active);
  const owner = { type: "mandate" as const, id };
  const toggleHref = `${listHref(`/admin/mandate/${id}`, { kandidat: highlightId, ohneFirma: showAll ? undefined : 1 })}#kandidaten`;
  const contractHref = `/admin/vertraege/neu?mandat=${id}${mandate.companyId ? `&firma=${mandate.companyId}` : ""}`;
  const period = [mandate.startDate ? `ab ${formatDate(mandate.startDate)}` : null, mandate.endDate ? `bis ${formatDate(mandate.endDate)}` : null]
    .filter(Boolean)
    .join(" ");
  const sections = [
    { href: "#anforderungen", label: "Anforderungen" },
    { href: "#kandidaten", label: "Kandidaten" },
    { href: "#vorschlaege", label: `Vorschläge (${submissions.length})` },
    { href: "#portal", label: `Portal (${shares.length})` },
    { href: "#verlauf", label: "Verlauf" },
    { href: "#dokumente", label: "Dokumente" },
  ];

  return (
    <>
      {highlightId ? <ScrollTo targetId={`kandidat-${highlightId}`} /> : null}
      <PageHeader
        title={mandate.title}
        crumbs={[{ label: "Mandate", href: "/admin/mandate" }, { label: displayNo.mandate(id) }]}
        meta={
          <>
            <Badge tone={toneOf(mandateStatuses, mandate.status)}>{labelOf(mandateStatuses, mandate.status)}</Badge>
            {mandate.priority !== "normal" ? (
              <Badge tone={toneOf(mandatePriorities, mandate.priority)}>Priorität {labelOf(mandatePriorities, mandate.priority).toLowerCase()}</Badge>
            ) : null}
            <Mono>{displayNo.mandate(id)}</Mono>
            {mandate.reference ? <Mono>Ref. {mandate.reference}</Mono> : null}
            {mandate.companyId && mandate.companyName ? (
              <Link href={`/admin/firmen/${mandate.companyId}`} className="text-sm font-medium text-blue hover:underline">
                {mandate.companyName}
              </Link>
            ) : (
              <span className="text-sm text-slate">Keine Firma zugeordnet</span>
            )}
          </>
        }
        actions={
          <>
            <StatusControl label="Status des Mandats" options={mandateStatuses} value={mandate.status} action={setMandateStatus.bind(null, id)} size="md" />
            <LinkButton href={contractHref} icon={FileSignature}>
              Vertrag erstellen
            </LinkButton>
            <LinkButton href={`/admin/mandate/${id}/bearbeiten`} variant="primary" icon={Pencil}>
              Bearbeiten
            </LinkButton>
          </>
        }
      />

      {deadline && deadline.level !== "later" ? (
        <Notice tone={deadline.level === "overdue" ? "red" : "amber"} icon={AlarmClock} className="mb-4">
          Eingabefrist {deadline.label}: {formatDate(mandate.deadline)}.
        </Notice>
      ) : null}
      {nextStep && nextStep.level !== "later" && mandate.nextStep ? (
        <Notice tone={nextStep.level === "overdue" ? "red" : "amber"} icon={AlarmClock} className="mb-4">
          Nächster Schritt {nextStep.label}: {mandate.nextStep}
        </Notice>
      ) : null}

      <nav aria-label="Abschnitte" className="mb-6 overflow-x-auto">
        <ul className="flex min-w-max gap-1.5 text-[0.8125rem]">
          {sections.map((s) => (
            <li key={s.href}>
              <a href={s.href} className="inline-flex h-8 items-center rounded-full border border-line bg-white px-3 text-slate hover:border-slate/40 hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <div id="anforderungen" className="scroll-mt-20">
            <Card>
              <CardHeader
                title="Anforderungen"
                actions={
                  <LinkButton href={`/admin/mandate/${id}/bearbeiten`} size="sm" variant="ghost" icon={Pencil}>
                    Bearbeiten
                  </LinkButton>
                }
              />
              <CardBody>
                <DescriptionList
                  columns={3}
                  items={[
                    {
                      label: "Beschreibung",
                      value: mandate.description ? <span className="block max-h-96 overflow-y-auto whitespace-pre-line">{mandate.description}</span> : "–",
                      wide: true,
                    },
                    { label: "Schwerpunkte", value: <TagList items={mandate.disciplines.map((d) => labelOf(disciplines, d))} />, wide: true },
                    { label: "Muss-Kompetenzen", value: <TagList items={mandate.requiredSkills} tone="blue" />, wide: true },
                    { label: "Kann-Kompetenzen", value: <TagList items={mandate.niceSkills} />, wide: true },
                    { label: "Seniorität", value: labelOf(seniorities, mandate.seniority) },
                    {
                      label: "Einsatzort",
                      value: [mandate.location, mandate.remote ? labelOf(remoteOptions, mandate.remote) : null].filter(Boolean).join(", ") || "–",
                    },
                    { label: "Pensum", value: mandate.workload ? `${mandate.workload} %` : "–" },
                    { label: "Zeitraum", value: [period, mandate.durationText].filter(Boolean).join(", ") || "–" },
                    { label: "Verkaufssatz", value: formatRate(mandate.rateSell, mandate.rateUnit) },
                    { label: "Eingabefrist", value: <UrgentText date={mandate.deadline} urgency={deadline} /> },
                    {
                      label: "Nächster Schritt",
                      value: mandate.nextStep ? (
                        <>
                          {mandate.nextStep}
                          {mandate.nextStepAt ? (
                            <span className="block text-sm">
                              <UrgentText date={mandate.nextStepAt} urgency={nextStep} />
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "–"
                      ),
                    },
                    { label: "Endkunde", value: mandate.endClient ?? "–" },
                    {
                      label: "Kontakt",
                      value: mandate.contact ? (
                        <>
                          {[mandate.contact.firstName, mandate.contact.lastName].filter(Boolean).join(" ")}
                          {mandate.contact.role ? <span className="block text-sm text-slate">{mandate.contact.role}</span> : null}
                          {mandate.contact.email ? (
                            <a href={`mailto:${mandate.contact.email}`} className="block text-sm text-blue hover:underline">
                              {mandate.contact.email}
                            </a>
                          ) : null}
                          {mandate.contact.phone ? <span className="block text-sm">{mandate.contact.phone}</span> : null}
                        </>
                      ) : (
                        "–"
                      ),
                    },
                    { label: "Art", value: labelOf(mandateKinds, mandate.kind) },
                    { label: "Quelle", value: labelOf(mandateSources, mandate.source) },
                    {
                      label: mandate.closedAt ? "Abgeschlossen" : "Erfasst",
                      value: formatDateTime(mandate.closedAt ?? mandate.createdAt),
                    },
                    ...(mandate.notes ? [{ label: "Notizen", value: <span className="whitespace-pre-line">{mandate.notes}</span>, wide: true }] : []),
                  ]}
                />
              </CardBody>
            </Card>
          </div>

          <div id="kandidaten" className="scroll-mt-20">
            <MatchingCard
              mandateId={id}
              items={items}
              rankedCount={ranked.length}
              poolSize={pool.length}
              hiddenWithoutFirm={showAll ? 0 : rankedAll.length - ranked.length}
              showAll={showAll}
              highlightId={highlightId}
              hasCriteria={mandate.requiredSkills.length > 0 || mandate.disciplines.length > 0}
              submissionByCandidate={new Map(submissions.map((s) => [s.candidateId, { id: s.id, status: s.status }]))}
              withdrawals={withdrawals}
              toggleHref={toggleHref}
            />
          </div>

          <div id="vorschlaege" className="scroll-mt-20">
            <SubmissionsCard
              submissions={submissions}
              mandate={{ id, companyId: mandate.companyId, companyName: mandate.companyName }}
              withdrawals={withdrawals}
              today={today}
              kovaliVatRegistered={vatRegistered}
            />
          </div>

          <div id="portal" className="scroll-mt-20">
            <PortalCard mandate={mandate} shares={shares} submissions={submissions} choices={choices} kovaliVatRegistered={vatRegistered} />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div id="verlauf" className="scroll-mt-20">
            <ActivityFeed owner={owner} />
          </div>
          <div id="dokumente" className="scroll-mt-20">
            <DocumentsCard owner={owner} defaultKind="anforderung" />
          </div>
        </div>
      </div>
    </>
  );
}
