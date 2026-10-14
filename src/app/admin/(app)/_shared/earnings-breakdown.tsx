import Link from "next/link";
import { Badge, Table, Td, Th } from "@/components/admin/ui";
import { LINE_GROUPS, netLabel, netTaxNote, type Earnings, type EarningsLine, type LineGroup } from "@/lib/admin/earnings";
import { formatChf, formatPercent } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

/**
 * What is left of a rate: one stacked bar (net against the cost groups) and a table grouped by
 * line group with month, year and share of the revenue. Used on the dashboard, the assignment
 * page and the Rechner. No hooks, so it renders on the server and inside client components.
 *
 * «Bleibt dir» always says whether it is before income taxes or after the tax reserve, because
 * income taxes are only deducted when Ferhat sets a reserve under Annahmen.
 *
 * Colours: the net in the brand blue, the groups in a categorical order checked for colour
 * vision deficiencies on adjacent segments. Every segment is also named in the legend with its
 * share and amount, and the table holds all values, so nothing depends on colour alone.
 */

type Shown = Pick<Earnings, "revenue" | "lines" | "net">;

const colors: Record<Exclude<LineGroup, "info"> | "net", string> = {
  net: "var(--color-blue, #145bce)",
  sozialversicherung: "#eb6834",
  vorsorge: "#1baf7a",
  versicherung: "#eda100",
  kosten: "#6250d6",
  steuern: "#e87ba4",
};

const money = (v: number) => formatChf(v, { round: true });
const minus = (v: number) => (Math.abs(v) < 0.5 ? money(0) : `− ${money(v)}`);
/** Share of the revenue with one decimal, e.g. "11.5 %". */
function share(part: number, whole: number): string {
  if (!(whole > 0)) return "–";
  return formatPercent(Math.round((part / whole) * 1000) / 10);
}

interface Segment {
  id: Exclude<LineGroup, "info"> | "net";
  label: string;
  month: number;
}

function groupsOf(e: Shown) {
  return LINE_GROUPS.map((g) => {
    const lines = e.lines.filter((l) => l.group === g.id);
    return { ...g, lines, month: lines.reduce((a, l) => a + l.month, 0), year: lines.reduce((a, l) => a + l.year, 0) };
  }).filter((g) => g.lines.length > 0);
}

/** The stacked bar with its legend. */
export function EarningsBar({ earnings, className }: { earnings: Shown; className?: string }) {
  const costs = groupsOf(earnings).filter((g) => g.id !== "info" && g.month > 0);
  const net = earnings.net.month;
  const segments: Segment[] = [
    ...(net > 0 ? [{ id: "net" as const, label: netLabel(earnings), month: net }] : []),
    ...costs.map((g) => ({ id: g.id as Segment["id"], label: g.label, month: g.month })),
  ];
  const total = segments.reduce((a, s) => a + s.month, 0);
  if (!(total > 0)) return null;
  const netShare = share(Math.max(net, 0), earnings.revenue.month);
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={
          net > 0
            ? `Von ${money(earnings.revenue.month)} pro Monat bleiben dir ${netTaxNote(earnings)} ${money(net)} (${netShare}).`
            : `Die Abzüge sind ${money(-net)} pro Monat höher als die Einnahmen.`
        }
        className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md bg-white"
      >
        {segments.map((s) => {
          const width = (s.month / total) * 100;
          return (
            <div
              key={s.id}
              title={`${s.label}: ${money(s.month)} pro Monat (${share(s.month, earnings.revenue.month)})`}
              className="flex min-w-[3px] items-center overflow-hidden first:rounded-l-md last:rounded-r-md"
              style={{ flex: `0 1 ${width}%`, background: colors[s.id] }}
            >
              {s.id === "net" && width >= 22 ? <span className="px-2.5 text-xs font-semibold whitespace-nowrap text-white">
                  {netLabel(earnings)} {netShare}
                </span> : null}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.8125rem]">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: colors[s.id] }} />
            <span className={cn("text-ink", s.id === "net" && "font-medium")}>{s.label}</span>
            <span className="text-slate tabular-nums">
              {share(s.month, earnings.revenue.month)} · {money(s.month)}
            </span>
          </li>
        ))}
      </ul>
      {net <= 0 ? <p className="mt-2 text-[0.8125rem] font-medium text-red-700">Die Abzüge sind höher als die Einnahmen: Es bleibt dir nichts.</p> : null}
    </div>
  );
}

function LineLabel({ line }: { line: EarningsLine }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        {line.label}
        {line.estimate ? <Badge tone={line.estimate === "Richtwert" ? "amber" : "blue"}>{line.estimate}</Badge> : null}
      </span>
      {line.note ? <span className="block text-xs text-slate">{line.note}</span> : null}
    </>
  );
}

/** The table: revenue, the groups with their lines, what is left, and lines for information. */
export function EarningsTable({ earnings, className }: { earnings: Shown; className?: string }) {
  const groups = groupsOf(earnings);
  const revenue = earnings.revenue;
  const deductions = groups.filter((g) => g.id !== "info");
  const info = groups.find((g) => g.id === "info");
  const taxed = netTaxNote(earnings) === "nach Steuer-Rücklage";
  return (
    <Table className={className}>
      <thead>
        <tr>
          <Th>Position</Th>
          <Th align="right">Satz</Th>
          <Th align="right">Monat</Th>
          <Th align="right">Jahr</Th>
          <Th align="right">Anteil</Th>
        </tr>
      </thead>
      <tbody>
        <tr className="font-semibold text-ink">
          <Td className="min-w-52">{revenue.label}</Td>
          <Td />
          <Td align="right" className="whitespace-nowrap">
            {money(revenue.month)}
          </Td>
          <Td align="right" className="whitespace-nowrap">
            {money(revenue.year)}
          </Td>
          <Td align="right" className="whitespace-nowrap">100 %</Td>
        </tr>
        {deductions.map((g) => (
          <GroupRows key={g.id} group={g} revenue={revenue.month} />
        ))}
        <tr className="bg-blue/[0.07] font-semibold text-ink">
          <Td>
            {netLabel(earnings)}
            {taxed ? null : (
              <span className="block text-xs font-normal text-slate">
                Einkommenssteuern sind nicht abgezogen.{" "}
                <Link href="/admin/rechner?ansicht=annahmen" className="underline underline-offset-2 hover:text-ink">
                  Rücklage unter Annahmen setzen
                </Link>
                .
              </span>
            )}
          </Td>
          <Td />
          <Td align="right" className={cn("whitespace-nowrap", earnings.net.month < 0 ? "text-red-700" : "text-blue-700")}>
            {money(earnings.net.month)}
          </Td>
          <Td align="right" className={cn("whitespace-nowrap", earnings.net.year < 0 ? "text-red-700" : "text-blue-700")}>
            {money(earnings.net.year)}
          </Td>
          <Td align="right" className="whitespace-nowrap">{share(earnings.net.month, revenue.month)}</Td>
        </tr>
        {info ? (
          <>
            <tr>
              <Td className="pt-5 text-[0.75rem] font-semibold tracking-wide text-slate uppercase">{info.label}</Td>
              <Td />
              <Td />
              <Td />
              <Td />
            </tr>
            {info.lines.map((l) => (
              <tr key={l.key} className="text-slate">
                <Td className="pl-8">
                  <LineLabel line={l} />
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {l.percent !== null ? formatPercent(l.percent) : ""}
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {money(l.month)}
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {money(l.year)}
                </Td>
                <Td align="right" className="whitespace-nowrap">{share(l.month, revenue.month)}</Td>
              </tr>
            ))}
          </>
        ) : null}
      </tbody>
    </Table>
  );
}

function GroupRows({ group, revenue }: { group: ReturnType<typeof groupsOf>[number]; revenue: number }) {
  const color = colors[group.id as Exclude<LineGroup, "info">];
  return (
    <>
      <tr className="bg-mist/60 text-ink">
        <Td className="font-medium">
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
            {group.label}
          </span>
        </Td>
        <Td />
        <Td align="right" className="font-medium whitespace-nowrap">
          {minus(group.month)}
        </Td>
        <Td align="right" className="font-medium whitespace-nowrap">
          {minus(group.year)}
        </Td>
        <Td align="right" className="font-medium whitespace-nowrap">
          {share(group.month, revenue)}
        </Td>
      </tr>
      {group.lines.map((l) => (
        <tr key={l.key}>
          <Td className="pl-8 text-ink">
            <LineLabel line={l} />
          </Td>
          <Td align="right" className="whitespace-nowrap text-slate">
            {l.percent !== null ? formatPercent(l.percent) : ""}
          </Td>
          <Td align="right" className="whitespace-nowrap">
            {minus(l.month)}
          </Td>
          <Td align="right" className="whitespace-nowrap">
            {minus(l.year)}
          </Td>
          <Td align="right" className="whitespace-nowrap text-slate">
            {share(l.month, revenue)}
          </Td>
        </tr>
      ))}
    </>
  );
}

/** Bar and table together. */
export function EarningsBreakdown({ earnings, className }: { earnings: Shown; className?: string }) {
  return (
    <div className={className}>
      <EarningsBar earnings={earnings} className="px-5 pt-4 pb-5" />
      <EarningsTable earnings={earnings} className="border-t border-line" />
    </div>
  );
}
