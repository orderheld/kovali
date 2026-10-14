import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Building2, CheckCheck, MessageSquareText, Pencil } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, EmptyState, LinkButton, Mono, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDateTime } from "@/lib/admin/format";
import { changeSections, labelOf } from "@/lib/admin/options";
import { openChangeReviews, type ChangeReview } from "@/lib/portal/admin";
import { confirmChange } from "./actions";
import { CompleteForm, RejectForm } from "./client";
import { DiffView } from "./diff-view";
import { PortalHeader } from "./header";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Kandidatenportal" };

function ReviewCard({ review }: { review: ChangeReview }) {
  const stammdaten = review.section === "stammdaten";
  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/kandidaten/${review.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
              {review.name}
            </Link>
            <Mono>{displayNo.candidate(review.candidateId)}</Mono>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate">
            <Badge tone={stammdaten ? "violet" : "amber"}>{labelOf(changeSections, review.section)}</Badge>
            {review.firmProposed ? <Badge tone="blue">mit Firma</Badge> : null}
            <span>eingereicht {formatDateTime(review.updatedAt)}</span>
          </p>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        {review.message ? (
          <div className="flex gap-2.5 rounded-md bg-mist px-3 py-2.5 text-sm text-ink">
            <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
            <p className="whitespace-pre-line">{review.message}</p>
          </div>
        ) : null}

        {stammdaten ? (
          <>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-[0.8125rem] text-slate">E-Mail heute</span>
                {review.master?.email ?? "–"}
              </p>
              <p>
                <span className="block text-[0.8125rem] text-slate">Telefon heute</span>
                {review.master?.phone ?? "–"}
              </p>
              <p>
                <span className="block text-[0.8125rem] text-slate">Adresse heute</span>
                {review.master?.address || "–"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/admin/kandidaten/${review.candidateId}/bearbeiten`} icon={Pencil} size="sm">
                Stammdaten bearbeiten
              </LinkButton>
            </div>
            <div className="border-t border-line pt-4">
              <CompleteForm requestId={review.id} />
            </div>
          </>
        ) : (
          <>
            {review.invalid ? (
              <Notice tone="red" icon={AlertTriangle} title="Diese Angaben sind nicht mehr gültig">
                {review.invalid} Lehne die Änderung mit einer kurzen Notiz ab, damit die Person sie neu erfassen kann.
              </Notice>
            ) : (
              <DiffView items={review.diff ?? []} />
            )}
            {review.firmProposed ? (
              <Notice tone="blue" icon={Building2}>
                Beim Bestätigen wird die Firma als Subunternehmer angelegt oder aktualisiert und mit der Person verknüpft. Eine bestehende Firma mit derselben UID
                wird wiederverwendet.
              </Notice>
            ) : null}
            <div className="flex flex-wrap items-start gap-2 border-t border-line pt-4">
              {review.invalid ? null : (
                <ActionButton action={confirmChange.bind(null, review.id)} variant="primary" size="md" icon={<CheckCheck aria-hidden className="size-4" />}>
                  Bestätigen und übernehmen
                </ActionButton>
              )}
              <RejectForm requestId={review.id} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default async function PortalChangesPage() {
  await requireAdmin();
  const reviews = await openChangeReviews();

  return (
    <>
      <PortalHeader active="aenderungen" />
      {reviews.length ? (
        <div className="space-y-4">
          <p className="text-sm text-slate">
            Älteste zuerst. «Bestätigen» übernimmt die Angaben ins Profil; die Person sieht sie dann als bestätigt.
          </p>
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={CheckCheck} title="Keine offenen Änderungen">
            Wenn jemand im Portal sein Profil ändert oder eine Stammdaten-Änderung meldet, erscheint es hier.
          </EmptyState>
        </Card>
      )}
    </>
  );
}
