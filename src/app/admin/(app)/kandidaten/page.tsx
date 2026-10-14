import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus, ShieldAlert, Users } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, Mono, PageHeader, Pagination, Table, Tabs, TagList, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { candidateStatusCounts, listCandidates, type CandidateFilter } from "@/lib/admin/data/candidates";
import { listHref, pageNumber, PAGE_SIZE, param } from "@/lib/admin/data/query";
import { availabilityText } from "@/lib/admin/dossier";
import { displayNo, formatChf, todayIso } from "@/lib/admin/format";
import { candidateStatuses, disciplines, engagements, labelOf, rateUnits, toneOf } from "@/lib/admin/options";
import { dedupe } from "@/lib/admin/forms";
import { isAnonymised } from "@/lib/admin/privacy";
import { skillSuggestions } from "@/lib/admin/skills";
import { SearchBox } from "../_shared/search-box";
import { privacyFlag } from "./rules";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Kandidaten" };

const BASE = "/admin/kandidaten";
const filterControl =
  "h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none sm:w-auto";

function oneOf(list: readonly { value: string }[], value: string | undefined): string | undefined {
  return list.some((o) => o.value === value) ? value : undefined;
}

export default async function CandidatesPage({ searchParams }: PageProps<"/admin/kandidaten">) {
  await requireAdmin();
  const sp = await searchParams;
  const date = param(sp.verfuegbar);
  const filter: CandidateFilter = {
    q: param(sp.q)?.trim() || undefined,
    status: oneOf(candidateStatuses, param(sp.status)),
    discipline: oneOf(disciplines, param(sp.schwerpunkt)),
    skill: param(sp.kompetenz)?.trim().slice(0, 80) || undefined,
    engagement: oneOf(engagements, param(sp.einsatz)),
    availableBy: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : undefined,
    ownFirm: param(sp.firma) === "ja" ? true : param(sp.firma) === "nein" ? false : undefined,
  };
  const page = pageNumber(param(sp.seite));
  const [{ rows, total }, counts] = await Promise.all([listCandidates({ ...filter, page }), candidateStatusCounts(filter)]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const today = todayIso();

  // URL parameters in German, like the rest of the admin area.
  const query = {
    q: filter.q,
    status: filter.status,
    schwerpunkt: filter.discipline,
    kompetenz: filter.skill,
    einsatz: filter.engagement,
    verfuegbar: filter.availableBy,
    firma: filter.ownFirm === undefined ? undefined : filter.ownFirm ? "ja" : "nein",
  };
  const filtered = Boolean(filter.q || filter.discipline || filter.skill || filter.engagement || filter.availableBy || filter.ownFirm !== undefined);

  return (
    <>
      <PageHeader
        title="Kandidaten"
        description="Fachpersonen mit Profil, Lebenslauf, Verfügbarkeit und Datenschutzstatus."
        actions={
          <LinkButton href={`${BASE}/neu`} variant="primary" icon={Plus}>
            Kandidat erfassen
          </LinkButton>
        }
      />
      <Tabs
        items={[
          { label: "Alle", href: listHref(BASE, { ...query, status: undefined }), active: !filter.status, count: all },
          ...candidateStatuses.map((s) => ({
            label: s.label,
            href: listHref(BASE, { ...query, status: s.value }),
            active: filter.status === s.value,
            count: counts[s.value] ?? 0,
          })),
        ]}
      />
      <Card>
        <div className="border-b border-line px-5 py-3">
          <SearchBox action={BASE} defaultValue={filter.q} placeholder="Name, E-Mail, Titel oder Kompetenz" hidden={{ status: filter.status }}>
            <label className="sr-only" htmlFor="filter-schwerpunkt">
              Schwerpunkt
            </label>
            <select id="filter-schwerpunkt" name="schwerpunkt" defaultValue={filter.discipline ?? ""} className={filterControl}>
              <option value="">Alle Schwerpunkte</option>
              {disciplines.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-kompetenz">
              Kompetenz
            </label>
            <input
              id="filter-kompetenz"
              name="kompetenz"
              list="filter-kompetenz-liste"
              defaultValue={filter.skill}
              placeholder="Kompetenz, z. B. SAP FI"
              className={`${filterControl} sm:w-48`}
            />
            <datalist id="filter-kompetenz-liste">
              {skillSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <label className="sr-only" htmlFor="filter-einsatz">
              Einsatzform
            </label>
            <select id="filter-einsatz" name="einsatz" defaultValue={filter.engagement ?? ""} className={filterControl}>
              <option value="">Jede Einsatzform</option>
              {engagements.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filter-firma">
              Eigene Firma
            </label>
            <select id="filter-firma" name="firma" defaultValue={query.firma ?? ""} className={filterControl}>
              <option value="">Mit und ohne eigene Firma</option>
              <option value="ja">Mit eigener Firma</option>
              <option value="nein">Ohne eigene Firma</option>
            </select>
            <span className="flex w-full items-center gap-2 sm:w-auto">
              <label htmlFor="filter-verfuegbar" className="shrink-0 text-sm text-slate">
                Verfügbar ab spätestens
              </label>
              <input
                id="filter-verfuegbar"
                name="verfuegbar"
                type="date"
                defaultValue={filter.availableBy}
                title="Kandidaten, die spätestens an diesem Datum starten können (ohne erfasstes Datum: immer enthalten)"
                className={`${filterControl} flex-1 sm:flex-none`}
              />
            </span>
          </SearchBox>
          {filtered ? (
            <p className="mt-2 text-[0.8125rem] text-slate">
              {total === 1 ? "1 Kandidat" : `${total} Kandidaten`} gefunden.{" "}
              <Link href={listHref(BASE, { status: filter.status })} className="text-blue hover:underline">
                Filter zurücksetzen
              </Link>
            </p>
          ) : null}
        </div>
        {rows.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Kandidat</Th>
                  <Th>Titel</Th>
                  <Th>Schwerpunkte</Th>
                  <Th>Kompetenzen</Th>
                  <Th>Verfügbar ab</Th>
                  <Th align="right">Satz</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const anonymised = isAnonymised(c);
                  // An anonymised profile has neither consent nor a firm any more; that is no task.
                  const flag = anonymised ? null : privacyFlag(c, today);
                  return (
                    <tr key={c.id} className="hover:bg-mist/50">
                      <Td className="min-w-40">
                        <Link href={`${BASE}/${c.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {anonymised ? "Anonymisiert" : `${c.lastName} ${c.firstName}`}
                        </Link>
                        {/* relative: keeps the sr-only text inside the scrolling table, it would widen the page at 390 px. */}
                        <div className="relative mt-0.5 flex flex-wrap items-center gap-x-2">
                          <Mono>{displayNo.candidate(c.id)}</Mono>
                          {anonymised ? null : c.companyName ? (
                            <span className="inline-flex max-w-44 items-center gap-1 truncate text-xs text-slate" title={`Eigene Firma: ${c.companyName}`}>
                              <Building2 aria-hidden className="size-3 shrink-0" />
                              <span className="sr-only">Eigene Firma: </span>
                              <span className="truncate">{c.companyName}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-amber-800">ohne eigene Firma</span>
                          )}
                        </div>
                      </Td>
                      <Td className="min-w-40 text-slate">{c.headline ?? "–"}</Td>
                      <Td className="min-w-32 text-[0.8125rem] text-slate">
                        {c.disciplines.length ? c.disciplines.map((d) => labelOf(disciplines, d)).join(", ") : "–"}
                      </Td>
                      <Td className="min-w-44">
                        <TagList items={dedupe([...c.skills, ...c.sapModules])} max={4} />
                      </Td>
                      <Td className="whitespace-nowrap">{availabilityText(c.availableFrom, today) ?? "–"}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        {c.rateAmount !== null ? (
                          <>
                            {formatChf(c.rateAmount)}
                            {c.rateUnit ? <div className="text-xs text-slate">{labelOf(rateUnits, c.rateUnit)}</div> : null}
                          </>
                        ) : (
                          "–"
                        )}
                      </Td>
                      <Td>
                        {/* Status and data protection share a column, so the table fits next to the navigation. */}
                        <div className="relative flex flex-col items-start gap-1">
                          <Badge tone={toneOf(candidateStatuses, c.status)}>{labelOf(candidateStatuses, c.status)}</Badge>
                          {flag ? (
                            <span title={flag.title} className="inline-flex items-center gap-1">
                              <Badge tone={flag.tone}>
                                <ShieldAlert aria-hidden className="size-3" />
                                {flag.label}
                              </Badge>
                              <span className="sr-only">: {flag.title}</span>
                            </span>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(p) => listHref(BASE, { ...query, seite: p })} />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={filtered || filter.status ? "Keine Kandidaten gefunden" : "Noch keine Kandidaten"}
            action={
              filtered || filter.status ? (
                <LinkButton href={BASE}>Filter zurücksetzen</LinkButton>
              ) : (
                <LinkButton href={`${BASE}/neu`} variant="primary" icon={Plus}>
                  Ersten Kandidaten erfassen
                </LinkButton>
              )
            }
          >
            {filtered || filter.status
              ? "Andere Suche versuchen oder Filter zurücksetzen."
              : "Erfasse Fachpersonen mit Profil und Lebenslauf, um sie mit Mandaten abzugleichen und Dossiers zu erstellen."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
