import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, ExternalLink, Plus, Telescope } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, Notice, PageHeader, Pagination, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { dueNextSteps, listMandates, mandateCompanyOptions, mandateStatusCounts } from "@/lib/admin/data/mandates";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { labelOf, mandateStatuses, openMandateStatuses, toneOf } from "@/lib/admin/options";
import {
  dueState,
  filterStatuses,
  formatRate,
  groupCounts,
  isOpenStatus,
  parseStatusFilter,
  sectionsByStatus,
  statusParam,
  vacancyGroups,
} from "@/lib/admin/vacancy-rules";
import { cn } from "@/lib/utils";
import { SearchBox } from "../_shared/search-box";
import { DueBadge, DueDate } from "./_components/due";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vakanzen" };

const filterSelect =
  "h-9 max-w-52 rounded-md border border-line bg-white pr-8 pl-2.5 text-sm text-ink hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none";

/** Next steps that are due today or overdue, shown above the list. */
const DUE_NOW_DAYS = 0;

export default async function VacanciesPage({ searchParams }: PageProps<"/admin/vakanzen">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const companyId = parseId(param(sp.firma)) ?? undefined;
  const filter = parseStatusFilter(param(sp.status));
  const page = pageNumber(param(sp.seite));
  const today = todayIso();
  const query = { q, companyId };
  const filtered = Boolean(q || companyId);
  const defaultView = !filtered && filter.group === "offen" && !filter.status && page === 1;

  const [companyChoices, perStatus, list, due] = await Promise.all([
    mandateCompanyOptions(),
    mandateStatusCounts(query),
    listMandates({ ...query, statuses: filterStatuses(filter), page }),
    defaultView ? dueNextSteps({ today, days: DUE_NOW_DAYS, limit: 6 }) : Promise.resolve([]),
  ]);
  const counts = groupCounts(perStatus);
  // Every link on this page keeps the search and the company filter.
  const base = { q, firma: companyId };
  const current = statusParam(filter);
  const sections = sectionsByStatus(list.rows);
  const showSections = filterStatuses(filter)?.length !== 1;

  return (
    <>
      <PageHeader
        title="Vakanzen"
        description="Stellen, auf die du dich bewirbst, vom Entdecken bis zur Zusage."
        actions={
          <LinkButton href={companyId ? `/admin/vakanzen/neu?firma=${companyId}` : "/admin/vakanzen/neu"} variant="primary" icon={Plus}>
            Vakanz erfassen
          </LinkButton>
        }
      />

      {due.length ? (
        <Notice tone="amber" icon={AlarmClock} title={due.length === 1 ? "Ein nächster Schritt ist fällig" : `${due.length} nächste Schritte sind fällig`} className="mb-6">
          <ul className="mt-1 space-y-1">
            {due.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link href={`/admin/vakanzen/${d.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                  {d.nextStep ?? "Nächster Schritt"}
                </Link>
                <span className="text-slate">
                  {d.title}
                  {d.companyName ? `, ${d.companyName}` : ""}
                </span>
                <DueBadge due={dueState(d.nextStepAt, today)} />
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <Tabs
        items={vacancyGroups.map((g) => ({
          label: g.label,
          href: listHref("/admin/vakanzen", { ...base, status: g.value === "offen" ? undefined : g.value }),
          active: filter.group === g.value,
          count: counts[g.value],
        }))}
      />

      <Card>
        <div className="space-y-3 border-b border-line px-5 py-3">
          <SearchBox action="/admin/vakanzen" defaultValue={q} placeholder="Titel, Firma, Endkunde, Kompetenz" hidden={{ status: current }}>
            {companyChoices.length ? (
              <>
                <label htmlFor="vakanz-firma" className="sr-only">
                  Firma
                </label>
                <select id="vakanz-firma" name="firma" defaultValue={companyId ? String(companyId) : ""} className={filterSelect}>
                  <option value="">Alle Firmen</option>
                  {companyChoices.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </SearchBox>
          {filter.group === "offen" ? (
            <nav aria-label="Status der offenen Vakanzen" className="-mx-1 flex flex-wrap gap-1.5 text-[0.8125rem]">
              {[
                { value: undefined, label: "Alle offenen", count: counts.offen, active: !filter.status },
                ...openMandateStatuses.map((s) => ({ value: s, label: labelOf(mandateStatuses, s), count: perStatus[s] ?? 0, active: filter.status === s })),
              ].map((chip) => (
                <Link
                  key={chip.label}
                  href={listHref("/admin/vakanzen", { ...base, status: chip.value })}
                  aria-current={chip.active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 transition-colors",
                    chip.active ? "border-blue bg-blue/[0.06] font-medium text-blue" : "border-line bg-white text-slate hover:border-slate/40 hover:text-ink",
                  )}
                >
                  {chip.label}
                  <span className="tabular-nums">{chip.count}</span>
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        {filtered ? (
          <p className="flex flex-wrap items-center gap-2 border-b border-line bg-mist/40 px-5 py-2 text-[0.8125rem] text-slate">
            Gefiltert.
            <Link href={listHref("/admin/vakanzen", { status: current })} className="text-blue hover:underline">
              Filter zurücksetzen
            </Link>
          </p>
        ) : null}

        {list.rows.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="px-3">Vakanz</Th>
                  <Th className="px-3">Firma / Endkunde</Th>
                  <Th align="right" className="px-3">
                    Satz
                  </Th>
                  <Th className="px-3">Beworben</Th>
                  <Th className="px-3">Nächster Schritt</Th>
                  <Th className="px-3">Status</Th>
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section.status}>
                  {showSections ? (
                    <tr>
                      <th scope="colgroup" colSpan={6} className="border-b border-line bg-mist/40 px-3 py-2 text-left">
                        <span className="flex items-center gap-2">
                          <Badge tone={toneOf(mandateStatuses, section.status)}>{labelOf(mandateStatuses, section.status)}</Badge>
                          <span className="text-xs font-medium text-slate tabular-nums">{perStatus[section.status] ?? section.rows.length}</span>
                        </span>
                      </th>
                    </tr>
                  ) : null}
                  {section.rows.map((m) => {
                    const active = isOpenStatus(m.status);
                    return (
                      <tr key={m.id} className="hover:bg-mist/50">
                        <Td className="min-w-52 px-3">
                          <Link href={`/admin/vakanzen/${m.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                            {m.title}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                            <Mono>{displayNo.mandate(m.id)}</Mono>
                            {m.reference ? <Mono>Nr. {m.reference}</Mono> : null}
                            {m.url ? (
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-0.5 text-xs text-blue hover:underline"
                                aria-label={`Ausschreibung «${m.title}» öffnen (neuer Tab)`}
                              >
                                Ausschreibung
                                <ExternalLink aria-hidden className="size-3" />
                              </a>
                            ) : null}
                          </div>
                        </Td>
                        <Td className="min-w-36 px-3">
                          {m.companyId && m.companyName ? (
                            <Link href={`/admin/firmen/${m.companyId}`} className="text-ink hover:text-blue hover:underline">
                              {m.companyName}
                            </Link>
                          ) : (
                            <span className="text-slate">–</span>
                          )}
                          {m.endClient ? <span className="block text-xs text-slate">für {m.endClient}</span> : null}
                        </Td>
                        <Td align="right" className="px-3 whitespace-nowrap">
                          {formatRate(m.rateSell, m.rateUnit, true)}
                          {m.workload ? <span className="block text-xs text-slate">{m.workload} %</span> : null}
                        </Td>
                        <Td className="px-3 whitespace-nowrap">
                          {m.appliedAt ? (
                            formatDate(m.appliedAt)
                          ) : active && m.deadline ? (
                            <span className="text-xs text-slate">
                              Frist <DueDate date={m.deadline} today={today} />
                            </span>
                          ) : (
                            <span className="text-slate">–</span>
                          )}
                        </Td>
                        <Td className="min-w-44 px-3">
                          {m.nextStep ? <span className="line-clamp-2">{m.nextStep}</span> : null}
                          {m.nextStepAt ? (
                            <span className="mt-0.5 block text-xs">
                              <DueDate date={m.nextStepAt} today={today} active={active} />
                            </span>
                          ) : null}
                          {!m.nextStep && !m.nextStepAt ? <span className="text-slate">–</span> : null}
                        </Td>
                        <Td className="px-3">
                          <span className="flex flex-col items-start gap-1">
                            <Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>
                            {m.priority === "hoch" ? <span className="text-xs font-medium text-red-700">Priorität hoch</span> : null}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </Table>
            <Pagination
              page={page}
              pageCount={Math.ceil(list.total / PAGE_SIZE)}
              hrefFor={(p) => listHref("/admin/vakanzen", { ...base, status: current, seite: p })}
            />
          </>
        ) : (
          <EmptyState
            icon={Telescope}
            title={filtered ? "Keine Vakanz gefunden" : counts.alle ? "Hier ist gerade nichts" : "Noch keine Vakanzen"}
            action={
              filtered ? (
                <LinkButton href={listHref("/admin/vakanzen", { status: current })}>Filter zurücksetzen</LinkButton>
              ) : counts.alle ? (
                <LinkButton href={listHref("/admin/vakanzen", { status: "alle" })}>Alle Vakanzen zeigen</LinkButton>
              ) : (
                <LinkButton href="/admin/vakanzen/neu" variant="primary" icon={Plus}>
                  Erste Vakanz erfassen
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Versuch es mit einem anderen Suchbegriff oder setz die Filter zurück."
              : counts.alle
                ? "In diesem Bereich liegt keine Vakanz."
                : "Erfasse die Stellen, auf die du dich bewirbst, etwa von GHR Group oder Coopers Group. Dann siehst du hier, wo du beworben hast und was als Nächstes ansteht."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
