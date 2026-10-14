import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Calculator, Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, PageHeader, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { formatPeriod, periodStatus } from "@/lib/admin/assignment-period";
import { requireAdmin } from "@/lib/admin/auth/session";
import { assignmentStatusCounts, assignmentStatusFilters, listAssignments, type AssignmentStatusFilter } from "@/lib/admin/data/assignments";
import { loadEarningsSettings } from "@/lib/admin/data/earnings";
import { listHref, param } from "@/lib/admin/data/query";
import { assignmentEarningsInput, computeEarnings, formatRate, modelLabel } from "@/lib/admin/earnings";
import { displayNo, formatChf, todayIso } from "@/lib/admin/format";
import { assignmentStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { SearchBox } from "../_shared/search-box";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Aufträge" };

const tabLabels: Record<AssignmentStatusFilter, string> = { laufend: "Laufend", geplant: "Geplant", beendet: "Beendet", alle: "Alle" };

export default async function AssignmentsPage({ searchParams }: PageProps<"/admin/auftraege">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const counts = await assignmentStatusCounts();
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const requested = assignmentStatusFilters.find((s) => s === param(sp.status));
  // Without a choice: the running ones, or all when none is running.
  const status: AssignmentStatusFilter = requested ?? (counts.laufend ? "laufend" : "alle");
  const [rows, { settings }] = await Promise.all([listAssignments({ status, q }), loadEarningsSettings()]);
  const today = todayIso();

  return (
    <>
      <PageHeader
        title="Aufträge"
        description="Deine Einsätze mit Satz, Abrechnung und dem, was dir davon bleibt."
        actions={
          <LinkButton href="/admin/auftraege/neu" variant="primary" icon={Plus}>
            Auftrag erfassen
          </LinkButton>
        }
      />
      <Tabs
        items={assignmentStatusFilters.map((s) => ({
          label: tabLabels[s],
          href: listHref("/admin/auftraege", { q, status: s }),
          active: status === s,
          count: s === "alle" ? all : (counts[s] ?? 0),
        }))}
      />
      <Card>
        {all > 0 ? (
          <div className="border-b border-line px-5 py-3">
            <SearchBox action="/admin/auftraege" defaultValue={q} placeholder="Rolle, Firma, Endkunde oder A-Nummer" hidden={{ status }} />
          </div>
        ) : null}
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Auftrag</Th>
                <Th>Firma</Th>
                <Th>Endkunde</Th>
                <Th>Zeitraum</Th>
                <Th align="right">Satz</Th>
                <Th>Modell</Th>
                <Th align="right">Bleibt dir / Monat</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const input = assignmentEarningsInput(a);
                const earnings = input ? computeEarnings(input, settings) : null;
                const period = periodStatus(a, today);
                return (
                  <tr key={a.id} className="hover:bg-mist/50">
                    <Td className="min-w-56">
                      <Link href={`/admin/auftraege/${a.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {a.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Mono>{displayNo.assignment(a.id)}</Mono>
                        {status === "alle" ? <Badge tone={toneOf(assignmentStatuses, a.status)}>{labelOf(assignmentStatuses, a.status)}</Badge> : null}
                      </div>
                    </Td>
                    <Td>
                      {a.companyId ? (
                        <Link href={`/admin/firmen/${a.companyId}`} className="text-ink hover:text-blue hover:underline">
                          {a.companyName}
                        </Link>
                      ) : (
                        <span className="text-slate">–</span>
                      )}
                    </Td>
                    <Td>{a.endClient ?? <span className="text-slate">–</span>}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="block">{formatPeriod(a.startDate, a.endDate)}</span>
                      {period ? (
                        <Badge tone={period.tone} className="mt-1">
                          {period.text}
                        </Badge>
                      ) : null}
                    </Td>
                    <Td align="right" className="whitespace-nowrap">
                      {formatRate(a.rateAmount, a.rateUnit, true)}
                      <span className="block text-xs text-slate">Pensum {a.workload} %</span>
                    </Td>
                    <Td className="whitespace-nowrap">{modelLabel(a.billing, a.rateBasis)}</Td>
                    <Td align="right" className="font-medium whitespace-nowrap">
                      {earnings ? formatChf(earnings.net.month, { round: true }) : <span className="font-normal text-slate">Satz fehlt</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : q ? (
          <EmptyState icon={Briefcase} title="Kein Auftrag gefunden" action={<LinkButton href={listHref("/admin/auftraege", { status })}>Suche zurücksetzen</LinkButton>}>
            Andere Suche versuchen oder einen anderen Status wählen.
          </EmptyState>
        ) : all === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Noch keine Aufträge"
            action={
              <span className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/admin/auftraege/neu" variant="primary" icon={Plus}>
                  Ersten Auftrag erfassen
                </LinkButton>
                <LinkButton href="/admin/rechner" icon={Calculator}>
                  Satz durchrechnen
                </LinkButton>
              </span>
            }
          >
            Erfasse deinen aktuellen Einsatz mit Satz und Abrechnung. Die Übersicht zeigt dir dann, was dir pro Monat bleibt.
          </EmptyState>
        ) : (
          <EmptyState icon={Briefcase} title={`Keine Aufträge mit Status «${tabLabels[status]}»`} action={<LinkButton href={listHref("/admin/auftraege", { status: "alle" })}>Alle anzeigen</LinkButton>}>
            {status === "laufend" ? "Hat ein geplanter Auftrag begonnen? Setze ihn auf der Detailseite auf «Laufend»." : "Wähle einen anderen Status."}
          </EmptyState>
        )}
      </Card>
      {rows.length ? (
        <p className="mt-3 text-xs text-slate">
          «Bleibt dir» rechnet jeden Auftrag für sich mit deinen Annahmen aus dem{" "}
          <Link href="/admin/rechner?ansicht=annahmen" className="text-blue hover:underline">
            Rechner
          </Link>
          . Laufen mehrere Aufträge über die Einzelfirma, zählen AHV und Fixkosten in der Übersicht nur einmal.
        </p>
      ) : null}
    </>
  );
}
