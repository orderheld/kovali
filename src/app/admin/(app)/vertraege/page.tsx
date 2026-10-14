import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, PageHeader, Pagination, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listContracts, statusCounts } from "@/lib/admin/contracts/data";
import { isTemplateId, templateName, templateOptions } from "@/lib/admin/contracts/templates";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { formatDate } from "@/lib/admin/format";
import { contractStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { SearchBox } from "../_shared/search-box";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Verträge" };

export default async function ContractsPage({ searchParams }: PageProps<"/admin/vertraege">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const status = contractStatuses.some((s) => s.value === param(sp.status)) ? param(sp.status) : undefined;
  const vorlage = param(sp.vorlage);
  const template = isTemplateId(vorlage) ? vorlage : undefined;
  const page = pageNumber(param(sp.seite));
  const [{ rows, total }, counts] = await Promise.all([listContracts({ q, status, template, page }), statusCounts({ q, template })]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const filtered = Boolean(q || status || template);

  return (
    <>
      <PageHeader
        title="Verträge"
        description="Rahmenverträge, Einzelaufträge, Subunternehmerverträge, Geheimhaltungsvereinbarungen, Einwilligungen und Beratungsverträge."
        actions={
          <LinkButton href="/admin/vertraege/neu" variant="primary" icon={Plus}>
            Vertrag erstellen
          </LinkButton>
        }
      />
      <Tabs
        items={[
          { label: "Alle", href: listHref("/admin/vertraege", { q, vorlage: template }), active: !status, count: all },
          ...contractStatuses.map((s) => ({
            label: s.label,
            href: listHref("/admin/vertraege", { q, vorlage: template, status: s.value }),
            active: status === s.value,
            count: counts[s.value] ?? 0,
          })),
        ]}
      />
      <Card>
        <div className="border-b border-line px-5 py-3">
          <SearchBox action="/admin/vertraege" defaultValue={q} placeholder="Nummer, Titel, Firma oder Person" hidden={{ status }}>
            <label className="sr-only" htmlFor="vertraege-vorlage">
              Vorlage
            </label>
            <select
              id="vertraege-vorlage"
              name="vorlage"
              defaultValue={template ?? ""}
              className="h-9 rounded-md border border-line bg-white px-2 pr-8 text-sm text-ink focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
            >
              <option value="">Alle Vorlagen</option>
              {templateOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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
                  <Th>Titel und Vorlage</Th>
                  <Th>Gegenpartei</Th>
                  <Th>Gültig</Th>
                  <Th>Status</Th>
                  <Th>Unterzeichnet</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const person = c.candidateId ? [c.candidateFirstName, c.candidateLastName].filter(Boolean).join(" ") : null;
                  return (
                    <tr key={c.id} className="hover:bg-mist/50">
                      <Td className="whitespace-nowrap">
                        <Mono className="text-[0.8125rem] text-ink">{c.number}</Mono>
                      </Td>
                      <Td>
                        <Link href={`/admin/vertraege/${c.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {c.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate">{templateName(c.template)}</div>
                      </Td>
                      <Td>
                        {c.companyName ? (
                          <Link href={`/admin/firmen/${c.companyId}`} className="hover:text-blue hover:underline">
                            {c.companyName}
                          </Link>
                        ) : null}
                        {person ? <div className={c.companyName ? "text-xs text-slate" : undefined}>{person}</div> : null}
                        {!c.companyName && !person ? "–" : null}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {c.validFrom ? (
                          <>
                            {formatDate(c.validFrom)}
                            <span className="text-slate"> – </span>
                            {c.validUntil ? formatDate(c.validUntil) : <span className="text-slate">offen</span>}
                          </>
                        ) : c.validUntil ? (
                          <>
                            <span className="text-slate">bis </span>
                            {formatDate(c.validUntil)}
                          </>
                        ) : (
                          <span className="text-slate">–</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap">{formatDate(c.signedAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageCount={Math.ceil(total / PAGE_SIZE)}
              hrefFor={(p) => listHref("/admin/vertraege", { q, status, vorlage: template, seite: p })}
            />
          </>
        ) : (
          <EmptyState
            icon={FileSignature}
            title={filtered ? "Kein Vertrag gefunden" : "Noch keine Verträge"}
            action={
              filtered ? (
                <LinkButton href="/admin/vertraege">Filter zurücksetzen</LinkButton>
              ) : (
                <LinkButton href="/admin/vertraege/neu" variant="primary" icon={Plus}>
                  Ersten Vertrag erstellen
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Andere Suche versuchen oder Filter zurücksetzen."
              : "Beginne mit einem Rahmenvertrag für einen Auftraggeber; Einzelaufträge und Subunternehmerverträge bauen darauf auf."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
