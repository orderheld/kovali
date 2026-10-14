import Link from "next/link";
import { Pencil, Pin, PinOff } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, LinkButton, Mono } from "@/components/admin/ui";
import type { SnippetRow } from "@/lib/admin/data/snippets";
import { displayNo } from "@/lib/admin/format";
import { previewText, textStats } from "@/lib/admin/texts";
import { pinSnippet } from "../actions";

/** Pin or release a snippet. */
export function PinButton({ id, pinned, size = "sm" }: { id: number; pinned: boolean; size?: "sm" | "md" }) {
  const Icon = pinned ? PinOff : Pin;
  return (
    <ActionButton action={pinSnippet.bind(null, id, !pinned)} variant={size === "md" ? "secondary" : "ghost"} size={size} icon={<Icon aria-hidden className="size-4" />}>
      {pinned ? "Lösen" : "Anheften"}
    </ActionButton>
  );
}

/** One snippet in the list: title, category, company, the start of the text and a copy button for the whole text. */
export function SnippetCard({ snippet, showCategory = true }: { snippet: SnippetRow; showCategory?: boolean }) {
  const chars = textStats(snippet.body).chars;
  return (
    <Card as="article" className="flex min-w-0 flex-col">
      <div className="flex items-start gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.9375rem] font-semibold text-ink">
            <Link href={`/admin/texte/${snippet.id}`} className="hover:text-blue hover:underline">
              {snippet.title}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate">
            {snippet.pinned ? (
              <Badge tone="blue">
                <Pin aria-hidden className="size-3" />
                Angeheftet
              </Badge>
            ) : null}
            {showCategory && snippet.category ? <Badge>{snippet.category}</Badge> : null}
            {snippet.companyId && snippet.companyName ? (
              <Link href={`/admin/firmen/${snippet.companyId}`} className="hover:text-blue hover:underline">
                {snippet.companyName}
              </Link>
            ) : null}
            <Mono>{displayNo.snippet(snippet.id)}</Mono>
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-5 flex-1 px-4 text-sm leading-relaxed whitespace-pre-line text-slate">{previewText(snippet.body, 400)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-3">
        <CopyButton value={snippet.body} label="Kopieren" />
        <LinkButton href={`/admin/texte/${snippet.id}/bearbeiten`} size="sm" variant="ghost" icon={Pencil}>
          Bearbeiten
        </LinkButton>
        <PinButton id={snippet.id} pinned={snippet.pinned} />
        <span className="ml-auto text-xs text-slate tabular-nums">{new Intl.NumberFormat("de-CH").format(chars)} Zeichen</span>
      </div>
    </Card>
  );
}
