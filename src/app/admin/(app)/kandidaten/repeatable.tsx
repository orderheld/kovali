"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useFormState } from "@/components/admin/form";
import { buttonClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Repeatable form sections (languages, education, career) for the candidate form. The rows
 * live in client state and are submitted as one JSON array in a hidden input, which the
 * server validates with f.jsonList (schema.ts). Inner inputs have no name, so FormData only
 * carries the JSON.
 */

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none";

interface Row<T> {
  key: number;
  value: T;
}

/** Stable React keys for rows (indices would mix up inputs when rows move). */
let keySequence = 0;
const newKey = () => ++keySequence;

export function RepeatableField<T extends object>({
  name,
  label,
  defaultValue,
  emptyItem,
  addLabel,
  itemTitle,
  renderItem,
  max = 50,
  emptyText = "Noch keine Einträge.",
}: {
  name: string;
  /** Section name for screen readers, e.g. "Sprachen". */
  label: string;
  defaultValue: T[];
  emptyItem: () => T;
  addLabel: string;
  /** Heading of a row, e.g. the role and period of a position. */
  itemTitle: (item: T, index: number) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void, idPrefix: string) => React.ReactNode;
  max?: number;
  emptyText?: string;
}) {
  const [rows, setRows] = useState<Row<T>[]>(() => defaultValue.map((value) => ({ key: newKey(), value })));
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.[name] : undefined;

  // Keyboard users land in the first field of a new row.
  useEffect(() => {
    if (focusKey === null) return;
    listRef.current?.querySelector<HTMLElement>(`[data-row="${focusKey}"] :is(input, select, textarea)`)?.focus();
  }, [focusKey]);

  const update = (key: number, patch: Partial<T>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, value: { ...r.value, ...patch } } : r)));
  const move = (index: number, by: -1 | 1) =>
    setRows((list) => {
      const next = [...list];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  const remove = (key: number) => {
    setRows((list) => list.filter((r) => r.key !== key));
    addRef.current?.focus();
  };
  const add = () => {
    const key = newKey();
    setRows((list) => [...list, { key, value: emptyItem() }]);
    setFocusKey(key);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows.map((r) => r.value))} />
      {/* Above the list: with many entries an error below it would be out of sight. */}
      {error ? (
        <p id={`${baseId}-error`} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {rows.length ? (
        <ol ref={listRef} className="space-y-3" aria-label={label} aria-describedby={error ? `${baseId}-error` : undefined}>
          {rows.map((row, i) => {
            const title = itemTitle(row.value, i) || `Eintrag ${i + 1}`;
            // Not "<prefix>-title": the fields of a row get ids from that prefix (e.g. "Abschluss" is "<prefix>-title").
            const titleId = `${baseId}-heading-${row.key}`;
            return (
              <li key={row.key} data-row={row.key} className="rounded-md border border-line bg-mist/40 p-4">
                <div role="group" aria-labelledby={titleId}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p id={titleId} className="min-w-0 pt-1 text-sm font-medium break-words text-ink">
                      <span className="sr-only">{`${label}, Eintrag ${i + 1}: `}</span>
                      {title}
                    </p>
                    <span className="flex shrink-0 gap-1">
                      <IconButton label={`Eintrag ${i + 1} nach oben`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp aria-hidden className="size-4" />
                      </IconButton>
                      <IconButton label={`Eintrag ${i + 1} nach unten`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown aria-hidden className="size-4" />
                      </IconButton>
                      <IconButton label={`Eintrag ${i + 1} entfernen`} danger onClick={() => remove(row.key)}>
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </span>
                  </div>
                  {renderItem(row.value, (patch) => update(row.key, patch), `${baseId}-${row.key}`)}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-slate">{emptyText}</p>
      )}
      <button ref={addRef} type="button" onClick={add} disabled={rows.length >= max} className={buttonClass("secondary", "sm")}>
        <Plus aria-hidden className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-slate transition-colors hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:pointer-events-none disabled:opacity-35",
        danger && "hover:text-red-700",
      )}
    >
      {children}
    </button>
  );
}

function RowLabel({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[0.8125rem] font-medium text-ink">
      {label}
      {required ? <span aria-hidden className="text-blue"> *</span> : null}
    </label>
  );
}

export function RowText({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  list,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "month";
  placeholder?: string;
  list?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <RowLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        type={type}
        value={value}
        list={list}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={control}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function RowSelect({
  id,
  label,
  value,
  onChange,
  options,
  emptyLabel,
  required,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  emptyLabel?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <RowLabel htmlFor={id} label={label} required={required} />
      <select id={id} value={value} aria-required={required || undefined} onChange={(e) => onChange(e.target.value)} className={cn(control, "pr-8")}>
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RowTextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <RowLabel htmlFor={id} label={label} />
      <textarea id={id} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(control, "leading-relaxed")} />
    </div>
  );
}

/** Controlled tag input for a row (TagInputField in form.tsx submits its own hidden field). */
export function RowTags({
  id,
  label,
  value,
  onChange,
  suggestionsId,
  placeholder = "Eingeben und Enter drücken",
  className,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  /** id of a <datalist> rendered once by the form. */
  suggestionsId?: string;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    setDraft("");
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
  };
  return (
    <div className={className}>
      <RowLabel htmlFor={id} label={label} />
      <div className={cn(control, "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20")}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-mist py-0.5 pr-1 pl-2 text-[0.8125rem] text-ink ring-1 ring-line">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="rounded p-0.5 text-slate hover:bg-white hover:text-red-700"
              aria-label={`${t} entfernen`}
            >
              <X aria-hidden className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          list={suggestionsId}
          value={draft}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && draft === "" && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1 text-[0.9375rem] outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
