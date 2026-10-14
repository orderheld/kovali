import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarClock, CheckCircle2, FileQuestion, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Mono, Notice, StatTile } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDate, fullName, todayIso } from "@/lib/admin/format";
import { candidateSources, candidateStatuses, labelOf, toneOf } from "@/lib/admin/options";
import {
  RETENTION_DUE_SOON_DAYS,
  RETENTION_MONTHS_WITH_CONSENT,
  RETENTION_MONTHS_WITHOUT_CONSENT,
  addDaysIso,
  maxRetentionDate,
  privacyCounts,
  retentionDue,
  withoutRetentionDate,
} from "@/lib/admin/privacy";
import { anonymiseCandidateAction, deleteCandidateAction, extendRetention } from "./actions";
import { RetentionActions } from "./retention-actions";
import { PrivacyHeader } from "./tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Datenschutz" };

type DueRow = Awaited<ReturnType<typeof retentionDue>>["overdue"][number];

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function DueList({ rows, today, overdue }: { rows: DueRow[]; today: string; overdue: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const no = displayNo.candidate(r.id);
        const days = daysBetween(today, r.retentionUntil!);
        const hasConsent = Boolean(r.consentAt);
        return (
          <li key={r.id} className="px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/admin/kandidaten/${r.id}`} className="font-medium text-ink hover:text-blue">
                    {fullName(r)}
                  </Link>
                  <Mono>{no}</Mono>
                  <Badge tone={toneOf(candidateStatuses, r.status)}>{labelOf(candidateStatuses, r.status)}</Badge>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-slate">
                  <span>
                    Aufbewahren bis <span className="font-medium text-ink">{formatDate(r.retentionUntil)}</span>{" "}
                    <Badge tone={overdue ? "red" : "amber"}>
                      {overdue ? `seit ${-days} ${-days === 1 ? "Tag" : "Tagen"} fällig` : days === 0 ? "heute fällig" : `in ${days} ${days === 1 ? "Tag" : "Tagen"}`}
                    </Badge>
                  </span>
                  <span>{hasConsent ? `Einwilligung vom ${formatDate(r.consentAt)}` : "Keine Einwilligung"}</span>
                  <span>Erfasst {formatDate(r.createdAt)}</span>
                  {r.lastContactAt ? <span>Letzter Kontakt {formatDate(r.lastContactAt)}</span> : null}
                  {r.source ? <span>Quelle: {labelOf(candidateSources, r.source)}</span> : null}
                  <span>
                    {r.documents === 1 ? "1 Dokument" : `${r.documents} Dokumente`}
                    {r.contracts ? `, ${r.contracts === 1 ? "1 Vertrag" : `${r.contracts} Verträge`}` : ""}
                  </span>
                </p>
              </div>
              <div className="lg:max-w-xl lg:shrink-0">
                <RetentionActions
                  no={no}
                  hasConsent={hasConsent}
                  documents={r.documents}
                  contracts={r.contracts}
                  minDate={addDaysIso(today, 1)}
                  maxDate={maxRetentionDate(hasConsent, today)}
                  extendAction={extendRetention.bind(null, r.id)}
                  anonymiseAction={anonymiseCandidateAction.bind(null, r.id)}
                  deleteAction={deleteCandidateAction.bind(null, r.id)}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function PrivacyPage() {
  await requireAdmin();
  const today = todayIso();
  const [{ overdue, dueSoon }, counts, noDate] = await Promise.all([retentionDue(today), privacyCounts(today), withoutRetentionDate()]);

  return (
    <>
      <PrivacyHeader active="aufbewahrung" counts={{ aufbewahrung: counts.overdue, einwilligung: counts.noConsentOld + counts.submissionsAwaitingConsent }} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Überfällig" value={counts.overdue} icon={AlarmClock} tone={counts.overdue ? "red" : "neutral"} hint="Aufbewahrungsfrist abgelaufen" />
        <StatTile label={`In ${RETENTION_DUE_SOON_DAYS} Tagen fällig`} value={counts.dueSoon} icon={CalendarClock} tone={counts.dueSoon ? "amber" : "neutral"} hint={`bis ${formatDate(addDaysIso(today, RETENTION_DUE_SOON_DAYS))}`} />
        <StatTile
          label="Ohne Einwilligung"
          value={counts.noConsentOld}
          icon={FileQuestion}
          tone={counts.noConsentOld ? "amber" : "neutral"}
          hint="seit über 30 Tagen erfasst"
          href="/admin/datenschutz/einwilligung"
        />
        <StatTile label="Ohne Aufbewahrungsdatum" value={noDate} icon={ShieldCheck} tone={noDate ? "amber" : "neutral"} hint="werden nicht überwacht" />
      </div>

      <Notice tone="blue" title="So funktioniert die Aufbewahrung" className="mt-6">
        Ohne Einwilligung bleibt ein Profil höchstens {RETENTION_MONTHS_WITHOUT_CONSENT} Monate, mit dokumentierter Einwilligung bis {RETENTION_MONTHS_WITH_CONSENT}{" "}
        Monate. Ist die Frist abgelaufen, entscheidest du: verlängern (nur mit Begründung, z. B. neue Einwilligung), anonymisieren (Statistik bleibt ohne Namen) oder
        löschen. Nichts wird automatisch gelöscht; jeder Schritt steht im Löschprotokoll.
      </Notice>

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader
            title={`Überfällig (${overdue.length})`}
            description="Die Aufbewahrungsfrist ist abgelaufen. Bitte verlängern, anonymisieren oder löschen."
          />
          {overdue.length ? (
            <DueList rows={overdue} today={today} overdue />
          ) : (
            <EmptyState icon={CheckCircle2} title="Nichts überfällig">
              Alle Profile mit Aufbewahrungsdatum sind innerhalb der Frist.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title={`Bald fällig (${dueSoon.length})`} description={`Frist läuft in den nächsten ${RETENTION_DUE_SOON_DAYS} Tagen ab. Jetzt Einwilligung erneuern oder Ende planen.`} />
          {dueSoon.length ? (
            <DueList rows={dueSoon} today={today} overdue={false} />
          ) : (
            <EmptyState icon={CalendarClock} title={`Keine Frist in den nächsten ${RETENTION_DUE_SOON_DAYS} Tagen`} />
          )}
        </Card>

        {noDate ? (
          <Notice tone="amber" title={`${noDate} ${noDate === 1 ? "Profil hat" : "Profile haben"} kein Aufbewahrungsdatum`}>
            Ohne Datum erscheinen sie hier nie. Setze das Datum im Kandidatenprofil (Feld «Aufbewahren bis»):{" "}
            <Link href="/admin/kandidaten" className="font-medium underline underline-offset-2">
              zu den Kandidaten
            </Link>
            .
          </Notice>
        ) : null}
      </div>
    </>
  );
}
