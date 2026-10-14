"use client";

import { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, useFormState } from "@/components/admin/form";
import { Badge, buttonClass, Notice } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { portalVisibilities, rateUnits } from "@/lib/admin/options";
import { HOURS_PER_DAY, monthlyExample, WORKDAYS_PER_MONTH } from "@/lib/admin/rates";
import { cn } from "@/lib/utils";
import { confidentialMentions, marginInfo, monthlyExampleText, parseAmountInput } from "../rules";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export interface PortalValues {
  portalVisibility: string;
  portalTitle: string | null;
  portalDescription: string | null;
  portalRate: number | null;
  portalRateUnit: string | null;
}

interface PortalContext {
  /** Suggestions from the mandate when nothing was saved for the portal yet. */
  suggestedTitle: string;
  suggestedDescription: string | null;
  /** End client and company: candidates should not learn them from the portal by accident. */
  confidentialNames: string[];
  rateSell: number | null;
  rateUnit: string | null;
  workload: number | null;
  /** KOVALI has a VAT number; otherwise the subcontractor's VAT is part of the cost. */
  kovaliVatRegistered: boolean;
}

function PortalFields({ values, context }: { values: PortalValues; context: PortalContext }) {
  const title = values.portalTitle ?? context.suggestedTitle;
  const description = values.portalDescription ?? context.suggestedDescription ?? "";
  const [live, setLive] = useState({
    text: `${title}\n${description}`,
    rate: values.portalRate?.toString() ?? "",
    unit: values.portalRateUnit ?? context.rateUnit ?? "stunde",
  });
  const mentions = confidentialMentions(live.text, context.confidentialNames);
  const rate = parseAmountInput(live.rate);
  const workloads = [100, ...(context.workload && context.workload < 100 ? [context.workload] : [])];
  const margin = marginInfo(context.rateSell, rate, context.rateUnit, live.unit, { kovaliVatRegistered: context.kovaliVatRegistered });

  return (
    // Reads title, text and rate on every change for the warnings and the example below.
    <div
      className="grid gap-4 sm:grid-cols-2"
      onChange={(e) => {
        const form = (e.currentTarget as HTMLElement).closest("form");
        if (!form) return;
        const fd = new FormData(form);
        setLive({
          text: `${fd.get("portalTitle") ?? ""}\n${fd.get("portalDescription") ?? ""}`,
          rate: String(fd.get("portalRate") ?? ""),
          unit: String(fd.get("portalRateUnit") ?? "stunde"),
        });
      }}
    >
      <SelectField
        name="portalVisibility"
        label="Sichtbarkeit"
        options={portalVisibilities}
        defaultValue={values.portalVisibility}
        hint="«Alle aktiven Kandidaten»: alle mit Portalzugang sehen die Vakanz. «Nur ausgewählte»: nur die unten geteilten."
        className="sm:col-span-2"
      />
      <TextField
        name="portalTitle"
        label="Titel im Portal"
        defaultValue={title}
        hint={values.portalTitle ? undefined : "Vorschlag aus dem Mandatstitel. Prüfe ihn, bevor du speicherst."}
        className="sm:col-span-2"
      />
      <TextAreaField
        name="portalDescription"
        label="Beschreibung im Portal"
        defaultValue={description}
        rows={8}
        hint={
          values.portalDescription
            ? "Projekteinsatz für Fachleute mit eigener GmbH oder AG (Subunternehmen von KOVALI)."
            : "Vorschlag aus der Mandatsbeschreibung. Kürze ihn auf das, was Kandidaten wissen müssen."
        }
        className="sm:col-span-2"
      />
      {mentions.length ? (
        <Notice tone="amber" icon={AlertTriangle} className="sm:col-span-2">
          Der Text nennt {mentions.map((n) => `«${n}»`).join(" und ")}. Kandidaten sehen das im Portal. Lass es nur stehen, wenn du das ausdrücklich willst.
        </Notice>
      ) : null}
      <TextField
        name="portalRate"
        label="Satz für die Fachperson"
        inputMode="decimal"
        suffix="CHF"
        defaultValue={values.portalRate}
        hint="Was die Firma der Fachperson als Subunternehmen erhält. Im Portal sichtbar."
      />
      <SelectField name="portalRateUnit" label="Einheit" options={rateUnits} defaultValue={values.portalRateUnit ?? context.rateUnit ?? "stunde"} required />
      <div aria-live="polite" className="space-y-1 rounded-md bg-mist px-3 py-2.5 text-sm sm:col-span-2">
        {rate !== null ? (
          workloads.map((w) => (
            <p key={w} className="text-ink tabular-nums">
              {monthlyExampleText(monthlyExample(rate, live.unit, w)!, live.unit)}
            </p>
          ))
        ) : (
          <p className="text-slate">Gib einen Satz ein, um das Monatsbeispiel zu sehen, wie es Kandidaten sehen.</p>
        )}
        {margin ? (
          <p
            className={cn(
              margin.tone === "red" ? "font-medium text-red-700" : margin.tone === "amber" ? "font-medium text-amber-800" : "text-emerald-700",
            )}
          >
            Marge zum Verkaufssatz: {margin.text}
            {margin.tone === "red" ? (margin.includesVat ? " – KOVALI würde draufzahlen." : " – höher als der Verkaufssatz.") : null}
          </p>
        ) : null}
        {/* The rate is a fee to the candidate's firm (subcontractor), not a wage: so "exkl. MWST", not "brutto". */}
        <p className="text-xs text-slate">
          Honorar an die Firma der Fachperson, exkl. MWST; {WORKDAYS_PER_MONTH} Arbeitstage zu {HOURS_PER_DAY} Stunden pro Monat.
        </p>
      </div>
    </div>
  );
}

/** Portal texts, visibility and the rate offered to the candidate, with a live example. */
export function PortalForm({ action, values, context }: { action: Action; values: PortalValues; context: PortalContext }) {
  return (
    <ActionForm action={action} submitLabel="Portal speichern" className="space-y-4">
      <PortalFields values={values} context={context} />
    </ActionForm>
  );
}

export interface ShareChoice {
  value: number;
  label: string;
  score: number | null;
  suggested: boolean;
  /** No own firm linked: the candidate can see the vacancy but cannot be proposed yet. */
  noFirm: boolean;
}

function ShareFields({ choices }: { choices: ShareChoice[] }) {
  const id = useId();
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.candidateIds : undefined;
  const [selected, setSelected] = useState<number[]>(() => choices.filter((c) => c.suggested).map((c) => c.value));
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const visible = needle ? choices.filter((c) => c.label.toLowerCase().includes(needle)) : choices;
  // Candidates shared in the meantime drop out of the choices and of the selection.
  const chosen = selected.filter((v) => choices.some((c) => c.value === v));
  const toggle = (value: number, on: boolean) => setSelected((s) => (on ? [...s, value] : s.filter((v) => v !== value)));

  return (
    <>
      <input type="hidden" name="candidateIds" value={JSON.stringify(chosen)} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor={`${id}-filter`} className="mb-1.5 block text-sm font-medium text-ink">
            Kandidaten filtern
          </label>
          <input
            id={`${id}-filter`}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            // Enter filters; it must not share the vacancy.
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Name, Nummer oder Rolle"
            className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-slate/60 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
          />
        </div>
        <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setSelected(choices.filter((c) => c.suggested).map((c) => c.value))}>
          Treffer auswählen
        </button>
        <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setSelected([])}>
          Auswahl leeren
        </button>
      </div>
      {/* min-w-0: a fieldset is at least as wide as its content by default, so long names would not truncate. */}
      <fieldset aria-describedby={error ? `${id}-error` : undefined} className="min-w-0">
        <legend className="sr-only">Kandidaten, mit denen du die Vakanz teilst</legend>
        <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto rounded-md border border-line bg-white">
          {visible.map((c) => (
            <li key={c.value}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-mist">
                <input
                  type="checkbox"
                  checked={chosen.includes(c.value)}
                  onChange={(e) => toggle(c.value, e.target.checked)}
                  className="size-4 shrink-0 rounded border-line accent-blue"
                />
                <span className="min-w-0 flex-1 truncate text-ink" title={c.label}>
                  {c.label}
                </span>
                {c.noFirm ? <Badge tone="amber">Keine Firma</Badge> : null}
                {c.score !== null ? <Badge tone={c.suggested ? "green" : "neutral"}>{c.suggested ? `Treffer · ${c.score}` : `Score ${c.score}`}</Badge> : null}
              </label>
            </li>
          ))}
          {visible.length ? null : <li className="px-3 py-3 text-sm text-slate">{choices.length ? "Kein Kandidat passt zum Filter." : "Mit allen aktiven Kandidaten geteilt."}</li>}
        </ul>
      </fieldset>
      {error ? (
        <p id={`${id}-error`} className="text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <SubmitButton size="sm">
        Mit {chosen.length} {chosen.length === 1 ? "Kandidat" : "Kandidaten"} teilen
      </SubmitButton>
    </>
  );
}

/** Picks candidates to offer the vacancy to; good matches are preselected. */
export function SharePicker({ action, choices }: { action: Action; choices: ShareChoice[] }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <ShareFields choices={choices} />
    </ActionForm>
  );
}
