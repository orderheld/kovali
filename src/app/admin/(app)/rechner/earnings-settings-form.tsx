"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ActionForm, CheckboxField, FormSection, SelectField, TextField } from "@/components/admin/form";
import { Badge } from "@/components/admin/ui";
import {
  computeEarnings,
  EARNINGS_FIELDS,
  EARNINGS_SECTIONS,
  fieldValue,
  settingsFromFlat,
  sourceBadge,
  sourcesFor,
  type EarningsField,
  type EarningsSettings,
  type EarningsSource,
} from "@/lib/admin/earnings";
import { formatChf, formatNumber } from "@/lib/admin/format";
import { parseDecimal } from "@/lib/admin/payroll";
import { saveEarningsSettings } from "./actions";

/**
 * The assumptions behind every earnings figure (settings "einkommen"), grouped as in
 * EARNINGS_SECTIONS, each section with its sources. Values marked "Richtwert" or "Annahme"
 * are estimates that Ferhat should replace with his own offers.
 */

/** "Richtwert" wins over "Annahme": the weakest source of a field decides its badge. */
function fieldBadge(field: EarningsField): "Richtwert" | "Annahme" | null {
  const badges = sourcesFor([field.key]).map(sourceBadge);
  if (badges.includes("Richtwert")) return "Richtwert";
  return badges.includes("Annahme") ? "Annahme" : null;
}

function display(field: EarningsField, value: number | boolean | string): string {
  if (field.type === "boolean") return value ? "ja" : "nein";
  if (field.type === "choice") return field.choices?.find((c) => c.value === value)?.label ?? String(value);
  return `${formatNumber(value as number, 3)}${field.suffix ? ` ${field.suffix}` : ""}`;
}

/** Settings as currently typed; fields that do not parse keep the value of `base`. */
function readSettings(form: HTMLFormElement, base: EarningsSettings): EarningsSettings {
  const fd = new FormData(form);
  const flat: Record<string, unknown> = {};
  for (const f of EARNINGS_FIELDS) {
    if (f.type === "boolean") flat[f.key] = fd.has(f.key);
    else if (f.type === "choice") flat[f.key] = fd.get(f.key) ?? fieldValue(base, f.key);
    else {
      const n = parseDecimal(fd.get(f.key) ?? "");
      flat[f.key] = Number.isFinite(n) && n >= (f.min ?? 0) && n <= (f.max ?? 1_000_000) ? n : fieldValue(base, f.key);
    }
  }
  return settingsFromFlat(flat, base);
}

const EXAMPLE = { rate: 120, unit: "stunde", workload: 100, hoursPerMonth: null, expensesMonthly: 0 } as const;

function Example({ settings }: { settings: EarningsSettings }) {
  const net = (billing: "rechnung" | "lohn", rateBasis: "brutto" | "kostensatz") => computeEarnings({ ...EXAMPLE, billing, rateBasis }, settings)?.net.month ?? null;
  const rows = [
    { label: "Rechnung", value: net("rechnung", "brutto") },
    { label: "Lohn, brutto", value: net("lohn", "brutto") },
    { label: "Lohn, Kostensatz", value: net("lohn", "kostensatz") },
  ];
  return (
    <div className="rounded-lg border border-line bg-mist/60 px-4 py-3 text-sm" aria-live="polite">
      <p className="text-slate">
        Mit diesen Werten bleiben dir bei CHF 120 pro Stunde und 100 % Pensum pro Monat {settings.taxReservePercent > 0 ? "nach Steuer-Rücklage" : "vor Steuern"}:
      </p>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="text-slate">{r.label}</dt>
            <dd className="font-semibold text-ink tabular-nums">{r.value === null ? "–" : formatChf(r.value, { round: true })}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Sources({ sources }: { sources: EarningsSource[] }) {
  if (!sources.length) return null;
  return (
    <details className="group rounded-md border border-line bg-white sm:col-span-full">
      <summary className="cursor-pointer px-3 py-2 text-[0.8125rem] font-medium text-slate select-none hover:text-ink">Quellen ({sources.length})</summary>
      <ul className="space-y-3 border-t border-line px-3 py-3 text-[0.8125rem] leading-snug">
        {sources.map((s, i) => {
          const badge = sourceBadge(s);
          return (
            <li key={i}>
              <p className="text-ink">
                {badge ? (
                  <Badge tone={badge === "Richtwert" ? "amber" : "blue"} className="mr-1.5 align-[1px]">
                    {badge}
                  </Badge>
                ) : null}
                {s.label}.
              </p>
              <p className="mt-0.5 text-slate">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue hover:underline">
                    {s.source}
                    <ExternalLink aria-hidden className="size-3" />
                  </a>
                ) : (
                  s.source
                )}
                {s.note ? ` · ${s.note}` : null}
              </p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function Field({ field, settings, defaults }: { field: EarningsField; settings: EarningsSettings; defaults: EarningsSettings }) {
  const value = fieldValue(settings, field.key);
  const standard = fieldValue(defaults, field.key);
  const badge = fieldBadge(field);
  const hint =
    badge || field.hint || value !== standard ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {badge ? <Badge tone={badge === "Richtwert" ? "amber" : "blue"}>{badge}</Badge> : null}
        {field.hint ? <span>{field.hint}</span> : null}
        {value !== standard ? (
          <span>
            {field.key === "vatRegistered"
              ? `In den Firmendaten ist KOVALI ${standard ? "" : "nicht "}als MWST-pflichtig erfasst.`
              : `Standard: ${display(field, standard)}`}
          </span>
        ) : null}
      </span>
    ) : undefined;

  if (field.type === "boolean") return <CheckboxField name={field.key} label={field.label} defaultChecked={value === true} hint={hint} className="sm:col-span-full" />;
  if (field.type === "choice") return <SelectField name={field.key} label={field.label} options={field.choices ?? []} defaultValue={String(value)} hint={hint} />;
  return <TextField name={field.key} label={field.label} inputMode={field.integer ? "numeric" : "decimal"} suffix={field.suffix} defaultValue={String(value)} hint={hint} />;
}

export function EarningsSettingsForm({ settings, defaults }: { settings: EarningsSettings; defaults: EarningsSettings }) {
  const [current, setCurrent] = useState(settings);
  const onFormEvent = (e: React.FormEvent<HTMLDivElement>) => {
    const form = (e.target as HTMLInputElement).form;
    if (form) setCurrent(readSettings(form, settings));
  };

  return (
    <div onInput={onFormEvent} onChange={onFormEvent}>
      <ActionForm action={saveEarningsSettings} submitLabel="Als meine Annahmen speichern">
        <Example settings={current} />
        {EARNINGS_SECTIONS.map((section) => {
          const fields = EARNINGS_FIELDS.filter((f) => f.section === section.id);
          return (
            <FormSection key={section.id} title={section.title} description={section.description} columns={3}>
              {fields.map((f) => (
                <Field key={f.key} field={f} settings={settings} defaults={defaults} />
              ))}
              <Sources sources={sourcesFor(fields.map((f) => f.key))} />
            </FormSection>
          );
        })}
      </ActionForm>
    </div>
  );
}
