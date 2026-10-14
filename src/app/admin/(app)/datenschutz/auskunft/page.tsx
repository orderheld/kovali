import type { Metadata } from "next";
import Link from "next/link";
import { FileJson, FileText, History, SearchX, UserSearch } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, Mono, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { param } from "@/lib/admin/data/query";
import { findCandidatesForRequest } from "@/lib/admin/data/search";
import { displayNo, formatDate, formatDateTime, fullName, todayIso } from "@/lib/admin/format";
import { candidateStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { ACCESS_REQUEST_DAYS, isAnonymised, privacyCounts } from "@/lib/admin/privacy";
import { SearchBox } from "../../_shared/search-box";
import { auditEntries } from "../../einstellungen/audit-data";
import { anonymiseCandidateAction, deleteCandidateAction } from "../actions";
import { RetentionActions } from "../retention-actions";
import { PrivacyHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

// The title never contains the search term: titles end up in the browser history.
export const metadata: Metadata = { title: "Auskunft" };

const steps = [
  "Identität prüfen: Anfrage von der bekannten E-Mail-Adresse oder Kopie eines Ausweises (danach löschen).",
  "Kandidat suchen und die Auskunft als PDF erstellen. Die JSON-Datei dient der Datenherausgabe in einem gängigen Format (Art. 28 DSG).",
  "Angaben Dritter prüfen: Notizen mit Personendaten anderer Personen oder vertraulichen Angaben von Auftraggebern vor dem Versand schwärzen.",
  `Innert ${ACCESS_REQUEST_DAYS} Tagen und kostenlos antworten, am besten per E-Mail mit Passwort oder über das Kandidatenportal.`,
];

export default async function AccessRequestPage({ searchParams }: PageProps<"/admin/datenschutz/auskunft">) {
  await requireAdmin();
  const q = param((await searchParams).q)?.trim().slice(0, 100) ?? "";
  const [results, counts, recent] = await Promise.all([
    q ? findCandidatesForRequest(q) : Promise.resolve(null),
    privacyCounts(todayIso()),
    auditEntries({ actions: ["export"], entity: "candidate", summaryPrefix: "Auskunft", pageSize: 10 }),
  ]);

  return (
    <>
      <PrivacyHeader active="auskunft" counts={{ aufbewahrung: counts.overdue, einwilligung: counts.noConsentOld + counts.submissionsAwaitingConsent }} />

      <Notice tone="blue" title={`Auskunft innert ${ACCESS_REQUEST_DAYS} Tagen, kostenlos (Art. 25 DSG)`}>
        Jede Person kann fragen, welche Daten KOVALI über sie bearbeitet. Die Auskunft enthält die Angaben zu KOVALI, alle gespeicherten Daten, Zweck, Aufbewahrung,
        Herkunft, Empfänger, Auftragsbearbeiter, Bekanntgabe ins Ausland und den Hinweis, dass das Matching nur eine Rangfolge ist und jeder Entscheid von dir getroffen
        wird.
      </Notice>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Kandidat suchen" description="Nach Name, E-Mail, Telefon oder Nummer (K-0042)." />
            <CardBody>
              <SearchBox action="/admin/datenschutz/auskunft" defaultValue={q} placeholder="Name, E-Mail oder K-Nummer" />
            </CardBody>
            {results ? (
              results.length ? (
                <ul className="divide-y divide-line border-t border-line">
                  {results.map((c) => {
                    const no = displayNo.candidate(c.id);
                    const anonymised = isAnonymised(c);
                    return (
                      <li key={c.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link href={`/admin/kandidaten/${c.id}`} className="font-medium text-ink hover:text-blue">
                              {anonymised ? "Anonymisiert" : fullName(c)}
                            </Link>
                            <Mono>{no}</Mono>
                            <Badge tone={toneOf(candidateStatuses, c.status)}>{labelOf(candidateStatuses, c.status)}</Badge>
                          </p>
                          <p className="mt-0.5 text-[0.8125rem] break-all text-slate">
                            {[c.email, c.city, `erfasst ${formatDate(c.createdAt)}`].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex flex-wrap gap-2">
                            <LinkButton href={`/admin/api/datenschutz/auskunft/${c.id}?format=pdf`} size="sm" icon={FileText}>
                              Auskunft PDF<span className="sr-only"> für {no}</span>
                            </LinkButton>
                            <LinkButton href={`/admin/api/datenschutz/auskunft/${c.id}?format=json`} size="sm" icon={FileJson}>
                              JSON<span className="sr-only"> für {no}</span>
                            </LinkButton>
                          </div>
                          {anonymised ? null : (
                            <RetentionActions
                              no={no}
                              hasConsent={false}
                              documents={c.documents}
                              contracts={c.contracts}
                              anonymiseAction={anonymiseCandidateAction.bind(null, c.id)}
                              deleteAction={deleteCandidateAction.bind(null, c.id)}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="border-t border-line">
                  <EmptyState icon={SearchX} title="Kein Kandidat gefunden">
                    Prüfe die Schreibweise oder suche nach der E-Mail-Adresse. Ist die Person nicht erfasst, antwortest du ihr, dass KOVALI keine Daten über sie
                    bearbeitet. Prüfe vorher auch die Kontakte unter Firmen.
                  </EmptyState>
                </div>
              )
            ) : (
              <div className="border-t border-line">
                <EmptyState icon={UserSearch} title="Wer hat angefragt?">
                  Suche die Person, um die Auskunft zu erstellen.
                </EmptyState>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Erteilte Auskünfte"
              description="Jede erstellte Auskunft steht im Audit-Log, als Nachweis der Frist."
              actions={
                <LinkButton href="/admin/einstellungen/audit?aktion=export" size="sm" variant="ghost" icon={History}>
                  Audit-Log
                </LinkButton>
              }
            />
            {recent.rows.length ? (
              <ul className="divide-y divide-line">
                {recent.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                    <span className="text-ink">{r.summary}</span>
                    <span className="text-[0.8125rem] text-slate tabular-nums">{formatDateTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">Noch keine Auskunft erstellt.</p>
            )}
          </Card>
        </div>

        <Card as="div" className="h-fit">
          <CardHeader title="Ablauf" />
          <CardBody>
            <ol className="space-y-3 text-sm text-ink">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-xs font-semibold text-blue">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-line pt-3 text-[0.8125rem] text-slate">
              Verlangt die Person die Löschung (Art. 32 DSG), kannst du das Profil direkt in der Trefferliste anonymisieren oder löschen. Fällige Profile
              findest du unter{" "}
              <Link href="/admin/datenschutz" className="text-blue hover:underline">
                Aufbewahrung
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
