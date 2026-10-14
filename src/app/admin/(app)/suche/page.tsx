import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, FileSignature, Search, UserRound, Users } from "lucide-react";
import { Badge, Card, EmptyState, Mono, Notice, PageHeader } from "@/components/admin/ui";
import { SearchBox } from "../_shared/search-box";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref, param } from "@/lib/admin/data/query";
import { parseDisplayNumber, resolveJump, searchAll, SEARCH_GROUP_LIMIT } from "@/lib/admin/data/search";
import { displayNo, fullName } from "@/lib/admin/format";
import { candidateStatuses, companyKinds, contractStatuses, labelOf, mandateStatuses, toneOf } from "@/lib/admin/options";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

// The title never contains the search term: titles end up in the browser history.
export const metadata: Metadata = { title: "Suche" };

function Group({
  title,
  icon: Icon,
  total,
  moreHref,
  children,
}: {
  title: string;
  icon: LucideIcon;
  total: number;
  moreHref?: string;
  children: React.ReactNode;
}) {
  const id = `suche-${title.toLowerCase()}`;
  return (
    <Card>
      <section aria-labelledby={id}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Icon aria-hidden className="size-4 text-blue" />
          <h2 id={id} className="flex-1 text-[0.9375rem] font-semibold text-ink">
            {title}
          </h2>
          <Badge>{total}</Badge>
          {moreHref && total > SEARCH_GROUP_LIMIT ? (
            <Link href={moreHref} className="text-sm text-blue hover:underline">
              Alle {total} anzeigen
            </Link>
          ) : null}
        </div>
        <ul className="divide-y divide-line">{children}</ul>
        {total > SEARCH_GROUP_LIMIT ? (
          <p className="border-t border-line px-5 py-2 text-xs text-slate">
            Die ersten {SEARCH_GROUP_LIMIT} von {total} Treffern. Verfeinere die Suche für ein genaueres Ergebnis.
          </p>
        ) : null}
      </section>
    </Card>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm transition-colors hover:bg-mist/60">
        {children}
      </Link>
    </li>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/admin/suche">) {
  await requireAdmin();
  const q = param((await searchParams).q)?.trim().slice(0, 100) ?? "";

  // A display number jumps straight to its record.
  const target = q ? parseDisplayNumber(q) : null;
  const jump = target ? await resolveJump(target) : null;
  if (jump) redirect(jump);

  const results = q ? await searchAll(q) : null;
  const total = results ? Object.values(results).reduce((sum, g) => sum + g.total, 0) : 0;

  return (
    <>
      <PageHeader
        title="Suche"
        description="Kandidaten, Mandate, Firmen, Kontakte und Verträge. Mit einer Nummer wie K-0042 öffnest du den Datensatz direkt."
      />
      <Card className="mb-6">
        <div className="px-5 py-3">
          <SearchBox action="/admin/suche" defaultValue={q} placeholder="Name, Kompetenz, Firma, Nummer …" />
        </div>
      </Card>

      {target && !jump ? (
        <Notice tone="amber" title="Nummer nicht gefunden" className="mb-6">
          Zur Nummer <Mono className="text-amber-900">{target.kind === "contract" ? target.number : q.toUpperCase()}</Mono> gibt es keinen Datensatz (mehr).
          Unten siehst du die Treffer der normalen Suche.
        </Notice>
      ) : null}

      {!q ? (
        <Card>
          <EmptyState icon={Search} title="Wonach suchst du?">
            <ul className="mt-2 space-y-1 text-left">
              <li>
                <strong className="font-medium text-ink">Nummern</strong>: K-0042 (Kandidat), M-0007 (Mandat), F-0003 (Firma), VS-0012 (Vorschlag), V-2026-0001
                (Vertrag)
              </li>
              <li>
                <strong className="font-medium text-ink">Personen</strong>: Vor- und Nachname in beliebiger Reihenfolge, E-Mail oder Telefonnummer
              </li>
              <li>
                <strong className="font-medium text-ink">Kompetenzen</strong>: z. B. «SAP FI», «Jira» oder «Requirements»
              </li>
            </ul>
          </EmptyState>
        </Card>
      ) : results && total === 0 ? (
        <Card>
          <EmptyState icon={Search} title="Keine Treffer">
            Prüfe die Schreibweise oder suche mit weniger Wörtern, z. B. nur mit dem Nachnamen.
          </EmptyState>
        </Card>
      ) : results ? (
        <div className="space-y-6">
          <p className="text-sm text-slate" role="status">
            {total === 1 ? "1 Treffer" : `${total} Treffer`}
          </p>
          {results.candidates.total ? (
            <Group title="Kandidaten" icon={Users} total={results.candidates.total} moreHref={listHref("/admin/kandidaten", { q })}>
              {results.candidates.rows.map((c) => (
                <Row key={c.id} href={`/admin/kandidaten/${c.id}`}>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium text-ink">{fullName(c)}</span>
                    <span className="block text-xs text-slate">
                      <Mono className="mr-1.5">{displayNo.candidate(c.id)}</Mono>
                      {[c.headline, c.city].filter(Boolean).join(" · ") || "–"}
                    </span>
                  </span>
                  {[...c.sapModules, ...c.skills].length ? (
                    <span className="hidden max-w-sm truncate text-xs text-slate md:inline">{[...c.sapModules, ...c.skills].slice(0, 5).join(", ")}</span>
                  ) : null}
                  <Badge tone={toneOf(candidateStatuses, c.status)}>{labelOf(candidateStatuses, c.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}
          {results.mandates.total ? (
            <Group title="Mandate" icon={Briefcase} total={results.mandates.total} moreHref={listHref("/admin/mandate", { q, status: "alle" })}>
              {results.mandates.rows.map((m) => (
                <Row key={m.id} href={`/admin/mandate/${m.id}`}>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium text-ink">{m.title}</span>
                    <span className="block text-xs text-slate">
                      <Mono className="mr-1.5">{m.reference ?? displayNo.mandate(m.id)}</Mono>
                      {[m.company, m.endClient ? `Endkunde ${m.endClient}` : null].filter(Boolean).join(" · ") || "Ohne Firma"}
                    </span>
                  </span>
                  <Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}
          {results.companies.total ? (
            <Group title="Firmen" icon={Building2} total={results.companies.total} moreHref={listHref("/admin/firmen", { q })}>
              {results.companies.rows.map((c) => (
                <Row key={c.id} href={`/admin/firmen/${c.id}`}>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-slate">
                      <Mono className="mr-1.5">{displayNo.company(c.id)}</Mono>
                      {[c.legalName && c.legalName !== c.name ? c.legalName : null, c.city].filter(Boolean).join(" · ") || "–"}
                    </span>
                  </span>
                  <Badge tone={toneOf(companyKinds, c.kind)}>{labelOf(companyKinds, c.kind)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}
          {results.contacts.total ? (
            <Group title="Kontakte" icon={UserRound} total={results.contacts.total}>
              {results.contacts.rows.map((c) => (
                <Row key={c.id} href={`/admin/firmen/${c.companyId}`}>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium text-ink">{fullName(c)}</span>
                    <span className="block text-xs text-slate">{[c.role, c.company].filter(Boolean).join(" · ")}</span>
                  </span>
                  {c.email ? <span className="truncate text-xs text-slate">{c.email}</span> : null}
                </Row>
              ))}
            </Group>
          ) : null}
          {results.contracts.total ? (
            <Group title="Verträge" icon={FileSignature} total={results.contracts.total} moreHref={listHref("/admin/vertraege", { q })}>
              {results.contracts.rows.map((c) => (
                <Row key={c.id} href={`/admin/vertraege/${c.id}`}>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block font-medium text-ink">{c.title}</span>
                    <span className="block text-xs text-slate">
                      <Mono className="mr-1.5">{c.number}</Mono>
                      {c.company ?? ""}
                    </span>
                  </span>
                  <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
