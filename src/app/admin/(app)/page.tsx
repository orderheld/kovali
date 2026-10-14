import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Calculator, CalendarClock, FileSignature, Pin, Plus, Settings2, Telescope, TextQuote } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, Mono, Notice, PageHeader, StatTile } from "@/components/admin/ui";
import { formatPeriod, periodStatus, splitByStart } from "@/lib/admin/assignment-period";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listEndingContracts } from "@/lib/admin/contracts/data";
import { CONTRACT_ENDING_DAYS, contractExpiry, expiryLabel, expiryTone } from "@/lib/admin/contracts/expiry";
import { runningAssignments } from "@/lib/admin/data/assignments";
import { dashboardAgenda, NEXT_STEP_DAYS, nextBestStep, setupProgress, vacancyPipeline, type NextBestStep } from "@/lib/admin/data/dashboard";
import { loadEarningsSettings } from "@/lib/admin/data/earnings";
import { pinnedSnippets } from "@/lib/admin/data/snippets";
import { assignmentEarningsInput, computeEarnings, computeEarningsTotal, formatRate, modelLabel, type EarningsInput, type EarningsSettings } from "@/lib/admin/earnings";
import { addDaysIso, displayNo, formatChf, formatDate, formatNumber, todayIso } from "@/lib/admin/format";
import { labelOf, mandateStatuses, type Tone } from "@/lib/admin/options";
import { dueState, dueTone } from "@/lib/admin/vacancy-rules";
import { cn } from "@/lib/utils";
import { EarningsBreakdown } from "./_shared/earnings-breakdown";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

/** The statuses of the application pipeline, in order. */
const PIPELINE = ["neu", "in_bearbeitung", "angeboten", "interview", "gewonnen"] as const;

function greeting(now: Date): string {
  // formatToParts: in de-CH a bare hour is formatted as "9 Uhr", which is not a number.
  const parts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  if (hour < 5) return "Hallo, Ferhat";
  if (hour < 11) return "Guten Morgen, Ferhat";
  if (hour < 18) return "Guten Tag, Ferhat";
  return "Guten Abend, Ferhat";
}

function longToday(now: Date): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
}

/** "2 Tage überfällig", "heute", "morgen" or "in 5 Tagen", coloured as in the vacancy list. */
function dueBadge(date: string, today: string): { label: string; tone: Tone } {
  const due = dueState(date, today);
  return { label: due?.label ?? formatDate(date), tone: dueTone(due) ?? "neutral" };
}

const money = (v: number) => formatChf(v, { round: true });

export default async function DashboardPage() {
  await requireAdmin();
  const now = new Date();
  const today = todayIso(now);
  const [running, earningsSettings, agenda, pipeline, contracts, snippets, progress] = await Promise.all([
    runningAssignments(),
    loadEarningsSettings(),
    dashboardAgenda(today),
    vacancyPipeline(),
    listEndingContracts(today),
    pinnedSnippets(6),
    setupProgress(),
  ]);
  const { settings, saved } = earningsSettings;
  // Only assignments that have started count; one marked as running that starts later (e.g. the
  // follow-up of the current one) gets its own line outside the total.
  const { current, upcoming } = splitByStart(running, today);
  const next = current.length ? null : await nextBestStep();

  const withInput = current.map((a) => ({ a, input: assignmentEarningsInput(a) }));
  const inputs = withInput.map((x) => x.input).filter((i): i is EarningsInput => i !== null);
  const total = computeEarningsTotal(inputs, settings);
  const withoutRate = withInput.filter((x) => !x.input).map((x) => x.a);
  const pipelineOpen = PIPELINE.reduce((n, s) => n + (pipeline[s] ?? 0), 0);

  const hints = [
    !saved
      ? {
          key: "annahmen",
          href: "/admin/rechner?ansicht=annahmen",
          text: "Prüfe die Annahmen für Ferien, Versicherungen, Vorsorge und Fixkosten. Bis dahin rechnet die Übersicht mit Standardwerten.",
          link: "Annahmen prüfen",
        }
      : null,
    progress.companies === 0
      ? { key: "firmen", href: "/admin/firmen/neu", text: "Lege deine Vermittler wie GHR Group oder Coopers Group an.", link: "Firma erfassen" }
      : null,
    progress.snippets === 0
      ? { key: "texte", href: "/admin/texte/neu", text: "Speichere dein Kurzprofil und andere Texte für Bewerbungen als Textbaustein.", link: "Textbaustein erfassen" }
      : null,
  ].filter((h) => h !== null);

  return (
    <>
      <PageHeader
        title={greeting(now)}
        description={`${longToday(now)}.`}
        actions={
          <LinkButton href="/admin/rechner" icon={Calculator}>
            Rechner
          </LinkButton>
        }
      />

      <div className="space-y-6">
        {hints.length ? (
          <Notice tone="blue" icon={Settings2} title="Noch einzurichten">
            <ul className="mt-1 space-y-1">
              {hints.map((h) => (
                <li key={h.key}>
                  {h.text}{" "}
                  <Link href={h.href} className="font-medium underline underline-offset-2">
                    {h.link}
                  </Link>
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}

        <Card>
          <CardHeader
            icon={Briefcase}
            title={current.length > 1 ? `Aktuelle Aufträge (${current.length})` : "Aktueller Auftrag"}
            description={
              current.length > 1
                ? "Zusammen gerechnet. Rechnungen über die Einzelfirma teilen sich AHV und Fixkosten."
                : current.length === 1
                  ? undefined
                  : "Gerade läuft kein Auftrag."
            }
            actions={
              running.length ? (
                <LinkButton href="/admin/auftraege" size="sm" variant="ghost">
                  Alle Aufträge
                </LinkButton>
              ) : null
            }
          />
          {current.length === 0 ? (
            <>
              <EmptyState
                icon={Briefcase}
                title="Kein laufender Auftrag"
                action={
                  <span className="flex flex-wrap justify-center gap-2">
                    <NextStepAction next={next} />
                    {next?.kind === "zusage" ? null : (
                      <LinkButton href="/admin/auftraege/neu" variant={next?.kind === "keine" || next?.kind === "vakanz" ? "primary" : "secondary"} icon={Plus}>
                        Auftrag erfassen
                      </LinkButton>
                    )}
                  </span>
                }
              >
                <NextStepText next={next} today={today} />
              </EmptyState>
              {upcoming.length ? (
                <CardBody className="pt-0">
                  <UpcomingNotice rows={upcoming} />
                </CardBody>
              ) : null}
            </>
          ) : (
            <>
              {current.length === 1 ? <SingleAssignment a={current[0]} today={today} /> : <AssignmentRows rows={withInput} settings={settings} today={today} />}
              {total ? (
                <>
                  <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                    {current.length === 1 ? (
                      <StatTile label={rateLabel(current[0])} value={formatRate(current[0].rateAmount, current[0].rateUnit, true)} hint={modelLabel(current[0].billing, current[0].rateBasis)} />
                    ) : (
                      <StatTile label="Stunden pro Monat" value={formatNumber(total.hoursPerMonth, 1)} hint="alle Aufträge zusammen" />
                    )}
                    <StatTile label="Einnahmen pro Monat" value={money(total.revenue.month)} hint={`${money(total.revenue.year)} pro Jahr`} />
                    <StatTile
                      label="Bleibt dir pro Monat"
                      value={<span className={total.net.month < 0 ? "text-red-700" : "text-blue-700"}>{money(total.net.month)}</span>}
                      hint={`${formatChf(total.net.hourly)} pro Stunde`}
                    />
                    <StatTile label="Bleibt dir pro Jahr" value={money(total.net.year)} hint="über 12 Monate verteilt" />
                  </div>
                  {total.notices.length || withoutRate.length || upcoming.length ? (
                    <div className="space-y-2 px-5 pt-4">
                      {upcoming.length ? <UpcomingNotice rows={upcoming} /> : null}
                      {withoutRate.length ? (
                        <Notice tone="amber">
                          Ohne Satz und darum nicht mitgerechnet:{" "}
                          {withoutRate.map((a, i) => (
                            <span key={a.id}>
                              {i > 0 ? ", " : ""}
                              <Link href={`/admin/auftraege/${a.id}/bearbeiten`} className="font-medium underline underline-offset-2">
                                {displayNo.assignment(a.id)} {a.title}
                              </Link>
                            </span>
                          ))}
                          .
                        </Notice>
                      ) : null}
                      {total.notices.map((n) => (
                        <Notice key={n} tone="amber">
                          {n}
                        </Notice>
                      ))}
                    </div>
                  ) : null}
                  <EarningsBreakdown earnings={total} />
                </>
              ) : (
                <CardBody className="space-y-2">
                  <Notice tone="amber" title="Noch kein Satz erfasst">
                    Trag beim Auftrag Satz und Abrechnung ein, dann siehst du hier, was dir pro Monat bleibt.
                  </Notice>
                  {upcoming.length ? <UpcomingNotice rows={upcoming} /> : null}
                </CardBody>
              )}
            </>
          )}
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader
              icon={Telescope}
              title="Vakanzen"
              description={pipelineOpen ? undefined : "Keine offenen Bewerbungen."}
              actions={
                <LinkButton href="/admin/vakanzen" size="sm" variant="ghost">
                  Alle Vakanzen
                </LinkButton>
              }
            />
            <ol className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-5">
              {PIPELINE.map((status) => {
                const n = pipeline[status] ?? 0;
                return (
                  <li key={status} className="bg-white last:col-span-2 sm:last:col-span-1">
                    <Link href={`/admin/vakanzen?status=${status}`} className="block h-full px-4 py-3 transition-colors hover:bg-mist/60">
                      <span className={cn("block text-xl font-semibold tabular-nums", n ? "text-ink" : "text-slate/60")}>{n}</span>
                      <span className="block text-xs text-slate">{labelOf(mandateStatuses, status)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <div className="px-5 pt-4 pb-1">
              <h3 className="text-sm font-semibold text-ink">Nächste Schritte</h3>
              <p className="text-xs text-slate">Fällig bis {formatDate(addDaysIso(today, NEXT_STEP_DAYS))} und Fristen der nächsten Tage.</p>
            </div>
            {agenda.nextSteps.length || agenda.deadlines.length ? (
              <ul className="divide-y divide-line">
                {agenda.nextSteps.map((m) => {
                  const due = dueBadge(m.nextStepAt ?? today, today);
                  return (
                    <li key={`s-${m.id}`}>
                      <Link href={`/admin/vakanzen/${m.id}`} className="flex items-start gap-3 px-5 py-3 text-sm transition-colors hover:bg-mist/60">
                        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink">{m.nextStep ?? "Nächster Schritt"}</span>
                          <span className="block truncate text-xs text-slate">
                            {m.title}
                            {m.company ? `, ${m.company}` : ""}
                          </span>
                        </span>
                        <Badge tone={due.tone}>{due.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
                {agenda.deadlines.map((m) => {
                  const due = dueBadge(m.deadline ?? today, today);
                  return (
                    <li key={`d-${m.id}`}>
                      <Link href={`/admin/vakanzen/${m.id}`} className="flex items-start gap-3 px-5 py-3 text-sm transition-colors hover:bg-mist/60">
                        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink">Bewerbungsfrist</span>
                          <span className="block truncate text-xs text-slate">
                            {m.title}
                            {m.company ? `, ${m.company}` : ""}
                          </span>
                        </span>
                        <Badge tone={due.tone}>{due.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <CardBody className="pt-2">
                <p className="text-sm text-slate">Nichts fällig.</p>
              </CardBody>
            )}
          </Card>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader
                icon={FileSignature}
                title="Verträge, die bald enden"
                description={`Laufzeit endet in den nächsten ${CONTRACT_ENDING_DAYS} Tagen.`}
                actions={
                  <LinkButton href="/admin/vertraege" size="sm" variant="ghost">
                    Alle Verträge
                  </LinkButton>
                }
              />
              {contracts.length ? (
                <ul className="divide-y divide-line">
                  {contracts.map((c) => {
                    const expiry = contractExpiry(c, today);
                    return (
                      <li key={c.id}>
                        <Link href={`/admin/vertraege/${c.id}`} className="flex items-start gap-3 px-5 py-3 text-sm transition-colors hover:bg-mist/60">
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">{c.title}</span>
                            <span className="block text-xs text-slate">
                              <Mono>{c.number}</Mono>
                              {c.companyName ? `, ${c.companyName}` : ""}, bis {formatDate(c.validUntil)}
                              {c.noticePeriod ? `, Kündigungsfrist ${c.noticePeriod}` : ""}
                            </span>
                          </span>
                          {expiry ? <Badge tone={expiryTone(expiry)}>{expiryLabel(expiry)}</Badge> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-slate">Kein Vertrag endet in dieser Zeit.</p>
                </CardBody>
              )}
            </Card>

            <Card>
              <CardHeader
                icon={TextQuote}
                title="Angeheftete Textbausteine"
                actions={
                  <LinkButton href="/admin/texte" size="sm" variant="ghost">
                    Alle Texte
                  </LinkButton>
                }
              />
              {snippets.length ? (
                <ul className="divide-y divide-line">
                  {snippets.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="min-w-0 flex-1">
                        <Link href={`/admin/texte/${s.id}`} className="block text-sm font-medium text-ink hover:text-blue hover:underline">
                          {s.title}
                        </Link>
                        {s.category || s.companyName ? <span className="block text-xs text-slate">{[s.category, s.companyName].filter(Boolean).join(", ")}</span> : null}
                        <span className="mt-1 line-clamp-2 block text-[0.8125rem] whitespace-pre-line text-slate">{s.body}</span>
                      </span>
                      <CopyButton value={s.body} />
                    </li>
                  ))}
                </ul>
              ) : (
                <CardBody>
                  <p className="flex items-start gap-2 text-sm text-slate">
                    <Pin aria-hidden className="mt-0.5 size-4 shrink-0" />
                    Heftest du einen Textbaustein an, kannst du ihn hier mit einem Klick kopieren.
                  </p>
                </CardBody>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

type RunningRow = Awaited<ReturnType<typeof runningAssignments>>[number];

/** What the rate of an assignment means, as a tile label. */
function rateLabel(a: RunningRow): string {
  if (a.billing !== "lohn") return "Satz ohne MWST";
  return a.rateBasis === "kostensatz" ? "Kostensatz" : "Satz all-in";
}

/** Facts of the one running assignment: role, firm, end client, period and days left. */
function SingleAssignment({ a, today }: { a: RunningRow; today: string }) {
  const period = periodStatus(a, today);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 pt-1 pb-4">
      <div className="min-w-0">
        <Link href={`/admin/auftraege/${a.id}`} className="text-lg font-semibold text-ink hover:text-blue hover:underline">
          {a.title}
        </Link>
        <p className="text-sm text-slate">
          {[a.companyName, a.endClient ? `bei ${a.endClient}` : null, `Pensum ${a.workload} %`].filter(Boolean).join(", ")}
        </p>
      </div>
      <div className="text-sm sm:text-right">
        <p className="text-ink">{formatPeriod(a.startDate, a.endDate)}</p>
        {period ? (
          <Badge tone={period.tone} className="mt-1">
            {period.text}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

/** Assignments marked as running that start after today: named, but not in the total. */
function UpcomingNotice({ rows }: { rows: RunningRow[] }) {
  return (
    <Notice tone="blue" icon={CalendarClock}>
      {rows.map((a) => (
        <span key={a.id} className="block">
          <Link href={`/admin/auftraege/${a.id}`} className="font-medium underline underline-offset-2">
            «{displayNo.assignment(a.id)} {a.title}»
          </Link>{" "}
          startet am {formatDate(a.startDate)} und ist noch nicht mitgerechnet.
        </span>
      ))}
    </Notice>
  );
}

/** One row per running assignment when there are several. */
function AssignmentRows({ rows, settings, today }: { rows: { a: RunningRow; input: EarningsInput | null }[]; settings: EarningsSettings; today: string }) {
  return (
    <ul className="divide-y divide-line border-b border-line">
      {rows.map(({ a, input }) => {
        const e = input ? computeEarnings(input, settings) : null;
        const period = periodStatus(a, today);
        return (
          <li key={a.id}>
            <Link href={`/admin/auftraege/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm transition-colors hover:bg-mist/60">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{a.title}</span>
                <span className="block text-xs text-slate">{[a.companyName, a.endClient, `Pensum ${a.workload} %`].filter(Boolean).join(", ")}</span>
              </span>
              <span className="text-right whitespace-nowrap">
                <span className="block text-ink">{formatRate(a.rateAmount, a.rateUnit, true)}</span>
                <span className="block text-xs text-slate">{modelLabel(a.billing, a.rateBasis)}</span>
              </span>
              {period ? <Badge tone={period.tone}>{period.text}</Badge> : null}
              <span className="w-28 text-right font-medium whitespace-nowrap text-ink">{e ? `${money(e.net.month)}` : <span className="font-normal text-slate">Satz fehlt</span>}</span>
            </Link>
          </li>
        );
      })}
      <li className="px-5 py-2 text-xs text-slate">Pro Auftrag einzeln gerechnet. Die Summe unten rechnet die Aufträge zusammen.</li>
    </ul>
  );
}

function NextStepText({ next, today }: { next: NextBestStep | null; today: string }) {
  if (!next || next.kind === "keine") return <>Erfasse deinen nächsten Einsatz oder eine Vakanz, an der du dran bist.</>;
  if (next.kind === "geplant") {
    return (
      <>
        {displayNo.assignment(next.id)} «{next.title}» ist geplant{next.startDate ? ` ab ${formatDate(next.startDate)}` : ""}. Hat er begonnen, setz ihn auf «Laufend».
      </>
    );
  }
  if (next.kind === "zusage") {
    return (
      <>
        Für «{next.title}»{next.company ? ` bei ${next.company}` : ""} hast du eine Zusage. Erfasse daraus den Auftrag, die Angaben der Vakanz werden übernommen.
      </>
    );
  }
  return (
    <>
      Nächster Schritt bei «{next.title}»: {next.nextStep ?? "noch offen"}
      {next.nextStepAt ? ` (${dueBadge(next.nextStepAt, today).label})` : ""}.
    </>
  );
}

function NextStepAction({ next }: { next: NextBestStep | null }) {
  if (!next || next.kind === "keine") {
    return (
      <LinkButton href="/admin/vakanzen/neu" icon={Telescope}>
        Vakanz erfassen
      </LinkButton>
    );
  }
  if (next.kind === "geplant") {
    return (
      <LinkButton href={`/admin/auftraege/${next.id}`} variant="primary" icon={ArrowRight}>
        Geplanten Auftrag öffnen
      </LinkButton>
    );
  }
  if (next.kind === "zusage") {
    return (
      <LinkButton href={`/admin/auftraege/neu?vakanz=${next.id}`} variant="primary" icon={Plus}>
        Auftrag erfassen
      </LinkButton>
    );
  }
  return (
    <LinkButton href={`/admin/vakanzen/${next.id}`} icon={Telescope}>
      Vakanz öffnen
    </LinkButton>
  );
}
