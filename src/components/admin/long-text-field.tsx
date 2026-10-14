"use client";

import { useId, useRef, useState } from "react";
import { TextQuote } from "lucide-react";
import { formatTextStats, groupSnippets, textStats } from "@/lib/admin/texts";
import { cn } from "@/lib/utils";
import { FieldShell, useFormState } from "./form";
import { buttonClass } from "./ui";

/** A snippet offered for insertion into a long text. */
export interface SnippetChoice {
  id: number;
  title: string;
  category: string | null;
  pinned: boolean;
  body: string;
}

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] leading-relaxed text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

const pickerClass =
  "h-8 min-w-0 max-w-full flex-1 rounded-md border border-line bg-white pr-8 pl-2.5 text-[0.8125rem] text-ink hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none sm:max-w-80";

/**
 * A large text field for texts that are copied later (snippets, application texts): shows the
 * number of characters and words while typing, for forms with a length limit. With `snippets`,
 * a picker inserts a snippet at the cursor, as a paragraph of its own.
 */
export function LongTextField({
  name,
  label,
  defaultValue,
  rows = 12,
  hint,
  placeholder,
  required,
  snippets,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  snippets?: SnippetChoice[];
  className?: string;
}) {
  const id = `${useId()}-${name}`;
  const pickerId = `${id}-picker`;
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.[name] : undefined;
  const area = useRef<HTMLTextAreaElement>(null);
  const [chosen, setChosen] = useState("");
  const [stats, setStats] = useState(() => textStats(defaultValue));

  const insert = () => {
    const snippet = snippets?.find((s) => String(s.id) === chosen);
    const el = area.current;
    if (!snippet || !el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    // A paragraph of its own: a blank line before and after, unless one is there already.
    const gap = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const trail = after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    el.focus();
    el.setRangeText(gap + snippet.body + trail, start, end, "end");
    // The cursor goes right after the inserted text, before the blank line.
    const cursor = start + gap.length + snippet.body.length;
    el.setSelectionRange(cursor, cursor);
    setStats(textStats(el.value));
    setChosen("");
  };

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      className={className}
      hint={
        <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <span>{hint}</span>
          <span className="tabular-nums">{formatTextStats(stats)}</span>
        </span>
      }
    >
      {snippets?.length ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label htmlFor={pickerId} className="sr-only">
            Textbaustein zum Einfügen
          </label>
          <select id={pickerId} value={chosen} onChange={(e) => setChosen(e.target.value)} className={pickerClass}>
            <option value="">Textbaustein wählen …</option>
            {groupSnippets(snippets).map((section) => (
              <optgroup key={section.key || "-"} label={section.title}>
                {section.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={insert} disabled={!chosen} className={buttonClass("secondary", "sm")}>
            <TextQuote aria-hidden className="size-4" />
            An der Cursorstelle einfügen
          </button>
        </div>
      ) : null}
      <textarea
        ref={area}
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        onInput={(e) => setStats(textStats(e.currentTarget.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
        className={cn(control)}
      />
    </FieldShell>
  );
}
