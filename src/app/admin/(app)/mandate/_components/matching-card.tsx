import Link from "next/link";
import { AlertTriangle, Check, FileSearch, Scale, UserSearch, X } from "lucide-react";
import { Badge, buttonClass, Card, CardBody, CardHeader, EmptyState, LinkButton, Mono, Notice } from "@/components/admin/ui";
import type { MatchPoolCandidate } from "@/lib/admin/data/mandates";
import { objectionSummary } from "@/lib/admin/consent";
import { firmOf, NO_OWN_FIRM, subcontractorCheck, type CandidateConsentBlock } from "@/lib/admin/data/submissions";
import { displayNo, formatDate, fullName } from "@/lib/admin/format";
import type { MatchResult } from "@/lib/admin/matching";
import { candidateStatuses, labelOf, submissionStatuses, toneOf } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { reserveCandidate } from "../actions";
import { ReserveButton } from "./reserve-button";

export interface MatchItem {
  candidate: MatchPoolCandidate;
  match: MatchResult;
}

function ScoreMeter({ score }: { score: number }) {
  const bar = score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-blue" : "bg-slate/45";
  return (
    <div className="w-24 shrink-0 pt-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate">Score</span>
        <span className="text-sm font-semibold text-ink tabular-nums">{score}</span>
      </div>
      <div
        role="meter"
        aria-label="Übereinstimmung mit den Anforderungen"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/80"
      >
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/** A skill of the mandate: found in the profile, only in the CV text, or missing. */
function SkillChip({ name, state }: { name: string; state: "profile" | "cv" | "missing" }) {
  if (state === "missing") {
    return (
      <Badge tone="neutral" className="text-slate/90">
        <X aria-hidden className="size-3" />
        {name}
        <span className="sr-only"> (fehlt)</span>
      </Badge>
    );
  }
  if (state === "cv") {
    return (
      <Badge tone="amber">
        <FileSearch aria-hidden className="size-3" />
        {name}
        <span className="font-normal">· nur im CV</span>
      </Badge>
    );
  }
  return (
    <Badge tone="green">
      <Check aria-hidden className="size-3" />
      {name}
      <span className="sr-only"> (im Profil)</span>
    </Badge>
  );
}

/** "Eigene Firma" with the firm's name, or why a hand-over is not possible. */
function FirmBadges({ candidate }: { candidate: MatchPoolCandidate }) {
  const check = subcontractorCheck(firmOf(candidate));
  if (!check.ok) return <Badge tone="amber">Keine Firma</Badge>;
  return (
    <>
      <Badge tone="green">Eigene Firma</Badge>
      {check.warning ? (
        <Badge tone="amber">
          <span title={check.warning}>{check.firm.legalForm?.trim() ? "Keine GmbH/AG" : "Rechtsform offen"}</span>
        </Badge>
      ) : null}
    </>
  );
}

export function MatchingCard({
  mandateId,
  items,
  rankedCount,
  poolSize,
  hiddenWithoutFirm,
  showAll,
  highlightId,
  hasCriteria,
  submissionByCandidate,
  withdrawals,
  toggleHref,
}: {
  mandateId: number;
  items: MatchItem[];
  /** Candidates in the ranking (after the firm filter). */
  rankedCount: number;
  /** All candidates that could be matched. */
  poolSize: number;
  /** Candidates left out because they have no own firm (when the filter is on). */
  hiddenWithoutFirm: number;
  showAll: boolean;
  highlightId: number | null;
  hasCriteria: boolean;
  submissionByCandidate: Map<number, { id: number; status: string }>;
  withdrawals: Map<number, CandidateConsentBlock>;
  toggleHref: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Passende Kandidaten"
        description={
          items.length
            ? `Die ${Math.min(items.length, rankedCount)} besten von ${rankedCount} Kandidaten${showAll ? "" : " mit eigener Firma"} (ohne archivierte).`
            : undefined
        }
        actions={
          // A link, not a checkbox: the filter is part of the URL, like the list filters.
          <Link href={toggleHref} scroll={false} className={buttonClass("secondary", "sm")}>
            <span
              aria-hidden
              className={cn("flex size-3.5 items-center justify-center rounded-sm border", showAll ? "border-slate/50" : "border-blue bg-blue text-white")}
            >
              {showAll ? null : <Check className="size-3" />}
            </span>
            Nur mit eigener Firma<span className="sr-only">{showAll ? ": aus" : ": an"}</span>
          </Link>
        }
      />
      <CardBody className="space-y-3 border-b border-line">
        <Notice tone="blue" icon={Scale} title="Der Score ist ein Vorschlag, kein Entscheid.">
          Er vergleicht nur Profildaten mit den Anforderungen: Muss-Kompetenzen (45 Punkte), Kann-Kompetenzen (10), Schwerpunkt (15), Seniorität
          (10), Verfügbarkeit (10), Pensum (5) und Satz (5). Jeder Punkt ist unten begründet. Ob jemand passt und vorgeschlagen wird, entscheidest
          du, nach Rücksprache mit der Fachperson.
        </Notice>
        {!hasCriteria ? (
          <Notice tone="amber" icon={AlertTriangle}>
            Erfasse Muss-Kompetenzen und Schwerpunkte, damit die Rangliste aussagekräftig wird.
          </Notice>
        ) : null}
        {!showAll && hiddenWithoutFirm > 0 ? (
          <p className="text-[0.8125rem] text-slate">
            {hiddenWithoutFirm} {hiddenWithoutFirm === 1 ? "Kandidat ohne eigene Firma ist" : "Kandidaten ohne eigene Firma sind"} ausgeblendet. Profile
            gehen nur über die eigene GmbH oder AG der Fachperson (Subunternehmen von KOVALI).
          </p>
        ) : null}
      </CardBody>
      {items.length ? (
        <ol className="divide-y divide-line">
          {items.map(({ candidate: c, match }) => {
            const highlighted = c.id === highlightId;
            const submission = submissionByCandidate.get(c.id);
            const firm = subcontractorCheck(firmOf(c));
            const block = withdrawals.get(c.id);
            const objection = block?.objection ? objectionSummary({ objectionAt: block.objection.at, objectionNote: block.objection.note }) : null;
            const withdrawal = block?.latestWithdrawal
              ? `Einwilligung bei ${displayNo.mandate(block.latestWithdrawal.mandateId)} am ${formatDate(block.latestWithdrawal.at)} widerrufen`
              : null;
            const candidateHref = `/admin/kandidaten/${c.id}`;
            return (
              <li
                key={c.id}
                id={`kandidat-${c.id}`}
                className={cn("scroll-mt-24 px-5 py-4", highlighted && "bg-blue/[0.04] ring-2 ring-blue/30 ring-inset")}
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <ScoreMeter score={match.score} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={candidateHref} className="font-medium text-ink hover:text-blue hover:underline">
                        {fullName(c)}
                      </Link>
                      <Mono>{displayNo.candidate(c.id)}</Mono>
                      {highlighted ? <Badge tone="blue">Ausgewählt</Badge> : null}
                      {c.status !== "aktiv" ? <Badge tone={toneOf(candidateStatuses, c.status)}>{labelOf(candidateStatuses, c.status)}</Badge> : null}
                      <FirmBadges candidate={c} />
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-slate">
                      {[c.headline, firm.ok ? `über ${firm.firm.name}` : null].filter(Boolean).join(" · ") || "–"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {submission ? (
                      <a href={`#vorschlag-${submission.id}`} className="inline-flex flex-col items-end gap-0.5 text-xs text-slate hover:underline">
                        <Badge tone={toneOf(submissionStatuses, submission.status)}>{labelOf(submissionStatuses, submission.status)}</Badge>
                        <span>zum Vorschlag</span>
                      </a>
                    ) : c.status === "archiviert" ? null : c.objectionAt ? (
                      <span className="flex flex-col items-start gap-1 sm:items-end">
                        <button type="button" disabled aria-describedby={`widerspruch-${c.id}`} className={buttonClass("secondary", "sm")}>
                          Vormerken
                        </button>
                        <span id={`widerspruch-${c.id}`} className="max-w-56 text-xs text-red-700 sm:text-right">
                          Widerspruch gegen jede Weitergabe.{" "}
                          <Link href={candidateHref} className="font-medium underline">
                            Zum Kandidaten
                          </Link>
                        </span>
                      </span>
                    ) : firm.ok ? (
                      <ReserveButton action={reserveCandidate.bind(null, mandateId, c.id)} candidateHref={candidateHref} firmError={NO_OWN_FIRM} />
                    ) : (
                      <span className="flex flex-col items-start gap-1 sm:items-end">
                        <button type="button" disabled aria-describedby={`ohne-firma-${c.id}`} className={buttonClass("secondary", "sm")}>
                          Vormerken
                        </button>
                        <span id={`ohne-firma-${c.id}`} className="max-w-56 text-xs text-amber-800 sm:text-right">
                          Keine eigene Firma erfasst.{" "}
                          <Link href={candidateHref} className="font-medium underline">
                            Firma verknüpfen
                          </Link>
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                {match.matchedRequired.length + match.missingRequired.length + match.matchedNice.length > 0 ? (
                  <dl className="mt-3 grid gap-x-3 gap-y-1.5 text-[0.8125rem] sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                    {match.matchedRequired.length + match.missingRequired.length > 0 ? (
                      <>
                        <dt className="text-slate">Muss</dt>
                        <dd className="flex flex-wrap gap-1">
                          {match.matchedRequired.map((s) => (
                            <SkillChip key={s} name={s} state={match.fromCvOnly.includes(s) ? "cv" : "profile"} />
                          ))}
                          {match.missingRequired.map((s) => (
                            <SkillChip key={s} name={s} state="missing" />
                          ))}
                        </dd>
                      </>
                    ) : null}
                    {match.matchedNice.length ? (
                      <>
                        <dt className="text-slate">Kann</dt>
                        <dd className="flex flex-wrap gap-1">
                          {match.matchedNice.map((s) => (
                            <SkillChip key={s} name={s} state="profile" />
                          ))}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                ) : null}
                {match.reasons.length ? <p className="mt-2 text-xs text-slate">{match.reasons.join(" · ")}</p> : null}
                {match.warnings.length || objection || withdrawal ? (
                  <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {objection ? (
                      <li className="flex items-center gap-1 font-medium text-red-700">
                        <AlertTriangle aria-hidden className="size-3.5" />
                        {objection}
                      </li>
                    ) : null}
                    {withdrawal ? (
                      <li className="flex items-center gap-1 font-medium text-red-700">
                        <AlertTriangle aria-hidden className="size-3.5" />
                        {withdrawal}
                      </li>
                    ) : null}
                    {match.warnings.map((w) => (
                      <li key={w} className="flex items-center gap-1 text-amber-800">
                        <AlertTriangle aria-hidden className="size-3.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          icon={UserSearch}
          title={poolSize ? "Kein Kandidat mit eigener Firma" : "Noch keine Kandidaten"}
          action={
            poolSize ? (
              <LinkButton href={toggleHref}>Alle Kandidaten zeigen</LinkButton>
            ) : (
              <LinkButton href="/admin/kandidaten/neu" variant="primary">
                Kandidat erfassen
              </LinkButton>
            )
          }
        >
          {poolSize ? "Verknüpfe beim Kandidaten seine GmbH oder AG als Subunternehmen." : "Erfasse Fachleute mit ihren Kompetenzen, um sie hier zu vergleichen."}
        </EmptyState>
      )}
    </Card>
  );
}
