import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Columns3, List, Plus, Users } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, PageHeader, Pagination, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listMandates, listPipeline, mandateCompanyOptions, mandateStatusCounts, type MandateListRow } from "@/lib/admin/data/mandates";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { labelOf, mandatePriorities, mandateStatuses, openMandateStatuses, toneOf } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { SearchBox } from "../_shared/search-box";
import { deadlineUrgency, formatRate, groupCounts, groupStatuses, isOpenStatus, mandateGroups, parseGroup, type Urgency } from "./rules";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Mandate" };

const filterSelect =
  "h-9 max-w-52 rounded-md border border-line bg-white pr-8 pl-2.5 text-sm text-ink hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none";

/** A date with its urgency: red when overdue, amber within three days. */
function DueDate({ date, urgency }: { date: string | null; urgency: Urgency | null }) {
  if (!date) return <span className="text-slate">–</span>;
  return (
    <span className="whitespace-nowrap">
      <span className={cn(urgency?.level === "overdue" && "font-medium text-red-700", urgency?.level === "soon" && "font-medium text-amber-800")}>
        {formatDate(date)}
      </span>
      {urgency?.label ? (
        <span className={cn("block text-xs", urgency.level === "overdue" ? "text-red-700" : "text-amber-800")}>{urgency.label}</span>
      ) : null}
    </span>
  );
}

function PipelineCard({ m, today }: { m: MandateListRow; today: string }) {
  const urgency = deadlineUrgency(m.deadline, today);
  return (
    <li>
      <Link
        href={`/admin/mandate/${m.id}`}
        className="block rounded-md border border-line bg-white p-3 shadow-[0_1px_2px_rgb(11_23_51/0.04)] transition-colors hover:border-blue/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-medium text-ink">{m.title}</span>
          {m.priority === "hoch" ? <Badge tone="red">Hoch</Badge> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate">
          {m.companyName ?? "Ohne Firma"} · {displayNo.mandate(m.id)}
        </span>
        <span className="mt-2 flex items-end justify-between gap-2 text-xs text-slate">
          <span>
            Frist{" "}
            {m.deadline ? (
              <span className={cn(urgency?.level === "overdue" && "font-medium text-red-700", urgency?.level === "soon" && "font-medium text-amber-800")}>
                {formatDate(m.deadline)}
                {urgency?.label ? ` (${urgency.label})` : null}
              </span>
            ) : (
              "–"
            )}
          </span>
          <span className="inline-flex items-center gap-1" title="Vorschläge">
            <Users aria-hidden className="size-3.5" />
            <span className="tabular-nums">{m.submissionCount}</span>
            <span className="sr-only">Vorschläge</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function MandatesPage({ searchParams }: PageProps<"/admin/mandate">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const companyId = parseId(param(sp.firma)) ?? undefined;
  const priority = mandatePriorities.some((p) => p.value === param(sp.prioritaet)) ? param(sp.prioritaet) : undefined;
  const pipeline = param(sp.ansicht) === "pipeline";
  const group = parseGroup(param(sp.status));
  const page = pageNumber(param(sp.seite));
  const filter = { q, companyId, priority };
  const today = todayIso();

  const [companyChoices, perStatus, list, board] = await Promise.all([
    mandateCompanyOptions(),
    mandateStatusCounts(filter),
    pipeline ? null : listMandates({ ...filter, statuses: groupStatuses(group), page }),
    pipeline ? listPipeline(filter) : null,
  ]);
  const counts = groupCounts(perStatus);
  const filtered = Boolean(q || companyId || priority);
  // Every link on this page keeps the search and filters.
  const base = { q, firma: companyId, prioritaet: priority };
  const statusParam = group === "offen" ? undefined : group;

  return (
    <>
      <PageHeader
        title="Mandate und Vakanzen"
        description="Anfragen und Ausschreibungen der Auftraggeber, passende Kandidaten und Vorschläge."
        actions={
          <LinkButton href={companyId ? `/admin/mandate/neu?firma=${companyId}` : "/admin/mandate/neu"} variant="primary" icon={Plus}>
            Mandat erfassen
          </LinkButton>
        }
      />
      {pipeline ? null : (
        <Tabs
          items={mandateGroups.map((g) => ({
            label: g.label,
            href: listHref("/admin/mandate", { ...base, status: g.value === "offen" ? undefined : g.value }),
            active: group === g.value,
            count: counts[g.value],
          }))}
        />
      )}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
          <SearchBox
            action="/admin/mandate"
            defaultValue={q}
            placeholder="Titel, Firma, Endkunde"
            hidden={{ status: pipeline ? undefined : statusParam, ansicht: pipeline ? "pipeline" : undefined }}
          >
            <label htmlFor="mandate-firma" className="sr-only">
              Firma
            </label>
            <select id="mandate-firma" name="firma" defaultValue={companyId ? String(companyId) : ""} className={filterSelect}>
              <option value="">Alle Firmen</option>
              {companyChoices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label htmlFor="mandate-prioritaet" className="sr-only">
              Priorität
            </label>
            <select id="mandate-prioritaet" name="prioritaet" defaultValue={priority ?? ""} className={filterSelect}>
              <option value="">Alle Prioritäten</option>
              {mandatePriorities.map((p) => (
                <option key={p.value} value={p.value}>
                  Priorität {p.label.toLowerCase()}
                </option>
              ))}
            </select>
          </SearchBox>
          <nav aria-label="Ansicht" className="flex rounded-md border border-line bg-white p-0.5 text-sm">
            <Link
              href={listHref("/admin/mandate", { ...base, status: statusParam })}
              aria-current={pipeline ? undefined : "page"}
              className={cn("inline-flex h-7 items-center gap-1.5 rounded px-2.5", pipeline ? "text-slate hover:text-ink" : "bg-mist font-medium text-ink")}
            >
              <List aria-hidden className="size-4" />
              Liste
            </Link>
            <Link
              href={listHref("/admin/mandate", { ...base, ansicht: "pipeline" })}
              aria-current={pipeline ? "page" : undefined}
              className={cn("inline-flex h-7 items-center gap-1.5 rounded px-2.5", pipeline ? "bg-mist font-medium text-ink" : "text-slate hover:text-ink")}
            >
              <Columns3 aria-hidden className="size-4" />
              Pipeline
            </Link>
          </nav>
        </div>
        {filtered ? (
          <p className="flex flex-wrap items-center gap-2 border-b border-line bg-mist/40 px-5 py-2 text-[0.8125rem] text-slate">
            Gefiltert.
            <Link href={listHref("/admin/mandate", { status: statusParam, ansicht: pipeline ? "pipeline" : undefined })} className="text-blue hover:underline">
              Filter zurücksetzen
            </Link>
          </p>
        ) : null}

        {board ? (
          // relative: the absolutely positioned sr-only count text must stay inside the scroll area,
          // otherwise it widens the whole page on phones.
          <div className="relative overflow-x-auto p-4">
            <div className="grid min-w-max auto-cols-[16.5rem] grid-flow-col gap-4 xl:min-w-0 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-4">
              {openMandateStatuses.map((status) => {
                const cards = board.filter((m) => m.status === status);
                return (
                  <section key={status} aria-labelledby={`spalte-${status}`} className="flex min-w-0 flex-col rounded-lg border border-line bg-mist/60">
                    <h2 id={`spalte-${status}`} className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 text-sm font-semibold text-ink">
                      <Badge tone={toneOf(mandateStatuses, status)}>{labelOf(mandateStatuses, status)}</Badge>
                      <span className="text-xs font-medium text-slate tabular-nums">
                        {cards.length}
                        <span className="sr-only"> Mandate</span>
                      </span>
                    </h2>
                    {cards.length ? (
                      <ul className="space-y-2 px-2 pb-2">
                        {cards.map((m) => (
                          <PipelineCard key={m.id} m={m} today={today} />
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 pb-3 text-xs text-slate">Keine Mandate.</p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ) : list && list.rows.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="px-3">Mandat</Th>
                  <Th className="px-3">Firma / Endkunde</Th>
                  <Th className="px-3">Start / Pensum</Th>
                  <Th align="right" className="px-3">Satz</Th>
                  <Th className="px-3">Frist</Th>
                  <Th align="right" className="px-3">
                    <span title="Vorschläge">Vorschl.</span>
                  </Th>
                  <Th className="px-3">Nächster Schritt</Th>
                  <Th className="px-3">Status / Priorität</Th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((m) => {
                  const active = isOpenStatus(m.status);
                  return (
                    <tr key={m.id} className="hover:bg-mist/50">
                      <Td className="min-w-48 px-3">
                        <Link href={`/admin/mandate/${m.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {m.title}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap gap-x-2">
                          <Mono>{displayNo.mandate(m.id)}</Mono>
                          {m.reference ? <Mono>Ref. {m.reference}</Mono> : null}
                        </div>
                      </Td>
                      <Td className="min-w-32 px-3">
                        {m.companyId && m.companyName ? (
                          <Link href={`/admin/firmen/${m.companyId}`} className="text-ink hover:text-blue hover:underline">
                            {m.companyName}
                          </Link>
                        ) : (
                          <span className="text-slate">–</span>
                        )}
                        {m.endClient ? <span className="block text-xs text-slate">für {m.endClient}</span> : null}
                      </Td>
                      <Td className="px-3 whitespace-nowrap">
                        {formatDate(m.startDate)}
                        <span className="block text-xs text-slate">{m.workload ? `${m.workload} %` : "Pensum offen"}</span>
                      </Td>
                      <Td align="right" className="px-3 whitespace-nowrap">
                        {formatRate(m.rateSell, m.rateUnit, true)}
                      </Td>
                      <Td className="px-3">
                        <DueDate date={m.deadline} urgency={deadlineUrgency(m.deadline, today, active)} />
                      </Td>
                      <Td align="right" className="px-3">
                        {m.submissionCount}
                      </Td>
                      <Td className="min-w-36 px-3">
                        {m.nextStep ? <span className="line-clamp-2">{m.nextStep}</span> : <span className="text-slate">–</span>}
                        {m.nextStepAt ? (
                          <span className="block text-xs">
                            <DueDate date={m.nextStepAt} urgency={deadlineUrgency(m.nextStepAt, today, active)} />
                          </span>
                        ) : null}
                      </Td>
                      <Td className="px-3">
                        <span className="flex flex-col items-start gap-1">
                          <Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>
                          <span className={cn("text-xs", m.priority === "hoch" ? "font-medium text-red-700" : "text-slate")}>
                            Priorität {labelOf(mandatePriorities, m.priority).toLowerCase()}
                          </span>
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageCount={Math.ceil(list.total / PAGE_SIZE)}
              hrefFor={(p) => listHref("/admin/mandate", { ...base, status: statusParam, seite: p })}
            />
          </>
        ) : (
          <EmptyState
            icon={Briefcase}
            title={filtered ? "Kein Mandat gefunden" : counts.alle ? "Keine Mandate in diesem Bereich" : "Noch keine Mandate"}
            action={
              filtered ? (
                <LinkButton href={listHref("/admin/mandate", { status: statusParam })}>Filter zurücksetzen</LinkButton>
              ) : counts.alle ? null : (
                <LinkButton href="/admin/mandate/neu" variant="primary" icon={Plus}>
                  Erstes Mandat erfassen
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Andere Suche versuchen oder Filter zurücksetzen."
              : counts.alle
                ? "Wechsle zu einem anderen Bereich oder zu «Alle»."
                : "Erfasse Anfragen und Ausschreibungen von Auftraggebern wie GHR Group oder Coopers, um passende Kandidaten zu finden."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
