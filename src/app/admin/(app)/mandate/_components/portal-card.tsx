import Link from "next/link";
import { AlertTriangle, Check, Info } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, Mono, Notice } from "@/components/admin/ui";
import type { MandateDetail } from "@/lib/admin/data/mandates";
import type { MandateShare, MandateSubmission } from "@/lib/admin/data/submissions";
import { displayNo, formatDate, formatDateTime, fullName } from "@/lib/admin/format";
import { labelOf, portalVisibilities, shareResponses, submissionStatuses, toneOf } from "@/lib/admin/options";
import { markShareReviewed, removeShare, savePortal, shareWithCandidates } from "../actions";
import { PortalForm, SharePicker, type ShareChoice } from "./portal-forms";

export function PortalCard({
  mandate,
  shares,
  submissions,
  choices,
  kovaliVatRegistered,
}: {
  mandate: MandateDetail;
  shares: MandateShare[];
  submissions: MandateSubmission[];
  choices: ShareChoice[];
  /** For the margin preview: without a VAT number the subcontractor's VAT is a cost. */
  kovaliVatRegistered: boolean;
}) {
  const ready = Boolean(mandate.portalTitle && mandate.portalDescription);
  const visibilityTone = mandate.portalVisibility === "keine" ? "neutral" : "green";
  const submissionOf = new Map(submissions.map((s) => [s.candidateId, s]));
  const open = shares.filter((s) => s.response === "interessiert" && !s.reviewedAt).length;

  return (
    <Card>
      <CardHeader
        title="Kandidatenportal"
        description="Wie die Vakanz im Portal erscheint und mit wem du sie teilst."
        actions={<Badge tone={visibilityTone}>{labelOf(portalVisibilities, mandate.portalVisibility)}</Badge>}
      />
      <CardBody className="space-y-4">
        <Notice tone="neutral" icon={Info}>
          Im Portal erscheint das Mandat als Projekteinsatz für Fachleute mit eigener GmbH oder AG (Subunternehmen von KOVALI); KOVALI ist
          Vertragspartei gegenüber dem Auftraggeber. Nenne weder Endkunde noch Auftraggeber, ausser du willst es ausdrücklich.
        </Notice>
        <PortalForm
          action={savePortal.bind(null, mandate.id)}
          values={{
            portalVisibility: mandate.portalVisibility,
            portalTitle: mandate.portalTitle,
            portalDescription: mandate.portalDescription,
            portalRate: mandate.portalRate,
            portalRateUnit: mandate.portalRateUnit,
          }}
          context={{
            suggestedTitle: mandate.title,
            suggestedDescription: mandate.description,
            confidentialNames: [mandate.endClient, mandate.companyName].filter((n): n is string => Boolean(n)),
            rateSell: mandate.rateSell,
            rateUnit: mandate.rateUnit,
            workload: mandate.workload,
            kovaliVatRegistered,
          }}
        />
      </CardBody>

      <section aria-labelledby="teilen-titel" className="border-t border-line">
        <CardBody className="space-y-3">
          <div>
            <h3 id="teilen-titel" className="text-sm font-semibold text-ink">
              Mit Kandidaten teilen
            </h3>
            <p className="mt-0.5 text-sm text-slate">
              Die Kandidaten sehen die Vakanz im Portal und können Interesse melden. Vorausgewählt sind gute Treffer mit eigener Firma, die die
              Vakanz noch nicht haben.
            </p>
          </div>
          {ready ? (
            <SharePicker action={shareWithCandidates.bind(null, mandate.id)} choices={choices} />
          ) : (
            <Notice tone="amber" icon={AlertTriangle}>
              Speichere zuerst Titel und Beschreibung fürs Portal. Kandidaten sehen nur diese Texte, nie die internen Angaben.
            </Notice>
          )}
        </CardBody>
      </section>

      {shares.length ? (
        <section aria-labelledby="freigaben-titel" className="border-t border-line">
          <h3 id="freigaben-titel" className="flex flex-wrap items-center gap-2 px-5 pt-4 text-sm font-semibold text-ink">
            Geteilt mit {shares.length} {shares.length === 1 ? "Kandidat" : "Kandidaten"}
            {open ? <Badge tone="amber">{open} neue Antwort{open === 1 ? "" : "en"}</Badge> : null}
          </h3>
          <ul className="divide-y divide-line">
            {shares.map((sh) => {
              const name = fullName({ firstName: sh.candidateFirstName, lastName: sh.candidateLastName });
              const submission = submissionOf.get(sh.candidateId);
              const needsReview = sh.response === "interessiert" && !sh.reviewedAt;
              return (
                <li key={sh.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={`/admin/kandidaten/${sh.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {name}
                      </Link>
                      <Mono>{displayNo.candidate(sh.candidateId)}</Mono>
                      <Badge tone={toneOf(shareResponses, sh.response)}>{labelOf(shareResponses, sh.response)}</Badge>
                      {needsReview ? <Badge tone="amber">Neu</Badge> : null}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate">
                      <span>Geteilt am {formatDate(sh.sharedAt)}</span>
                      <span>{sh.seenAt ? `Gesehen am ${formatDateTime(sh.seenAt)}` : "Noch nicht gesehen"}</span>
                      {sh.responseAt ? <span>Antwort am {formatDateTime(sh.responseAt)}</span> : null}
                      {sh.reviewedAt ? <span>Erledigt am {formatDate(sh.reviewedAt)}</span> : null}
                    </p>
                    {sh.responseMessage ? (
                      <blockquote className="mt-1.5 border-l-2 border-line pl-3 text-sm whitespace-pre-line text-ink">{sh.responseMessage}</blockquote>
                    ) : null}
                    {sh.response === "interessiert" && submission ? (
                      <p className="mt-1.5 text-xs text-slate">
                        <a href={`#vorschlag-${submission.id}`} className="text-blue hover:underline">
                          Vorschlag {displayNo.submission(submission.id)}
                        </a>
                        : {labelOf(submissionStatuses, submission.status)}
                        {submission.withdrawnAt
                          ? ` · widerrufen am ${formatDate(submission.withdrawnAt)}`
                          : submission.consentAt
                            ? ` · Einwilligung ${formatDate(submission.consentAt)}`
                            : " · noch ohne Einwilligung"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {needsReview ? (
                      <ActionButton action={markShareReviewed.bind(null, sh.id)} variant="primary" icon={<Check aria-hidden className="size-4" />}>
                        Erledigt
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      action={removeShare.bind(null, sh.id)}
                      confirm={`Freigabe für ${name} entfernen? Die Vakanz verschwindet aus dem Portal dieser Person.`}
                      variant="ghost"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      Entfernen
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}
