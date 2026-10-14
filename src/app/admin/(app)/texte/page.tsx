import type { Metadata } from "next";
import Link from "next/link";
import { Plus, TextQuote } from "lucide-react";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref, param } from "@/lib/admin/data/query";
import { listSnippets, snippetCategories, snippetCompanyOptions, SNIPPET_LIST_LIMIT } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { groupSnippets, PINNED_SECTION } from "@/lib/admin/texts";
import { cn } from "@/lib/utils";
import { SearchBox } from "../_shared/search-box";
import { SnippetCard } from "./_components/snippet-card";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Textbausteine" };

const filterSelect =
  "h-9 max-w-52 rounded-md border border-line bg-white pr-8 pl-2.5 text-sm text-ink hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none";

export default async function SnippetsPage({ searchParams }: PageProps<"/admin/texte">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q)?.trim() || undefined;
  const companyId = parseId(param(sp.firma)) ?? undefined;
  const [categories, companyChoices] = await Promise.all([snippetCategories(), snippetCompanyOptions()]);
  // Only categories that exist; the spelling in the database wins.
  const requested = param(sp.kategorie)?.trim().toLowerCase();
  const category = requested ? categories.find((c) => c.category.toLowerCase() === requested)?.category : undefined;
  const rows = await listSnippets({ q, category, companyId });
  const sections = groupSnippets(rows);
  const filtered = Boolean(q || companyId || category);
  const base = { q, firma: companyId };

  return (
    <>
      <PageHeader
        title="Textbausteine"
        description="Texte, die du immer wieder brauchst. Ein Klick kopiert den ganzen Text mit allen Zeilenumbrüchen."
        actions={
          <LinkButton href={companyId ? `/admin/texte/neu?firma=${companyId}` : "/admin/texte/neu"} variant="primary" icon={Plus}>
            Textbaustein anlegen
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <div className="space-y-3 px-5 py-3">
          <SearchBox action="/admin/texte" defaultValue={q} placeholder="Titel, Text oder Firma" hidden={{ kategorie: category }}>
            {companyChoices.length ? (
              <>
                <label htmlFor="texte-firma" className="sr-only">
                  Firma
                </label>
                <select id="texte-firma" name="firma" defaultValue={companyId ? String(companyId) : ""} className={filterSelect}>
                  <option value="">Alle Firmen</option>
                  {companyChoices.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </SearchBox>
          {categories.length ? (
            <nav aria-label="Kategorien" className="-mx-1 flex flex-wrap gap-1.5 text-[0.8125rem]">
              {[{ value: undefined, label: "Alle Kategorien", active: !category }, ...categories.map((c) => ({ value: c.category, label: c.category, active: category === c.category }))].map(
                (chip) => (
                  <Link
                    key={chip.label}
                    href={listHref("/admin/texte", { ...base, kategorie: chip.value })}
                    aria-current={chip.active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3 transition-colors",
                      chip.active ? "border-blue bg-blue/[0.06] font-medium text-blue" : "border-line bg-white text-slate hover:border-slate/40 hover:text-ink",
                    )}
                  >
                    {chip.label}
                  </Link>
                ),
              )}
            </nav>
          ) : null}
        </div>
        {filtered ? (
          <p className="flex flex-wrap items-center gap-2 border-t border-line bg-mist/40 px-5 py-2 text-[0.8125rem] text-slate">
            {rows.length === 1 ? "1 Textbaustein" : `${rows.length} Textbausteine`} gefunden.
            <Link href="/admin/texte" className="text-blue hover:underline">
              Filter zurücksetzen
            </Link>
          </p>
        ) : null}
      </Card>

      {sections.length ? (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key || "-"} aria-labelledby={`abschnitt-${section.key || "ohne"}`}>
              <h2 id={`abschnitt-${section.key || "ohne"}`} className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                {section.title}
                <span className="rounded-full bg-mist px-1.5 text-xs font-medium text-slate tabular-nums">{section.items.length}</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {section.items.map((s) => (
                  // In a category section the category badge would only repeat the heading.
                  <SnippetCard key={s.id} snippet={s} showCategory={section.key === PINNED_SECTION} />
                ))}
              </div>
            </section>
          ))}
          {rows.length >= SNIPPET_LIST_LIMIT ? (
            <p className="text-sm text-slate">Es werden die ersten {SNIPPET_LIST_LIMIT} Textbausteine gezeigt. Grenze die Suche ein, um weitere zu finden.</p>
          ) : null}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={TextQuote}
            title={filtered ? "Kein Textbaustein gefunden" : "Noch keine Textbausteine"}
            action={
              filtered ? (
                <LinkButton href="/admin/texte">Filter zurücksetzen</LinkButton>
              ) : (
                <LinkButton href="/admin/texte/neu" variant="primary" icon={Plus}>
                  Ersten Textbaustein anlegen
                </LinkButton>
              )
            }
          >
            {filtered
              ? "Versuch es mit einem anderen Suchbegriff oder setz die Filter zurück."
              : "Lege Texte an, die du oft brauchst, zum Beispiel dein Kurzprofil für Bewerbungen bei GHR Group. Angeheftete erscheinen bei jeder Vakanz."}
          </EmptyState>
        </Card>
      )}
    </>
  );
}
