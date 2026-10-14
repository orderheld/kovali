import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/admin/ui";
import type { DiffItem, FieldChange } from "@/lib/portal/profile";
import { cn } from "@/lib/utils";

/** Readable before/after view of a change request (server component). */

function Value({ children, tone }: { children: string; tone: "before" | "after" }) {
  const empty = children === "–";
  return (
    <span
      className={cn(
        "flex gap-2 rounded px-2 py-1 text-sm whitespace-pre-line break-words",
        empty ? "bg-mist text-slate" : tone === "before" ? "bg-red-50/70 text-slate" : "bg-emerald-50 text-ink",
      )}
    >
      {/* On phones the columns stack; the label says which value is which. */}
      <span aria-hidden className="w-11 shrink-0 text-xs leading-5 text-slate sm:hidden">
        {tone === "before" ? "Bisher" : "Neu"}
      </span>
      <span className={cn("min-w-0", tone === "before" && !empty && "line-through decoration-red-300")}>{children}</span>
    </span>
  );
}

function FieldRows({ fields }: { fields: FieldChange[] }) {
  return (
    <dl className="divide-y divide-line/70">
      {fields.map((c) => (
        <div key={c.label} className="grid gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3">
          <dt className="text-[0.8125rem] font-medium text-slate sm:pt-1">{c.label}</dt>
          <dd className="sm:contents">
            <span className="sr-only">Bisher: </span>
            <Value tone="before">{c.before}</Value>
            <span className="sr-only">Neu: </span>
            <Value tone="after">{c.after}</Value>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const changeLabel = { added: "Neu", removed: "Entfernt", changed: "Geändert" } as const;
const changeTone = { added: "green", removed: "red", changed: "amber" } as const;

export function DiffView({ items }: { items: DiffItem[] }) {
  if (!items.length) return <p className="text-sm text-slate">Keine Unterschiede zu den bestätigten Angaben.</p>;
  const fields = items.filter((i): i is Extract<DiffItem, { type: "field" }> => i.type === "field");
  const rest = items.filter((i) => i.type !== "field");
  return (
    <div className="space-y-4">
      {fields.length ? (
        <div>
          <div className="mb-1.5 hidden grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 text-xs font-medium tracking-wide text-slate uppercase sm:grid">
            <span />
            <span>Bisher bestätigt</span>
            <span>Neu vorgeschlagen</span>
          </div>
          <FieldRows fields={fields} />
        </div>
      ) : null}
      {rest.map((item, i) => {
        if (item.type === "list") {
          return (
            <div key={`${item.label}-${i}`}>
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate">{item.label}</p>
              <ul className="flex flex-wrap gap-1.5">
                {item.added.map((v) => (
                  <li key={`+${v}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.8125rem] text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
                    <Plus aria-label="hinzugefügt" className="size-3" />
                    {v}
                  </li>
                ))}
                {item.removed.map((v) => (
                  <li key={`-${v}`} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[0.8125rem] text-red-700 line-through ring-1 ring-red-600/20 ring-inset">
                    <Minus aria-label="entfernt" className="size-3" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (item.type !== "entry") return null;
        return (
          <div key={`${item.label}-${item.title}-${i}`} className="rounded-md border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={changeTone[item.change]}>{changeLabel[item.change]}</Badge>
              <span className="text-[0.8125rem] text-slate">{item.label}</span>
            </div>
            <p className={cn("mt-1.5 font-medium text-ink", item.change === "removed" && "line-through decoration-red-300")}>{item.title}</p>
            {item.subtitle ? <p className="text-sm text-slate">{item.subtitle}</p> : null}
            {item.fields.length && item.change !== "removed" ? (
              <div className="mt-3">
                {item.change === "added" ? (
                  <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    {item.fields.map((c) => (
                      <div key={c.label} className="contents">
                        <dt className="text-[0.8125rem] font-medium text-slate">{c.label}</dt>
                        <dd className="text-sm whitespace-pre-line break-words text-ink">{c.after}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <FieldRows fields={item.fields} />
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
