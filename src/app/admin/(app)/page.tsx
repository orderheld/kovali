import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Circle,
  FileSignature,
  History,
  Inbox,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, Mono, Notice, PageHeader, StatTile } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { dashboardAgenda, dashboardKpis, portalReviewCounts, privacyCounts, recentActivities, setupProgress } from "@/lib/admin/data/dashboard";
import { adminEnv } from "@/lib/admin/env";
import { displayNo, formatDate, formatDateTime, todayIso } from "@/lib/admin/format";
import { labelOf, mandatePriorities, mandateStatuses, toneOf, type Tone } from "@/lib/admin/options";
import { addDaysIso } from "@/lib/admin/privacy";
import { cn } from "@/lib/utils";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

const activityIcons = { notiz: MessageSquare, anruf: Phone, e_mail: Mail, termin: CalendarClock, system: Settings2 } as const;

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

/** "überfällig", "heute", "morgen" or the date, with a matching colour. */
function dueBadge(date: string, today: string): { label: string; tone: Tone } {
  if (date < today) return { label: `überfällig seit ${formatDate(date)}`, tone: "red" };
  if (date === today) return { label: "heute", tone: "amber" };
  if (date === addDaysIso(today, 1)) return { label: "morgen", tone: "amber" };
  return { label: formatDate(date), tone: "neutral" };
}

function ReviewRow({ href, label, count, tone = "amber", hint }: { href: string; label: string; count: number; tone?: Tone; hint?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-mist/60">
        <span className="min-w-0 flex-1">
          <span className={cn("block", count ? "text-ink" : "text-slate")}>{label}</span>
          {hint ? <span className="block text-xs text-slate">{hint}</span> : null}
        </span>
        {count ? (
          <Badge tone={tone}>
            {count}
            <span className="sr-only"> offen</span>
          </Badge>
        ) : (
          <span className="text-xs text-slate">keine</span>
        )}
      </Link>
    </li>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-mist">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue/10 text-blue">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="flex-1">{label}</span>
        <ArrowRight aria-hidden className="size-3.5 text-slate/60" />
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  await requireAdmin();
  const now = new Date();
  const today = todayIso(now);
  const [kpis, agenda, portal, privacy, recent, progress] = await Promise.all([
    dashboardKpis(today),
    dashboardAgenda(today),
    portalReviewCounts(),
    privacyCounts(today),
    recentActivities(15),
    setupProgress(),
  ]);
  const twoFactor = Boolean(adminEnv.totpSecret);

  const steps = [
    { label: "Erste Firma anlegen", hint: "Auftraggeber wie GHR Group oder Coopers Group.", href: "/admin/firmen/neu", done: progress.companies > 0 },
    { label: "Ersten Kandidaten erfassen", hint: "Mit Lebenslauf, Einwilligung und Aufbewahrungsdatum.", href: "/admin/kandidaten/neu", done: progress.candidates > 0 },
    { label: "Erstes Mandat erfassen", hint: "Anfrage oder Ausschreibung mit den geforderten Kompetenzen.", href: "/admin/mandate/neu", done: progress.mandates > 0 },
    { label: "Vertragsvorlagen ansehen", hint: "Rahmenvertrag, Einzelauftrag und Subunternehmervertrag.", href: "/admin/vertraege", done: progress.contracts > 0 },
    { label: "Zwei-Faktor-Anmeldung einrichten", hint: "Code auf der Einrichtungsseite erzeugen und bei Vercel eintragen.", href: "/admin/einrichtung", done: twoFactor },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const portalTotal = portal.changeRequests + portal.uploads + portal.interested;
  const privacyTotal = privacy.overdue + privacy.dueSoon + privacy.noConsentOld + privacy.submissionsAwaitingConsent;

  return (
    <>
      <PageHeader
        title={greeting(now)}
        description={`${longToday(now)}. Mandate, Kandidaten und offene Aufgaben auf einen Blick.`}
        actions={
          <>
            <LinkButton href="/admin/kandidaten/neu" icon={Plus}>
              Kandidat erfassen
            </LinkButton>
            <LinkButton href="/admin/mandate/neu" variant="primary" icon={Plus}>
              Mandat erfassen
            </LinkButton>
          </>
        }
      />

      <div className="space-y-6">
        {!twoFactor ? (
          <Notice tone="amber" icon={KeyRound} title="Zwei-Faktor-Anmeldung ist nicht aktiv">
            Für die Kandidatendaten empfohlen: Erzeuge auf der{" "}
            <Link href="/admin/einrichtung" className="font-medium underline underline-offset-2">
              Einrichtungsseite
            </Link>{" "}
            einen Zwei-Faktor-Code, trage ihn bei Vercel als <code className="font-mono text-xs">ADMIN_TOTP_SECRET</code> ein und starte das letzte
            Deployment neu.
          </Notice>
        ) : null}

        {stepsDone < steps.length ? (
          <Card>
            <CardHeader title="Erste Schritte" description={`${stepsDone} von ${steps.length} erledigt`} />
            <ol className="divide-y divide-line lg:grid lg:grid-cols-5 lg:divide-x lg:divide-y-0">
              {steps.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex h-full gap-3 px-5 py-4 transition-colors hover:bg-mist/60">
                    {s.done ? (
                      <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-slate/50" />
                    )}
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", s.done ? "text-slate line-through decoration-slate/40" : "text-ink")}>{s.label}</span>
                      <span className="mt-0.5 block text-xs text-slate">{s.hint}</span>
                      <span className="sr-only">{s.done ? "erledigt" : "offen"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile label="Offene Mandate" value={kpis.openMandates} hint="Neu, in Bearbeitung, angeboten, Interview" href="/admin/mandate?status=offen" icon={Briefcase} />
          <StatTile
            label="Aktive Kandidaten"
            value={kpis.activeCandidates}
            hint={`${kpis.newCandidates} neu, ${kpis.deployedCandidates} im Einsatz`}
            href="/admin/kandidaten?status=aktiv"
            icon={Users}
          />
          <StatTile label="Vorschläge diesen Monat" value={kpis.submissionsThisMonth} hint="An Auftraggeber weitergegeben" href="/admin/mandate?vorschlaege=monat" icon={Send} />
          <StatTile
            label="Verträge zur Unterschrift"
            value={kpis.contractsAwaitingSignature}
            hint="Status versendet"
            href="/admin/vertraege?status=versendet"
            icon={FileSignature}
            tone={kpis.contractsAwaitingSignature ? "amber" : "neutral"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader title="Heute wichtig" description={`Nächste Schritte bis ${formatDate(addDaysIso(today, 2))} und Fristen der nächsten 7 Tage.`} />
              {agenda.nextSteps.length || agenda.deadlines.length ? (
                <div className="divide-y divide-line">
                  {agenda.nextSteps.length ? (
                    <section aria-labelledby="dash-next-steps">
                      <h3 id="dash-next-steps" className="px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate uppercase">
                        Nächste Schritte
                      </h3>
                      <ul>
                        {agenda.nextSteps.map((m) => {
                          const due = dueBadge(m.nextStepAt!, today);
                          return (
                            <li key={m.id}>
                              <Link href={`/admin/mandate/${m.id}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 py-2.5 transition-colors hover:bg-mist/60">
                                <span className="min-w-0 flex-1 basis-56">
                                  <span className="block text-sm font-medium text-ink">{m.nextStep || "Nächster Schritt"}</span>
                                  <span className="block text-xs text-slate">
                                    <Mono className="mr-1.5">{displayNo.mandate(m.id)}</Mono>
                                    {m.title}
                                    {m.company ? ` · ${m.company}` : ""}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  {m.priority === "hoch" ? <Badge tone={toneOf(mandatePriorities, m.priority)}>Priorität hoch</Badge> : null}
                                  <Badge tone={due.tone}>{due.label}</Badge>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}
                  {agenda.deadlines.length ? (
                    <section aria-labelledby="dash-deadlines">
                      <h3 id="dash-deadlines" className="px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate uppercase">
                        Eingabefristen
                      </h3>
                      <ul>
                        {agenda.deadlines.map((m) => {
                          const due = dueBadge(m.deadline!, today);
                          return (
                            <li key={m.id}>
                              <Link href={`/admin/mandate/${m.id}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 py-2.5 transition-colors hover:bg-mist/60">
                                <span className="min-w-0 flex-1 basis-56">
                                  <span className="block text-sm font-medium text-ink">{m.title}</span>
                                  <span className="block text-xs text-slate">
                                    <Mono className="mr-1.5">{displayNo.mandate(m.id)}</Mono>
                                    {m.company ?? "Ohne Firma"} · <Badge tone={toneOf(mandateStatuses, m.status)} className="align-middle">{labelOf(mandateStatuses, m.status)}</Badge>
                                  </span>
                                </span>
                                <Badge tone={due.tone}>Frist {due.label}</Badge>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : (
                <CardBody>
                  <p className="text-sm text-slate">Keine fälligen Schritte und keine Fristen in den nächsten 7 Tagen.</p>
                </CardBody>
              )}
            </Card>

            <Card>
              <CardHeader title="Letzte Aktivitäten" description="Notizen und Ereignisse aus allen Bereichen." />
              {recent.length ? (
                <ol className="divide-y divide-line">
                  {recent.map((a) => {
                    const Icon = activityIcons[a.kind as keyof typeof activityIcons] ?? History;
                    return (
                      <li key={a.id} className="flex gap-3 px-5 py-3">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-mist text-slate">
                          <Icon aria-hidden className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm whitespace-pre-line text-ink">{a.body}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate">
                            <time dateTime={a.createdAt.toISOString()}>{formatDateTime(a.createdAt)}</time>
                            {a.links.map((l) => (
                              <Link key={l.href} href={l.href} className="max-w-full truncate text-blue hover:underline">
                                {l.label}
                              </Link>
                            ))}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState icon={History} title="Noch keine Aktivitäten">
                  Notizen, Statuswechsel und Vorschläge erscheinen hier, sobald du Datensätze bearbeitest.
                </EmptyState>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Kandidatenportal"
                description="Eingänge von Kandidaten, die du prüfen solltest."
                actions={portalTotal ? <Badge tone="amber">{portalTotal}</Badge> : null}
              />
              <ul className="divide-y divide-line py-1">
                <ReviewRow href="/admin/portal" label="Änderungsanträge offen" count={portal.changeRequests} />
                <ReviewRow href="/admin/portal" label="Hochgeladene Dokumente unbestätigt" count={portal.uploads} />
                <ReviewRow href="/admin/portal" label="Interesse an Vakanzen, nicht angesehen" count={portal.interested} tone="green" />
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Datenschutz"
                description="Aufbewahrung und Einwilligungen."
                actions={privacyTotal ? <Badge tone={privacy.overdue ? "red" : "amber"}>{privacyTotal}</Badge> : null}
              />
              <ul className="divide-y divide-line py-1">
                <ReviewRow href="/admin/datenschutz" label="Aufbewahrung abgelaufen" count={privacy.overdue} tone="red" hint="Anonymisieren, löschen oder mit Einwilligung verlängern" />
                <ReviewRow href="/admin/datenschutz" label="Aufbewahrung endet in 30 Tagen" count={privacy.dueSoon} />
                <ReviewRow href="/admin/datenschutz/einwilligung" label="Ohne Einwilligung seit über 30 Tagen" count={privacy.noConsentOld} />
                <ReviewRow href="/admin/datenschutz/einwilligung" label="Vorschläge warten auf Einwilligung" count={privacy.submissionsAwaitingConsent} />
              </ul>
            </Card>

            <Card>
              <CardHeader title="Zusammenarbeit" />
              <ul className="divide-y divide-line py-1">
                <ReviewRow
                  href="/admin/kandidaten?status=aktiv&firma=ohne"
                  label="Aktive Kandidaten ohne eigene Firma"
                  count={kpis.activeWithoutFirm}
                  hint="KOVALI arbeitet nur mit Fachpersonen über ihre GmbH oder AG."
                />
              </ul>
            </Card>

            <Card>
              <CardHeader title="Schnellzugriff" />
              <CardBody className="px-2 py-2">
                <ul className="space-y-0.5">
                  <QuickAction href="/admin/kandidaten/neu" label="Kandidat erfassen" icon={Users} />
                  <QuickAction href="/admin/mandate/neu" label="Mandat oder Vakanz erfassen" icon={Briefcase} />
                  <QuickAction href="/admin/firmen/neu" label="Firma anlegen" icon={Building2} />
                  <QuickAction href="/admin/vertraege/neu" label="Vertrag erstellen" icon={FileSignature} />
                  <QuickAction href="/admin/portal" label="Kandidatenportal" icon={Inbox} />
                  <QuickAction href="/admin/rechner" label="Marge berechnen" icon={Calculator} />
                  <QuickAction href="/admin/datenschutz/auskunft" label="Auskunft erteilen" icon={ShieldCheck} />
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
