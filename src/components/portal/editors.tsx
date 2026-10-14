"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import { languageLevels } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { controlClass, useFieldError } from "./fields";

/**
 * Editors for the repeatable parts of a profile (Werdegang, Ausbildung, Sprachen). The
 * entries live in local state and travel as JSON in one hidden field; the server validates
 * them with the same schema as the stored payload. The visible inputs have no name, so they
 * do not end up in the form data on their own.
 */

interface Keyed<T> {
  key: number;
  value: T;
}

function useEntries<T>(initial: T[]) {
  const next = useRef(initial.length);
  const [items, setItems] = useState<Keyed<T>[]>(() => initial.map((value, key) => ({ key, value })));
  return {
    items,
    add(value: T, atStart = false) {
      const entry = { key: next.current++, value };
      setItems((list) => (atStart ? [entry, ...list] : [...list, entry]));
      return entry.key;
    },
    update(key: number, patch: Partial<T>) {
      setItems((list) => list.map((e) => (e.key === key ? { ...e, value: { ...e.value, ...patch } } : e)));
    },
    remove(key: number) {
      setItems((list) => list.filter((e) => e.key !== key));
    },
    move(key: number, by: -1 | 1) {
      setItems((list) => {
        const i = list.findIndex((e) => e.key === key);
        const j = i + by;
        if (i < 0 || j < 0 || j >= list.length) return list;
        const copy = [...list];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
      });
    },
  };
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[0.8125rem] text-slate">{hint}</p> : null}
    </div>
  );
}

function EditorShell({
  name,
  value,
  title,
  hint,
  count,
  empty,
  children,
  addLabel,
  onAdd,
}: {
  name: string;
  value: string;
  title: string;
  hint?: React.ReactNode;
  count: number;
  empty: string;
  children: React.ReactNode;
  addLabel: string;
  onAdd: () => void;
}) {
  const error = useFieldError(name);
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="space-y-4">
      <legend className="sr-only">{title}</legend>
      <input type="hidden" name={name} value={value} />
      {hint ? <p className="text-sm text-slate">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
      {count ? children : <p className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-slate">{empty}</p>}
      <button type="button" onClick={onAdd} className={buttonClass("secondary", "md", "w-full sm:w-auto")}>
        <Plus aria-hidden className="size-4" />
        {addLabel}
      </button>
    </fieldset>
  );
}

function EntryCard({
  title,
  onRemove,
  onUp,
  onDown,
  children,
}: {
  title: string;
  onRemove: () => void;
  onUp?: () => void;
  onDown?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2 sm:px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</p>
        {onUp ? (
          <button type="button" onClick={onUp} className="rounded p-2 text-slate hover:bg-mist hover:text-ink" aria-label={`${title} nach oben`}>
            <ArrowUp aria-hidden className="size-4" />
          </button>
        ) : null}
        {onDown ? (
          <button type="button" onClick={onDown} className="rounded p-2 text-slate hover:bg-mist hover:text-ink" aria-label={`${title} nach unten`}>
            <ArrowDown aria-hidden className="size-4" />
          </button>
        ) : null}
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-red-700 hover:bg-red-50" aria-label={`${title} entfernen`}>
          <Trash2 aria-hidden className="size-4" />
          <span className="hidden sm:inline">Entfernen</span>
        </button>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">{children}</div>
    </div>
  );
}

function focusLater(id: string) {
  // After React rendered the new entry.
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}

/** "2021-03" → "03.2021" for display; anything else stays as typed. */
function monthToInput(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? `${m[2]}.${m[1]}` : value;
}

// --- Werdegang ------------------------------------------------------------------

export interface ExperienceInput {
  role: string;
  client: string;
  industry: string;
  from: string;
  to: string;
  description: string;
  technologies: string[];
}

interface ExperienceDraft {
  role: string;
  client: string;
  industry: string;
  from: string;
  to: string;
  description: string;
  technologies: string;
}

export function ExperienceEditor({ name, initial }: { name: string; initial: ExperienceInput[] }) {
  const base = useId();
  const list = useEntries<ExperienceDraft>(
    initial.map((e) => ({ ...e, from: monthToInput(e.from), to: monthToInput(e.to), technologies: (e.technologies ?? []).join(", ") })),
  );
  const value = JSON.stringify(list.items.map((e) => e.value));
  return (
    <EditorShell
      name={name}
      value={value}
      title="Werdegang"
      hint="Projekte und Stellen der letzten Jahre. Die Reihenfolge ergibt sich aus dem Zeitraum (aktuelle zuerst)."
      count={list.items.length}
      empty="Noch keine Einträge."
      addLabel="Projekt oder Stelle hinzufügen"
      onAdd={() => {
        const key = list.add({ role: "", client: "", industry: "", from: "", to: "", description: "", technologies: "" }, true);
        focusLater(`${base}-${key}-role`);
      }}
    >
      <div className="space-y-3">
        {list.items.map(({ key, value: e }, index) => {
          const id = (f: string) => `${base}-${key}-${f}`;
          return (
            <EntryCard key={key} title={e.role || `Eintrag ${index + 1}`} onRemove={() => list.remove(key)}>
              <Field id={id("role")} label="Funktion oder Rolle *" className="sm:col-span-2">
                <input id={id("role")} value={e.role} onChange={(ev) => list.update(key, { role: ev.target.value })} maxLength={160} className={controlClass} />
              </Field>
              <Field id={id("client")} label="Kunde oder Firma" hint="Gerne anonymisiert, z. B. «Grossbank, Zürich».">
                <input id={id("client")} value={e.client} onChange={(ev) => list.update(key, { client: ev.target.value })} maxLength={160} className={controlClass} />
              </Field>
              <Field id={id("industry")} label="Branche">
                <input id={id("industry")} value={e.industry} onChange={(ev) => list.update(key, { industry: ev.target.value })} maxLength={120} className={controlClass} />
              </Field>
              <Field id={id("from")} label="Von (Monat.Jahr) *">
                <input
                  id={id("from")}
                  value={e.from}
                  onChange={(ev) => list.update(key, { from: ev.target.value })}
                  placeholder="03.2021"
                  inputMode="numeric"
                  maxLength={7}
                  className={controlClass}
                />
              </Field>
              <Field id={id("to")} label="Bis (Monat.Jahr)" hint="Leer lassen, wenn der Einsatz noch läuft.">
                <input
                  id={id("to")}
                  value={e.to}
                  onChange={(ev) => list.update(key, { to: ev.target.value })}
                  placeholder="heute"
                  inputMode="numeric"
                  maxLength={7}
                  className={controlClass}
                />
              </Field>
              <Field id={id("description")} label="Aufgaben und Ergebnisse" className="sm:col-span-2">
                <textarea
                  id={id("description")}
                  value={e.description}
                  onChange={(ev) => list.update(key, { description: ev.target.value })}
                  rows={4}
                  maxLength={4000}
                  className={cn(controlClass, "leading-relaxed")}
                />
              </Field>
              <Field id={id("technologies")} label="Methoden und Tools" hint="Mit Komma getrennt, z. B. Jira, BPMN, SAP FI." className="sm:col-span-2">
                <input id={id("technologies")} value={e.technologies} onChange={(ev) => list.update(key, { technologies: ev.target.value })} className={controlClass} />
              </Field>
            </EntryCard>
          );
        })}
      </div>
    </EditorShell>
  );
}

// --- Ausbildung -----------------------------------------------------------------

export interface EducationInput {
  title: string;
  institution: string;
  year: string;
}

export function EducationEditor({ name, initial }: { name: string; initial: EducationInput[] }) {
  const base = useId();
  const list = useEntries<EducationInput>(initial);
  return (
    <EditorShell
      name={name}
      value={JSON.stringify(list.items.map((e) => e.value))}
      title="Ausbildung"
      hint="Abschlüsse und Weiterbildungen. Zertifikate wie IREB oder ISTQB erfassen Sie unter Kompetenzen."
      count={list.items.length}
      empty="Noch keine Einträge."
      addLabel="Ausbildung hinzufügen"
      onAdd={() => focusLater(`${base}-${list.add({ title: "", institution: "", year: "" })}-title`)}
    >
      <div className="space-y-3">
        {list.items.map(({ key, value: e }, index) => {
          const id = (f: string) => `${base}-${key}-${f}`;
          return (
            <EntryCard
              key={key}
              title={e.title || `Eintrag ${index + 1}`}
              onRemove={() => list.remove(key)}
              onUp={index > 0 ? () => list.move(key, -1) : undefined}
              onDown={index < list.items.length - 1 ? () => list.move(key, 1) : undefined}
            >
              <Field id={id("title")} label="Abschluss oder Ausbildung *" className="sm:col-span-2">
                <input id={id("title")} value={e.title} onChange={(ev) => list.update(key, { title: ev.target.value })} maxLength={200} className={controlClass} />
              </Field>
              <Field id={id("institution")} label="Schule oder Institution">
                <input id={id("institution")} value={e.institution} onChange={(ev) => list.update(key, { institution: ev.target.value })} maxLength={200} className={controlClass} />
              </Field>
              <Field id={id("year")} label="Jahr">
                <input id={id("year")} value={e.year} onChange={(ev) => list.update(key, { year: ev.target.value })} placeholder="2015" maxLength={20} className={controlClass} />
              </Field>
            </EntryCard>
          );
        })}
      </div>
    </EditorShell>
  );
}

// --- Sprachen -------------------------------------------------------------------

export interface LanguageInput {
  language: string;
  level: string;
}

const commonLanguages = ["Deutsch", "Englisch", "Französisch", "Italienisch", "Spanisch", "Portugiesisch", "Niederländisch", "Türkisch", "Polnisch", "Russisch", "Arabisch", "Chinesisch"];

export function LanguagesEditor({ name, initial }: { name: string; initial: LanguageInput[] }) {
  const base = useId();
  const list = useEntries<LanguageInput>(initial);
  return (
    <EditorShell
      name={name}
      value={JSON.stringify(list.items.map((e) => e.value))}
      title="Sprachen"
      hint="Muttersprache zuerst, dann nach Niveau."
      count={list.items.length}
      empty="Noch keine Sprachen erfasst."
      addLabel="Sprache hinzufügen"
      onAdd={() => focusLater(`${base}-${list.add({ language: "", level: "" })}-language`)}
    >
      <datalist id={`${base}-languages`}>
        {commonLanguages.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <div className="space-y-3">
        {list.items.map(({ key, value: e }, index) => {
          const id = (f: string) => `${base}-${key}-${f}`;
          return (
            <EntryCard
              key={key}
              title={e.language || `Sprache ${index + 1}`}
              onRemove={() => list.remove(key)}
              onUp={index > 0 ? () => list.move(key, -1) : undefined}
              onDown={index < list.items.length - 1 ? () => list.move(key, 1) : undefined}
            >
              <Field id={id("language")} label="Sprache *">
                <input
                  id={id("language")}
                  list={`${base}-languages`}
                  value={e.language}
                  onChange={(ev) => list.update(key, { language: ev.target.value })}
                  maxLength={60}
                  className={controlClass}
                />
              </Field>
              <Field id={id("level")} label="Niveau *">
                <select id={id("level")} value={e.level} onChange={(ev) => list.update(key, { level: ev.target.value })} className={cn(controlClass, "pr-8")}>
                  <option value="">Bitte wählen</option>
                  {languageLevels.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </EntryCard>
          );
        })}
      </div>
    </EditorShell>
  );
}
