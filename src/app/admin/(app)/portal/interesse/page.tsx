import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Check, HandHeart, MessageSquareText, Undo2 } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardHeader, EmptyState, Mono } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDate, formatDateTime } from "@/lib/admin/format";
import { consentDetails, withdrawalSummary } from "@/lib/admin/consent";
import { consentMethods, labelOf, submissionStatuses, toneOf } from "@/lib/admin/options";
import { openInterests, openWithdrawals, type ShareReview } from "@/lib/portal/admin";
import { markInterestReviewed } from "../actions";
import { PortalHeader } from "../header";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Portal-Interesse" };

function ShareRow({ s, withdrawal }: { s: ShareReview; withdrawal?: boolean }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/admin/kandidaten/${s.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
            {s.firstName} {s.lastName}
          </Link>
          <Mono>{displayNo.candidate(s.candidateId)}</Mono>
          <span className="text-slate">→</span>
          <Link href={`/admin/mandate/${s.mandateId}`} className="font-medium text-ink hover:text-blue hover:underline">
            {s.mandateTitle}
          </Link>
          <Mono>{displayNo.mandate(s.mandateId)}</Mono>
        </p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate">
          {s.responseAt ? <span>{withdrawal ? "zurückgezogen" : "gemeldet"} {formatDateTime(s.responseAt)}</span> : null}
          {s.submissionId ? (
            <Badge tone={toneOf(submissionStatuses, s.submissionStatus)}>Vorschlag: {labelOf(submissionStatuses, s.submissionStatus)}</Badge>
          ) : null}
          {s.withdrawnAt ? (
            <Badge tone="red">Widerrufen {formatDate(s.withdrawnAt)}</Badge>
          ) : s.consentAt ? (
            <Badge tone="green">
              Einwilligung {formatDate(s.consentAt)} ({labelOf(consentMethods, s.consentMethod)})
            </Badge>
          ) : (
            <Badge tone="amber">Keine Einwilligung</Badge>
          )}
          {s.objectionAt ? <Badge tone="red">Widerspruch seit {formatDate(s.objectionAt)}</Badge> : null}
          {s.companyId ? (
            <Badge tone="neutral">
              <Building2 aria-hidden className="size-3" />
              Firma verknüpft
            </Badge>
          ) : (
            <Badge tone="amber">
              <Building2 aria-hidden className="size-3" />
              Keine bestätigte Firma
            </Badge>
          )}
        </p>
        {s.withdrawnAt && s.submittedAt ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Profil wurde am {formatDate(s.submittedAt)} schon weitergegeben. Die Einwilligung bleibt als Nachweis gespeichert; gib das Profil nicht weiter und
            informiere bei Bedarf den Auftraggeber.
            {withdrawal ? null : " Die Person meldet erneut Interesse: Erfasse im Mandat eine erneute Einwilligung, wenn sie das ausdrücklich bestätigt."}
          </p>
        ) : null}
        {s.responseMessage ? (
          <p className="flex gap-2 rounded-md bg-mist px-3 py-2 text-sm text-ink">
            <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
            <span className="whitespace-pre-line">{s.responseMessage}</span>
          </p>
        ) : null}
        {s.consentAt && !s.withdrawnAt && consentDetails(s) ? <p className="text-xs text-slate">Einwilligung: {consentDetails(s)}</p> : null}
        {s.withdrawnAt ? <p className="text-xs text-slate">{withdrawalSummary(s)}</p> : null}
      </div>
      <ActionButton action={markInterestReviewed.bind(null, s.id)} icon={<Check aria-hidden className="size-4" />}>
        Erledigt
      </ActionButton>
    </li>
  );
}

export default async function PortalInterestPage() {
  await requireAdmin();
  const [interests, withdrawals] = await Promise.all([openInterests(), openWithdrawals()]);

  return (
    <>
      <PortalHeader active="interesse" />
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Neues Interesse"
            description="Die Person hat im Portal eingewilligt, dass ihr Profil für dieses Mandat weitergegeben wird. Sie steht im Mandat als Vorschlag; gab es noch keinen, ist er neu angelegt (vorgemerkt)."
          />
          {interests.length ? (
            <ul className="divide-y divide-line">
              {interests.map((s) => (
                <ShareRow key={s.id} s={s} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={HandHeart} title="Kein neues Interesse">
              Meldet jemand im Portal Interesse an einer Vakanz, erscheint es hier.
            </EmptyState>
          )}
        </Card>
        {withdrawals.length ? (
          <Card>
            <CardHeader
              title="Zurückgezogen"
              icon={Undo2}
              description="Interesse oder Einwilligung im Portal zurückgezogen, obwohl die Person schon als Vorschlag erfasst ist."
            />
            <ul className="divide-y divide-line">
              {withdrawals.map((s) => (
                <ShareRow key={s.id} s={s} withdrawal />
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
