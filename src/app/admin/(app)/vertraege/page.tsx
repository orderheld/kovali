import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileSignature, Paperclip, Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, Notice, PageHeader, Pagination, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractStatusCounts, countEndingContracts, listContracts, usedContractKinds } from "@/lib/admin/contracts/data";
import { contractExpiry, CONTRACT_ENDING_DAYS, expiryLabel, expiryTone } from "@/lib/admin/contracts/expiry";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { contractKinds, contractStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { SearchBox } from "../_shared/search-box";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Verträge" };

function Period({ from, until }: { from: string | null; until: string | null }) {
  if (from) {
    return (
      <>
        {formatDate(from)}
        <span className="text-slate"> – </span>
        {until ? formatDate(until) : <span className="text-slate">offen</span>}
      </>
    );
  }
  if (until) {
    return (
      <>
        <span className="text-slate">bis </span>
        {formatDate(until)}
      </>
    );
  }
  return <span className="text-slate">–</span>;
}

export default async function ContractsPage({ searchParams }: PageProps<"/admin/vertraege">) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayIso();
  const q = param(sp.q)?.trim() || undefined;
  const status = contractStatuses.some((s) => s.value === param(sp.status)) ? param(sp.status) : undefined;
  const kind = contractKinds.some((k) => k.value === param(sp.art)) ? param(sp.art) : undefined;
  const ending = param(sp.endet) === "bald";
  const page = pageNumber(param(sp.seite));
  const filter = { q, kind, ending };
  const [{ rows, total }, counts, endingCount, usedKinds] = await Promise.all([
    listContracts({ ...filter, status, page }, today),
    contractStatusCounts(filter, today),
    countEndingContracts(today),
    usedContractKinds(),
  ]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const filtered = Boolean(q || status || kind || ending);
  // Offered kinds plus old ones that still occur, so every contract can be found by its kind.
  const kindChoices = contractKinds.filter((k) => !k.legacy || usedKinds.includes(k.value));
  const params = { q, art: kind, endet: ending ? "bald" : undefined };

  return (
    <>
      <PageHeader
        title="Verträge"
        description="Deine Verträge mit Vermittlern und Kunden, mit Laufzeit, Kündigungsfrist und den unterzeichneten Dateien."
        actions={
          <LinkButton href="/admin/vertraege/neu" variant="primary" icon={Plus}>
            Vertrag ablegen
          </LinkButton>
        }
      />

      {ending ? (
        <Notice tone="amber" icon={CalendarClock} className="mb-6">
          Du siehst nur Verträge, die in den nächsten {CONTRACT_ENDING_DAYS} Tagen enden.{" "}
          <Link href={listHref("/admin/vertraege", { q, art: kind, status })} className="font-medium underline">
            Alle Verträge anzeigen
          </Link>
        </Notice>
      ) : endingCount > 0 ? (
        <Notice tone="amber" icon={CalendarClock} className="mb-6">
          {endingCount === 1 ? "Ein Vertrag endet" : `${endingCount} Verträge enden`} in den nächsten {CONTRACT_ENDING_DAYS} Tagen. Denk an Verlängerung oder Kündigungsfrist.{" "}
          <Link href={listHref("/admin/vertraege", { endet: "bald" })} className="font-medium underline">
            Anzeigen
          </Link>
        </Notice>
      ) : null}

      <Tabs
        items={[
          { label: "Alle", href: listHref("/admin/vertraege", params), active: !status, count: all },
          ...contractStatuses.map((s) => ({
            label: s.label,
            href: listHref("/admin/vertraege", { ...params, status: s.value }),
            active: status === s.value,
            count: counts[s.value] ?? 0,
          })),
        ]}
      />
      <Card>
        <div className="border-b border-line px-5 py-3">
          <SearchBox action="/admin/vertraege" defaultValue={q} placeholder="Nummer, Titel, Firma oder Notiz" hidden={{ status, endet: ending ? "bald" : undefined }}>
            <label className="sr-only" htmlFor="vertraege-art">
              Art
            </label>
            <select
              id="vertraege-art"
              name="art"
              defaultValue={kind ?? ""}
              className="h-9 rounded-md border border-line bg-white px-2 pr-8 text-sm text-ink focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
            >
              <option value="">Alle Arten</option>
              {kindChoices.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </SearchBox>
        </div>
        {rows.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Nummer</Th>
                  <Th>Titel und Art</Th>
                  <Th>Firma</Th>
                  <Th>Auftrag</Th>
                  <Th>Laufzeit</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const expiry = contractExpiry(c, today);
                  return (
                    <tr key={c.id} className="hover:bg-mist/50">
                      <Td className="whitespace-nowrap">
                        <Mono className="text-[0.8125rem] text-ink">{c.number}</Mono>
                      </Td>
                      <Td>
                        <Link href={`/admin/vertraege/${c.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {c.title}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate">
                          <span>{labelOf(contractKinds, c.kind)}</span>
                          {c.files ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Paperclip aria-hidden className="size-3" />
                              {c.files === 1 ? "1 Datei" : `${c.files} Dateien`}
                            </span>
                          ) : (
                            // Missing the signed copy matters; for drafts and old contracts it is a note.
                            <span className={c.status === "unterzeichnet" ? "text-amber-800" : undefined}>ohne Datei</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        {c.companyId && c.companyName ? (
                          <Link href={`/admin/firmen/${c.companyId}`} className="hover:text-blue hover:underline">
                            {c.companyName}
                          </Link>
                        ) : (
                          <span className="text-slate">–</span>
                        )}
                      </Td>
                      <Td>
                        {c.assignmentId ? (
                          <Link href={`/admin/auftraege/${c.assignmentId}`} className="hover:text-blue hover:underline">
                            <Mono className="mr-1.5">{displayNo.assignment(c.assignmentId)}</Mono>
                            {c.assignmentTitle}
                          </Link>
                        ) : (
                          <span className="text-slate">–</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <Period from={c.validFrom} until={c.validUntil} />
                        {expiry ? (
                          <div className="mt-1">
                            <Badge tone={expiryTone(expiry)}>{expiryLabel(expiry)}</Badge>
                          </div>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                        {c.signedAt ? <div className="mt-1 text-xs whitespace-nowrap text-slate">Unterschrift {formatDate(c.signedAt)}</div> : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(p) => listHref("/admin/vertraege", { ...params, status, seite: p })} />
          </>
        ) : (
          <EmptyState
            icon={FileSignature}
            title={filtered ? "Kein Vertrag gefunden" : "Noch keine Verträge abgelegt"}
            action={
              filtered ? (
                <LinkButton href="/admin/vertraege">Filter zurücksetzen</LinkButton>
              ) : (
                <LinkButton href="/admin/vertraege/neu" variant="primary" icon={Plus}>
                  Ersten Vertrag ablegen
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Versuche es mit einem anderen Suchwort oder setze die Filter zurück."
              : "Erfasse Art, Firma, Laufzeit und Kündigungsfrist und lade das unterzeichnete PDF gleich mit hoch. Am besten beginnst du mit dem Rahmenvertrag deines Vermittlers."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
