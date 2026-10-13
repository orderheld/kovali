import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, PageHeader, Pagination, Table, Tabs, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { kindCounts, listCompanies } from "@/lib/admin/data/companies";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { displayNo } from "@/lib/admin/format";
import { companyKinds, companyStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { SearchBox } from "../_shared/search-box";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Firmen" };

export default async function CompaniesPage({ searchParams }: PageProps<"/admin/firmen">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const kind = companyKinds.some((k) => k.value === param(sp.art)) ? param(sp.art) : undefined;
  const page = pageNumber(param(sp.seite));
  const [{ rows, total }, counts] = await Promise.all([listCompanies({ q, kind, page }), kindCounts()]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Firmen und Kontakte"
        description="Auftraggeber, Endkunden und Subunternehmer mit ihren Ansprechpersonen."
        actions={
          <LinkButton href="/admin/firmen/neu" variant="primary" icon={Plus}>
            Firma anlegen
          </LinkButton>
        }
      />
      <Tabs
        items={[
          { label: "Alle", href: listHref("/admin/firmen", { q }), active: !kind, count: all },
          ...companyKinds.map((k) => ({
            label: k.label,
            href: listHref("/admin/firmen", { q, art: k.value }),
            active: kind === k.value,
            count: counts[k.value] ?? 0,
          })),
        ]}
      />
      <Card>
        <div className="border-b border-line px-5 py-3">
          <SearchBox action="/admin/firmen" defaultValue={q} placeholder="Name oder Ort" hidden={{ art: kind }} />
        </div>
        {rows.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Firma</Th>
                  <Th>Art</Th>
                  <Th>Ort</Th>
                  <Th align="right">Kontakte</Th>
                  <Th align="right">Offene Mandate</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-mist/50">
                    <Td>
                      <Link href={`/admin/firmen/${c.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {c.name}
                      </Link>
                      <div className="mt-0.5 flex gap-2">
                        <Mono>{displayNo.company(c.id)}</Mono>
                        {c.legalName && c.legalName !== c.name ? <span className="text-xs text-slate">{c.legalName}</span> : null}
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={toneOf(companyKinds, c.kind)}>{labelOf(companyKinds, c.kind)}</Badge>
                    </Td>
                    <Td>{c.city ?? "–"}</Td>
                    <Td align="right">{c.contacts}</Td>
                    <Td align="right">{c.openMandates}</Td>
                    <Td>
                      <Badge tone={toneOf(companyStatuses, c.status)}>{labelOf(companyStatuses, c.status)}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageCount={Math.ceil(total / PAGE_SIZE)}
              hrefFor={(p) => listHref("/admin/firmen", { q, art: kind, seite: p })}
            />
          </>
        ) : (
          <EmptyState
            icon={Building2}
            title={q || kind ? "Keine Firma gefunden" : "Noch keine Firmen"}
            action={
              q || kind ? (
                <LinkButton href="/admin/firmen">Filter zurücksetzen</LinkButton>
              ) : (
                <LinkButton href="/admin/firmen/neu" variant="primary" icon={Plus}>
                  Erste Firma anlegen
                </LinkButton>
              )
            }
          >
            {q || kind ? "Andere Suche versuchen oder Filter zurücksetzen." : "Lege Auftraggeber wie GHR Group oder Coopers an, um Mandate und Verträge zuzuordnen."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
