import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Send, UserCheck } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Mono, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDate, fullName, todayIso } from "@/lib/admin/format";
import { candidateSources, candidateStatuses, labelOf, submissionStatuses, toneOf } from "@/lib/admin/options";
import {
  CONSENT_MISSING_ALERT_DAYS,
  RETENTION_MONTHS_WITHOUT_CONSENT,
  candidatesWithoutConsent,
  privacyCounts,
  retentionState,
  submissionsWithoutConsent,
} from "@/lib/admin/privacy";
import { PrivacyHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Einwilligungen" };

function ageInDays(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}

export default async function ConsentPage() {
  await requireAdmin();
  const now = new Date();
  const today = todayIso(now);
  const [people, pending, counts] = await Promise.all([candidatesWithoutConsent(), submissionsWithoutConsent(), privacyCounts(today)]);
  const old = people.filter((p) => ageInDays(p.createdAt, now) > CONSENT_MISSING_ALERT_DAYS).length;

  return (
    <>
      <PrivacyHeader active="einwilligung" counts={{ aufbewahrung: counts.overdue, einwilligung: counts.noConsentOld + counts.submissionsAwaitingConsent }} />

      <Notice tone="blue" title="Wofür die Einwilligung nötig ist">
        Ein Profil geht nur mit Einwilligung der Person für das konkrete Mandat an einen Auftraggeber; die Datenbank lässt einen Vorschlag ohne Einwilligung nicht zu.
        Für den Talent-Pool (Aufbewahrung über {RETENTION_MONTHS_WITHOUT_CONSENT} Monate) braucht es eine dokumentierte Einwilligung, z. B. per E-Mail oder im
        Kandidatenportal. Erfasse sie im Kandidatenprofil mit Datum und kurzer Notiz.
      </Notice>

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader
            title={`Vorschläge ohne Einwilligung (${pending.length})`}
            description="Diese Vorschläge warten auf die Zustimmung der Person, bevor das Profil an den Auftraggeber geht."
          />
          {pending.length ? (
            <ul className="divide-y divide-line">
              {pending.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/admin/kandidaten/${s.candidateId}`} className="font-medium text-ink hover:text-blue">
                        {fullName(s)}
                      </Link>
                      <Mono>{displayNo.submission(s.id)}</Mono>
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-slate">
                      für{" "}
                      <Link href={`/admin/mandate/${s.mandateId}`} className="text-ink hover:text-blue">
                        {s.mandateTitle}
                      </Link>
                      {s.company ? ` bei ${s.company}` : ""} · erfasst {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <Badge tone={s.status === "einwilligung_offen" ? "amber" : "red"}>
                    {s.status === "einwilligung_offen" ? labelOf(submissionStatuses, s.status) : `${labelOf(submissionStatuses, s.status)} ohne Einwilligung`}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Send} title="Keine offenen Einwilligungen">
              Alle Vorschläge an Auftraggeber haben eine erfasste Einwilligung.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Kandidaten ohne Einwilligung (${people.length})`}
            description={
              old
                ? `${old} davon seit über ${CONSENT_MISSING_ALERT_DAYS} Tagen erfasst. Einwilligung einholen oder das Profil nach ${RETENTION_MONTHS_WITHOUT_CONSENT} Monaten anonymisieren.`
                : "Älteste zuerst."
            }
          />
          {people.length ? (
            <ul className="divide-y divide-line">
              {people.map((p) => {
                const age = ageInDays(p.createdAt, now);
                const state = retentionState(p.retentionUntil, today);
                return (
                  <li key={p.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={`/admin/kandidaten/${p.id}`} className="font-medium text-ink hover:text-blue">
                          {fullName(p)}
                        </Link>
                        <Mono>{displayNo.candidate(p.id)}</Mono>
                        <Badge tone={toneOf(candidateStatuses, p.status)}>{labelOf(candidateStatuses, p.status)}</Badge>
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-[0.8125rem] text-slate">
                        <span>Erfasst {formatDate(p.createdAt)}</span>
                        {p.source ? <span>Quelle: {labelOf(candidateSources, p.source)}</span> : null}
                        <span>
                          {p.retentionUntil ? `Aufbewahren bis ${formatDate(p.retentionUntil)}` : "Kein Aufbewahrungsdatum"}
                          {state === "overdue" ? " (abgelaufen)" : ""}
                        </span>
                      </p>
                    </div>
                    <Badge tone={age > CONSENT_MISSING_ALERT_DAYS ? "amber" : "neutral"} className="self-start sm:self-center">
                      seit {age} {age === 1 ? "Tag" : "Tagen"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={UserCheck} title="Alle Kandidaten haben eingewilligt">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 aria-hidden className="size-4 text-emerald-600" />
                Nichts zu tun.
              </span>
            </EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
