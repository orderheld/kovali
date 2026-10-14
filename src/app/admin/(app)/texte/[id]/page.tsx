import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Pin } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { Badge, Card, CardBody, CardHeader, LinkButton, Mono, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref } from "@/lib/admin/data/query";
import { getSnippet } from "@/lib/admin/data/snippets";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDateTime } from "@/lib/admin/format";
import { formatTextStats, textStats } from "@/lib/admin/texts";
import { PinButton } from "../_components/snippet-card";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/texte/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.snippet(id) : "Textbaustein" };
}

export default async function SnippetPage({ params }: PageProps<"/admin/texte/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const snippet = await getSnippet(id);
  if (!snippet) notFound();

  return (
    <>
      <PageHeader
        title={snippet.title}
        crumbs={[{ label: "Textbausteine", href: "/admin/texte" }, { label: displayNo.snippet(id) }]}
        meta={
          <>
            {snippet.pinned ? (
              <Badge tone="blue">
                <Pin aria-hidden className="size-3" />
                Angeheftet
              </Badge>
            ) : null}
            {snippet.category ? (
              <Link href={listHref("/admin/texte", { kategorie: snippet.category })} className="hover:opacity-80">
                <Badge>{snippet.category}</Badge>
              </Link>
            ) : null}
            {snippet.companyId && snippet.companyName ? (
              <Link href={`/admin/firmen/${snippet.companyId}`} className="text-sm font-medium text-blue hover:underline">
                {snippet.companyName}
              </Link>
            ) : (
              <span className="text-sm text-slate">Für alle Firmen</span>
            )}
            <Mono>{displayNo.snippet(id)}</Mono>
          </>
        }
        actions={
          <>
            <PinButton id={id} pinned={snippet.pinned} size="md" />
            <LinkButton href={`/admin/texte/${id}/bearbeiten`} icon={Pencil}>
              Bearbeiten
            </LinkButton>
            <CopyButton value={snippet.body} label="Text kopieren" variant="primary" size="md" />
          </>
        }
      />
      <Card className="max-w-4xl">
        <CardHeader title="Text" description={formatTextStats(textStats(snippet.body))} actions={<CopyButton value={snippet.body} label="Kopieren" />} />
        <CardBody className="space-y-3">
          <div className="rounded-md border border-line bg-mist/40 px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink">{snippet.body}</div>
          <p className="text-xs text-slate">
            Erstellt am {formatDateTime(snippet.createdAt)}, zuletzt geändert am {formatDateTime(snippet.updatedAt)}.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
