import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, Download, Eye, FileSignature, FileText, Search, Telescope, TextQuote, UserRound } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { Badge, Card, EmptyState, LinkButton, Mono, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref, param } from "@/lib/admin/data/query";
import { parseDisplayNumber, resolveJump, searchAll, SEARCH_GROUP_LIMIT } from "@/lib/admin/data/search";
import { displayNo, formatBytes, formatDate, fullName } from "@/lib/admin/format";
import { assignmentStatuses, companyKinds, contractKinds, contractStatuses, documentKinds, labelOf, mandateStatuses, toneOf } from "@/lib/admin/options";
import { SearchBox } from "../_shared/search-box";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

// The title never contains the search term: titles end up in the browser history.
export const metadata: Metadata = { title: "Suche" };

function Group({
  id,
  title,
  icon: Icon,
  total,
  moreHref,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  total: number;
  /** The list with the same search, when the module has one. */
  moreHref?: string;
  children: React.ReactNode;
}) {
  const headingId = `suche-${id}`;
  return (
    <Card>
      <section aria-labelledby={headingId}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Icon aria-hidden className="size-4 text-blue" />
          <h2 id={headingId} className="flex-1 text-[0.9375rem] font-semibold text-ink">
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
        {total > SEARCH_GROUP_LIMIT && !moreHref ? (
          <p className="border-t border-line px-5 py-2 text-xs text-slate">
            Die ersten {SEARCH_GROUP_LIMIT} von {total} Treffern. Mit einem weiteren Wort wird die Suche genauer.
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

function Line({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <span className="min-w-0 flex-1 basis-60">
      <span className="block font-medium text-ink">{title}</span>
      {children ? <span className="block text-xs text-slate">{children}</span> : null}
    </span>
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
        description="Über Aufträge, Vakanzen, Verträge, Textbausteine, Firmen, Kontakte und Dateinamen. Mit einer Nummer wie A-0003, M-0007 oder V-2026-0001 öffnest du den Datensatz direkt."
      />
      <Card className="mb-6">
        <div className="px-5 py-3">
          <SearchBox action="/admin/suche" defaultValue={q} placeholder="Titel, Firma, Person, Text, Dateiname, Nummer …" />
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
                <strong className="font-medium text-ink">Mehrere Wörter</strong>: «GHR Kurzprofil» findet Textbausteine, Aufträge, Verträge, Firmen und Dateien,
                in denen beide Wörter vorkommen.
              </li>
              <li>
                <strong className="font-medium text-ink">Nummern</strong>: A-0003 (Auftrag), M-0007 (Vakanz), V-2026-0001 (Vertrag), T-0004 (Textbaustein), F-0003
                (Firma)
              </li>
              <li>
                <strong className="font-medium text-ink">Personen</strong>: Vor- und Nachname in beliebiger Reihenfolge, E-Mail oder Telefonnummer
              </li>
              <li>
                <strong className="font-medium text-ink">Dateien</strong>: Dateiname oder Art, z. B. «Lohnabrechnung»
              </li>
            </ul>
          </EmptyState>
        </Card>
      ) : results && total === 0 ? (
        <Card>
          <EmptyState icon={Search} title="Keine Treffer">
            Prüfe die Schreibweise oder suche mit weniger Wörtern, z. B. nur mit dem Firmennamen.
          </EmptyState>
        </Card>
      ) : results ? (
        <div className="space-y-6">
          <p className="text-sm text-slate" role="status">
            {total === 1 ? "1 Treffer" : `${total} Treffer`}
          </p>

          {results.assignments.total ? (
            <Group id="auftraege" title="Aufträge" icon={Briefcase} total={results.assignments.total} moreHref={listHref("/admin/auftraege", { q, status: "alle" })}>
              {results.assignments.rows.map((a) => (
                <Row key={a.id} href={`/admin/auftraege/${a.id}`}>
                  <Line title={a.title}>
                    <Mono className="mr-1.5">{displayNo.assignment(a.id)}</Mono>
                    {[a.company, a.endClient ? `Endkunde ${a.endClient}` : null, a.startDate ? `ab ${formatDate(a.startDate)}` : null].filter(Boolean).join(" · ")}
                  </Line>
                  <Badge tone={toneOf(assignmentStatuses, a.status)}>{labelOf(assignmentStatuses, a.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}

          {results.mandates.total ? (
            <Group id="vakanzen" title="Vakanzen" icon={Telescope} total={results.mandates.total} moreHref={listHref("/admin/vakanzen", { q, status: "alle" })}>
              {results.mandates.rows.map((m) => (
                <Row key={m.id} href={`/admin/vakanzen/${m.id}`}>
                  <Line title={m.title}>
                    <Mono className="mr-1.5">{m.reference ?? displayNo.mandate(m.id)}</Mono>
                    {[m.company, m.endClient ? `Endkunde ${m.endClient}` : null].filter(Boolean).join(" · ") || "Ohne Firma"}
                  </Line>
                  <Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}

          {results.contracts.total ? (
            <Group id="vertraege" title="Verträge" icon={FileSignature} total={results.contracts.total} moreHref={listHref("/admin/vertraege", { q })}>
              {results.contracts.rows.map((c) => (
                <Row key={c.id} href={`/admin/vertraege/${c.id}`}>
                  <Line title={c.title}>
                    <Mono className="mr-1.5">{c.number}</Mono>
                    {[labelOf(contractKinds, c.kind), c.company, c.validUntil ? `bis ${formatDate(c.validUntil)}` : null].filter(Boolean).join(" · ")}
                  </Line>
                  <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}

          {results.snippets.total ? (
            <Group id="texte" title="Textbausteine" icon={TextQuote} total={results.snippets.total} moreHref={listHref("/admin/texte", { q })}>
              {results.snippets.rows.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <Link href={`/admin/texte/${t.id}`} className="group min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink group-hover:text-blue group-hover:underline">{t.title}</span>
                      <Mono>{displayNo.snippet(t.id)}</Mono>
                      {t.category ? <Badge>{t.category}</Badge> : null}
                      {t.company ? <span className="text-xs text-slate">{t.company}</span> : null}
                    </span>
                    <span className="mt-1 block text-[0.8125rem] text-slate">{t.excerpt}</span>
                  </Link>
                  <CopyButton value={t.body} label={`«${t.title}» kopieren`} iconOnly />
                </li>
              ))}
            </Group>
          ) : null}

          {results.companies.total ? (
            <Group id="firmen" title="Firmen" icon={Building2} total={results.companies.total} moreHref={listHref("/admin/firmen", { q })}>
              {results.companies.rows.map((c) => (
                <Row key={c.id} href={`/admin/firmen/${c.id}`}>
                  <Line title={c.name}>
                    <Mono className="mr-1.5">{displayNo.company(c.id)}</Mono>
                    {[c.legalName && c.legalName !== c.name ? c.legalName : null, c.city].filter(Boolean).join(" · ") || "–"}
                  </Line>
                  <Badge tone={toneOf(companyKinds, c.kind)}>{labelOf(companyKinds, c.kind)}</Badge>
                </Row>
              ))}
            </Group>
          ) : null}

          {results.contacts.total ? (
            <Group id="kontakte" title="Kontakte" icon={UserRound} total={results.contacts.total}>
              {results.contacts.rows.map((c) => (
                <Row key={c.id} href={`/admin/firmen/${c.companyId}`}>
                  <Line title={fullName(c)}>{[c.role, c.company].filter(Boolean).join(" · ")}</Line>
                  {c.email ? <span className="truncate text-xs text-slate">{c.email}</span> : null}
                </Row>
              ))}
            </Group>
          ) : null}

          {results.documents.total ? (
            <Group id="dokumente" title="Dateien" icon={FileText} total={results.documents.total}>
              {results.documents.rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block truncate font-medium text-ink" title={d.filename}>
                      {d.filename}
                    </span>
                    <span className="block text-xs text-slate">
                      {labelOf(documentKinds, d.kind)} · {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt)} ·{" "}
                      <Link href={d.owner.href} className="text-blue hover:underline">
                        {d.owner.label}
                      </Link>
                    </span>
                  </span>
                  <span className="flex gap-1.5">
                    {d.mimeType === "application/pdf" || d.mimeType.startsWith("image/") ? (
                      <LinkButton href={`/admin/api/dokumente/${d.id}?ansicht=1`} target="_blank" size="sm" icon={Eye}>
                        Ansehen
                      </LinkButton>
                    ) : null}
                    <LinkButton href={`/admin/api/dokumente/${d.id}`} size="sm" icon={Download}>
                      Herunterladen
                    </LinkButton>
                  </span>
                </li>
              ))}
            </Group>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
