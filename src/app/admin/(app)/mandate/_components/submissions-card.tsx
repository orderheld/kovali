import Link from "next/link";
import { AlertTriangle, Building2, FileDown, Send, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardHeader, EmptyState, LinkButton, Mono, Notice } from "@/components/admin/ui";
import { consentState, consentSummary, hasValidConsent, objectionSummary, withdrawalSummary } from "@/lib/admin/consent";
import { firmOf, subcontractorCheck, type CandidateConsentBlock, type MandateSubmission } from "@/lib/admin/data/submissions";
import { displayNo, formatDate, formatDateTime, fullName } from "@/lib/admin/format";
import { labelOf, profileVariants, submissionStatuses, toneOf } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { clearConsent, markSubmitted, recordConsent, recordWithdrawal, removeSubmission, setSubmissionStatus, updateSubmissionTerms } from "../actions";
import { formatRate, marginInfo } from "../rules";
import { StatusControl } from "./status-control";
import { ConsentForm, TermsForm, WithdrawalForm } from "./submission-forms";

const detailsClass = "rounded-md border border-line bg-white [&[open]>summary]:border-b [&[open]>summary]:border-line";
const summaryClass =
  "cursor-pointer list-none rounded-md px-3 py-2 text-[0.8125rem] font-medium text-blue select-none hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden";

/** The candidate objects to any further hand-over; a new explicit consent lifts it. */
function ObjectionNotice({ s }: { s: MandateSubmission }) {
  if (!s.objectionAt) return null;
  return (
    <Notice tone="red" icon={ShieldAlert} title="Widerspruch gegen jede Weitergabe">
      <p>{objectionSummary(s)}</p>
      <p className="mt-1">
        Kein Profil geht weiter. Erst eine neue, ausdrückliche Einwilligung für dieses Mandat (ab {formatDate(s.objectionAt)}) hebt den Widerspruch auf, oder du hebst
        ihn beim Kandidaten mit Begründung auf.
      </p>
    </Notice>
  );
}

/** Consent of the candidate for this mandate: recorded, withdrawn or still missing. */
function ConsentBlock({
  s,
  name,
  recipient,
  block,
  today,
}: {
  s: MandateSubmission;
  name: string;
  recipient: string;
  block: CandidateConsentBlock | undefined;
  today: string;
}) {
  const state = consentState(s);
  if (state === "widerrufen") {
    return (
      <div className="space-y-2">
        <ObjectionNotice s={s} />
        <Notice tone="red" icon={ShieldAlert} title={s.consentAt ? "Einwilligung widerrufen" : "Möchte für dieses Mandat nicht vorgeschlagen werden"}>
          <p>{withdrawalSummary(s)}</p>
          {s.consentAt ? <p className="mt-1">Erteilt war sie am {consentSummary(s)}; das bleibt als Nachweis gespeichert.</p> : null}
          <p className="mt-1">Keine weitere Weitergabe, bis die Fachperson erneut einwilligt.</p>
          <details className={cn(detailsClass, "mt-3 text-ink")}>
            <summary className={summaryClass}>Erneute Einwilligung erfassen</summary>
            <div className="p-3">
              <ConsentForm action={recordConsent.bind(null, s.id)} today={today} submitLabel="Erneute Einwilligung erfassen" />
            </div>
          </details>
        </Notice>
      </div>
    );
  }
  if (state === "erteilt") {
    return (
      <div className="space-y-2">
        <ObjectionNotice s={s} />
        {/* Icon beside the text, never above it: the text wraps in its own column on phones. */}
        <div className="flex items-start gap-2 text-sm text-emerald-800">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <span>Einwilligung für dieses Mandat am {consentSummary(s)}</span>
            {s.submittedAt ? null : (
              <ActionButton
                action={clearConsent.bind(null, s.id)}
                confirm="Die Einwilligung wurde irrtümlich erfasst und soll entfernt werden?"
                variant="ghost"
                className="h-6 px-1.5 text-xs"
              >
                Irrtum: entfernen
              </ActionButton>
            )}
          </div>
        </div>
        <details className={detailsClass}>
          <summary className={summaryClass}>Widerruf oder Widerspruch erfassen</summary>
          <div className="p-3">
            <WithdrawalForm action={recordWithdrawal.bind(null, s.id)} today={today} />
          </div>
        </details>
      </div>
    );
  }
  const earlier = block?.latestWithdrawal && block.latestWithdrawal.mandateId !== s.mandateId ? block.latestWithdrawal : null;
  return (
    <div className="space-y-2">
      <ObjectionNotice s={s} />
      <Notice tone="amber" icon={AlertTriangle} title="Noch keine Einwilligung für dieses Mandat">
        <p>Erst wenn {name} zugestimmt hat, darf das Profil an {recipient} gehen.</p>
        {earlier ? (
          <p className="mt-1 font-medium text-red-800">
            Achtung: Bei {displayNo.mandate(earlier.mandateId)} am {formatDate(earlier.at)} widerrufen
            {earlier.note ? ` (${earlier.note})` : ""}. Erfasse eine Einwilligung nur, wenn die Fachperson für dieses Mandat ausdrücklich zustimmt.
          </p>
        ) : null}
        <div className="mt-3 rounded-md border border-amber-200 bg-white p-3 text-ink">
          <ConsentForm action={recordConsent.bind(null, s.id)} today={today} />
        </div>
        <details className={cn(detailsClass, "mt-2 text-ink")}>
          <summary className={summaryClass}>Widerspruch erfassen (möchte nicht vorgeschlagen werden)</summary>
          <div className="p-3">
            <WithdrawalForm action={recordWithdrawal.bind(null, s.id)} today={today} />
          </div>
        </details>
      </Notice>
    </div>
  );
}

function SubmissionItem({
  s,
  mandate,
  block,
  today,
}: {
  s: MandateSubmission;
  mandate: { id: number; companyId: number | null; companyName: string | null };
  block: CandidateConsentBlock | undefined;
  today: string;
}) {
  const name = fullName({ firstName: s.candidateFirstName, lastName: s.candidateLastName });
  const firm = subcontractorCheck(firmOf(s));
  const recipient = mandate.companyName ?? "den Auftraggeber";
  const margin = marginInfo(s.rateSell, s.rateBuy, s.rateUnit);
  const dossier = (format: "pdf" | "docx") =>
    `/admin/api/kandidaten/${s.candidateId}/dossier?format=${format}&variante=${s.profileVariant}&mandat=${mandate.id}`;
  const closed = s.status === "absage" || s.status === "zurueckgezogen";
  // After a withdrawal or an objection the hand-over button is not offered at all; the action refuses it as well.
  const blocked = Boolean(s.withdrawnAt || s.objectionAt);
  const canSubmit = !s.submittedAt && !blocked;

  return (
    <li id={`vorschlag-${s.id}`} className={cn("scroll-mt-24 space-y-3 px-5 py-4", closed && "bg-mist/40")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/admin/kandidaten/${s.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
              {name}
            </Link>
            <Mono>
              {displayNo.candidate(s.candidateId)} · {displayNo.submission(s.id)}
            </Mono>
            <Badge tone={toneOf(submissionStatuses, s.status)}>{labelOf(submissionStatuses, s.status)}</Badge>
          </p>
          {s.candidateHeadline ? <p className="text-[0.8125rem] text-slate">{s.candidateHeadline}</p> : null}
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate">
            <span>Vorgemerkt am {formatDate(s.createdAt)}</span>
            {s.matchScore !== null ? <span>Score {s.matchScore}</span> : null}
          </p>
        </div>
        <StatusControl label={`Status des Vorschlags für ${name}`} options={submissionStatuses} value={s.status} action={setSubmissionStatus.bind(null, s.id)} />
      </div>

      <div className="flex items-start gap-2 text-sm">
        <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-slate" />
        {firm.ok ? (
          <span className="min-w-0">
            Angebot über{" "}
            <Link href={`/admin/firmen/${firm.firm.id}`} className="font-medium text-ink hover:text-blue hover:underline">
              {firm.firm.name}
            </Link>
            {firm.firm.legalForm ? <span className="text-slate"> ({firm.firm.legalForm})</span> : null}, Subunternehmen von KOVALI
          </span>
        ) : (
          <span className="text-red-700">{firm.error}</span>
        )}
      </div>
      {firm.ok && firm.warning ? (
        <Notice tone="amber" icon={AlertTriangle}>
          {firm.warning}
        </Notice>
      ) : null}

      {s.submittedAt ? (
        <p className="flex items-start gap-2 rounded-md bg-blue/[0.05] px-3 py-2 text-sm text-ink">
          <Send aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
          <span className="min-w-0">
            Vorgeschlagen am {formatDateTime(s.submittedAt)} an {recipient}
            {s.subcontractorName ? ` über ${s.subcontractorName}` : ""}, Dossier {labelOf(profileVariants, s.profileVariant).toLowerCase()}.
          </span>
        </p>
      ) : null}

      <ConsentBlock s={s} name={name} recipient={recipient} block={block} today={today} />

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[0.8125rem] text-slate">Dossier</dt>
          <dd>{labelOf(profileVariants, s.profileVariant)}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-slate">Einkauf (Fachperson)</dt>
          <dd>{formatRate(s.rateBuy, s.rateUnit)}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-slate">Verkauf (Auftraggeber)</dt>
          <dd>{formatRate(s.rateSell, s.rateUnit)}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] text-slate">Marge</dt>
          <dd
            className={cn(
              margin?.tone === "red" && "font-medium text-red-700",
              margin?.tone === "amber" && "font-medium text-amber-800",
              margin?.tone === "green" && "text-emerald-700",
            )}
          >
            {margin ? margin.text : "–"}
            {margin?.tone === "red" ? <span className="block text-xs">Negativ: KOVALI würde draufzahlen.</span> : null}
          </dd>
        </div>
        {s.feedback ? (
          <div className="sm:col-span-full">
            <dt className="text-[0.8125rem] text-slate">Rückmeldung des Auftraggebers</dt>
            <dd className="whitespace-pre-line">{s.feedback}</dd>
          </div>
        ) : null}
        {s.notes ? (
          <div className="sm:col-span-full">
            <dt className="text-[0.8125rem] text-slate">Notizen</dt>
            <dd className="whitespace-pre-line">{s.notes}</dd>
          </div>
        ) : null}
      </dl>

      <details className={detailsClass}>
        <summary className={summaryClass}>Dossier, Sätze, Rückmeldung und Notizen bearbeiten</summary>
        <div className="p-3">
          <TermsForm
            action={updateSubmissionTerms.bind(null, s.id)}
            variantLocked={Boolean(s.submittedAt)}
            terms={{ profileVariant: s.profileVariant, rateBuy: s.rateBuy, rateSell: s.rateSell, rateUnit: s.rateUnit, feedback: s.feedback, notes: s.notes }}
          />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        {canSubmit ? (
          <ActionButton
            action={markSubmitted.bind(null, s.id)}
            confirm={`Hast du das Dossier (${labelOf(profileVariants, s.profileVariant).toLowerCase()}) an ${recipient} geschickt? Das wird mit Datum festgehalten.`}
            variant="primary"
            icon={<Send aria-hidden className="size-4" />}
          >
            Als vorgeschlagen markieren
          </ActionButton>
        ) : null}
        <LinkButton href={dossier("pdf")} size="sm" icon={FileDown}>
          Dossier PDF
        </LinkButton>
        <LinkButton href={dossier("docx")} size="sm" icon={FileDown}>
          Dossier Word
        </LinkButton>
        <ActionButton
          action={removeSubmission.bind(null, s.id)}
          confirm={
            s.submittedAt
              ? `Das Profil von ${name} wurde bereits vorgeschlagen. Vorschlag trotzdem entfernen? Der Verlauf bleibt.`
              : `Vorschlag für ${name} entfernen?`
          }
          variant="ghost"
          className="text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          Entfernen
        </ActionButton>
      </div>
      {canSubmit && !hasValidConsent(s) ? (
        <p className="text-xs text-slate">Dossier herunterladen geht schon jetzt, z. B. zur Abstimmung mit der Fachperson; weitergeben erst nach der Einwilligung.</p>
      ) : null}
      {blocked ? <p className="text-xs text-slate">Das Dossier ist als Entwurf «Nicht weitergeben» markiert.</p> : null}
    </li>
  );
}

export function SubmissionsCard({
  submissions,
  mandate,
  withdrawals,
  today,
}: {
  submissions: MandateSubmission[];
  mandate: { id: number; companyId: number | null; companyName: string | null };
  withdrawals: Map<number, CandidateConsentBlock>;
  today: string;
}) {
  const proposed = submissions.filter((s) => s.submittedAt).length;
  return (
    <Card>
      <CardHeader
        title="Vorschläge"
        description={
          submissions.length
            ? `${submissions.length} vorgemerkt, ${proposed} vorgeschlagen. Jede Weitergabe machst du selbst, nur mit Einwilligung für dieses Mandat.`
            : "Jede Weitergabe machst du selbst, nur mit Einwilligung der Fachperson für dieses Mandat."
        }
      />
      {mandate.companyId ? null : (
        <div className="px-5 pt-4">
          <Notice tone="amber" icon={AlertTriangle}>
            Dem Mandat ist keine Firma zugeordnet. Ohne Empfänger kann kein Profil als vorgeschlagen markiert werden.
          </Notice>
        </div>
      )}
      {submissions.length ? (
        <ul className="divide-y divide-line">
          {submissions.map((s) => (
            <SubmissionItem key={s.id} s={s} mandate={mandate} block={withdrawals.get(s.candidateId)} today={today} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Users} title="Noch niemand vorgemerkt">
          Merke passende Kandidaten in der Liste oben vor. Danach erfasst du hier Einwilligung, Sätze und den Vorschlag.
        </EmptyState>
      )}
    </Card>
  );
}
