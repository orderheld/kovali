"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { SelectField, TextField } from "@/components/admin/form";
import { Card, CardBody, CardHeader, LinkButton, Notice, StatTile } from "@/components/admin/ui";
import {
  computeEarnings,
  formatHours,
  formatRate,
  hoursPerYear,
  netLabel,
  netTaxNote,
  workingDaysPerYear,
  type BillingModel,
  type Earnings,
  type EarningsSettings,
  type RateBasis,
} from "@/lib/admin/earnings";
import { formatChf, formatPercent } from "@/lib/admin/format";
import { rateUnits } from "@/lib/admin/options";
import { parseDecimal } from "@/lib/admin/payroll";
import { cn } from "@/lib/utils";
import { EarningsBreakdown } from "../_shared/earnings-breakdown";
import { PrintButton, PrintStyles } from "./print";

/**
 * "Was bleibt mir?": one rate read three ways (invoice, gross wage, provider's cost rate) with
 * Ferhat's saved assumptions. Nothing is stored; "Als Auftrag erfassen" carries the inputs over.
 */

export interface CalculatorInitial {
  rate: number | null;
  unit: "stunde" | "tag";
  workload: number;
  billing: BillingModel;
  rateBasis: RateBasis;
  hoursPerMonth: number | null;
  expensesMonthly: number;
}

interface Inputs {
  rate: number;
  unit: "stunde" | "tag";
  workload: number;
  hoursPerMonth: number;
  expensesMonthly: number;
}

const variants: readonly { billing: BillingModel; rateBasis: RateBasis; title: string; description: string }[] = [
  { billing: "rechnung", rateBasis: "brutto", title: "Rechnung über Einzelfirma", description: "Der Satz ist dein Honorar ohne MWST." },
  { billing: "lohn", rateBasis: "brutto", title: "Lohn, Satz ist brutto", description: "Stundenlohn inkl. Ferien, Feiertage und 13. Monatslohn." },
  { billing: "lohn", rateBasis: "kostensatz", title: "Lohn, Satz ist Kostensatz", description: "Was die Firma pro Stunde insgesamt für dich ausgibt." },
];

function readInputs(form: HTMLFormElement): Inputs {
  const fd = new FormData(form);
  return {
    rate: parseDecimal(fd.get("rate") ?? ""),
    unit: fd.get("unit") === "tag" ? "tag" : "stunde",
    workload: parseDecimal(fd.get("workload") ?? ""),
    hoursPerMonth: parseDecimal(fd.get("hoursPerMonth") ?? ""),
    expensesMonthly: parseDecimal(fd.get("expensesMonthly") ?? ""),
  };
}

const money = (v: number) => formatChf(v, { round: true });

/**
 * Only the invoice reading deducts the planned Vorsorge (Säule 3a or voluntary BVG); the payroll
 * readings deduct the employee's BVG share. The card says so, or the comparison looks unfair.
 */
function cardText(v: (typeof variants)[number], settings: EarningsSettings): string {
  if (v.billing !== "rechnung" || !(settings.pensionPercent > 0)) return v.description;
  return `${v.description} Abgezogen ist auch deine Vorsorge (${formatPercent(settings.pensionPercent)} des Gewinns, Annahme).`;
}

export function EarningsCalculator({ settings, initial, saved }: { settings: EarningsSettings; initial: CalculatorInitial; saved: boolean }) {
  const [inputs, setInputs] = useState<Inputs>({
    rate: initial.rate ?? Number.NaN,
    unit: initial.unit,
    workload: initial.workload,
    hoursPerMonth: initial.hoursPerMonth ?? Number.NaN,
    expensesMonthly: initial.expensesMonthly,
  });
  const [model, setModel] = useState({ billing: initial.billing, rateBasis: initial.rateBasis });

  const workloadValid = Number.isFinite(inputs.workload) && inputs.workload >= 1 && inputs.workload <= 100;
  const rateValid = Number.isFinite(inputs.rate) && inputs.rate > 0 && inputs.rate < 100_000;
  const hours = Number.isFinite(inputs.hoursPerMonth) && inputs.hoursPerMonth > 0 ? inputs.hoursPerMonth : null;
  const expenses = Number.isFinite(inputs.expensesMonthly) && inputs.expensesMonthly > 0 ? inputs.expensesMonthly : 0;
  const computedHours = workloadValid ? hoursPerYear(inputs.workload, settings) / 12 : null;

  const results = variants.map((v) => ({
    ...v,
    earnings:
      rateValid && workloadValid
        ? computeEarnings({ rate: inputs.rate, unit: inputs.unit, workload: inputs.workload, billing: v.billing, rateBasis: v.rateBasis, hoursPerMonth: hours, expensesMonthly: expenses }, settings)
        : null,
  }));
  const selected = results.find((r) => r.billing === model.billing && (r.billing === "rechnung" || r.rateBasis === model.rateBasis)) ?? results[0];
  const earnings = selected.earnings;

  const newAssignment = new URLSearchParams();
  if (rateValid) {
    newAssignment.set("satz", String(inputs.rate));
    newAssignment.set("einheit", inputs.unit);
  }
  if (workloadValid) newAssignment.set("pensum", String(Math.round(inputs.workload)));
  newAssignment.set("modell", selected.billing);
  if (selected.billing === "lohn") newAssignment.set("basis", selected.rateBasis);

  const onFormEvent = (e: React.FormEvent<HTMLFormElement>) => setInputs(readInputs(e.currentTarget));

  return (
    <div className="space-y-6">
      <PrintStyles />
      {saved ? null : (
        <Notice tone="blue" icon={Settings2} title="Du rechnest mit den Standardwerten" className="print:hidden">
          Ferien, Versicherungen, Vorsorge und Fixkosten sind geschätzt. Prüfe sie einmal unter{" "}
          <Link href="/admin/rechner?ansicht=annahmen" className="font-medium underline underline-offset-2">
            Annahmen
          </Link>{" "}
          und speichere sie. Dann rechnen auch Aufträge und Übersicht mit deinen Werten.
        </Notice>
      )}
      <Card className="print:hidden">
        <CardHeader title="Satz und Pensum" description="Die Rechnung läuft direkt mit. Gespeichert wird hier nichts." />
        <CardBody>
          <form onInput={onFormEvent} onChange={onFormEvent} onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_minmax(0,1fr)_minmax(0,1fr)]">
            <TextField name="rate" label="Satz" inputMode="decimal" suffix="CHF" defaultValue={initial.rate} placeholder="120" />
            <SelectField name="unit" label="Einheit" options={rateUnits} defaultValue={initial.unit} hint="1 Tag = 8.4 Stunden" />
            <TextField name="workload" label="Pensum" inputMode="numeric" suffix="%" defaultValue={initial.workload} />
            <TextField
              name="hoursPerMonth"
              label="Stunden pro Monat"
              inputMode="decimal"
              defaultValue={initial.hoursPerMonth}
              placeholder={computedHours !== null ? String(Math.round(computedHours * 10) / 10) : undefined}
              hint="Leer lassen, um sie aus dem Pensum zu rechnen."
            />
            <TextField name="expensesMonthly" label="Eigene Spesen pro Monat" inputMode="decimal" suffix="CHF" defaultValue={initial.expensesMonthly || ""} hint="Reise und anderes, das dir niemand vergütet." />
          </form>
          {!workloadValid ? <p className="mt-3 text-sm font-medium text-red-700">Das Pensum muss zwischen 1 und 100 % liegen.</p> : null}
        </CardBody>
      </Card>

      <p className="hidden text-sm print:block">
        Satz {rateValid ? formatRate(inputs.rate, inputs.unit) : "–"}, Pensum {workloadValid ? `${inputs.workload} %` : "–"}
        {hours ? `, ${formatHours(hours)} pro Monat` : ""}
        {expenses ? `, Spesen ${money(expenses)} pro Monat` : ""}.
      </p>

      <section aria-labelledby="modelle">
        <h2 id="modelle" className="mb-3 text-[0.9375rem] font-semibold text-ink">
          Derselbe Satz in drei Lesarten
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {results.map((r) => {
            const active = r === selected;
            return (
              <button
                key={`${r.billing}-${r.rateBasis}`}
                type="button"
                aria-pressed={active}
                onClick={() => setModel({ billing: r.billing, rateBasis: r.rateBasis })}
                className={cn(
                  "rounded-lg border bg-white p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:outline-none",
                  active ? "border-blue ring-1 ring-blue" : "border-line hover:border-slate/40 print:hidden",
                )}
              >
                <span className="block text-sm font-medium text-ink">{r.title}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-slate">{cardText(r, settings)}</span>
                <span className="mt-3 block text-xl font-semibold text-ink tabular-nums">{r.earnings ? money(r.earnings.net.month) : "–"}</span>
                <span className="block text-[0.8125rem] text-slate">{r.earnings ? `bleibt dir ${netTaxNote(r.earnings)} pro Monat, ${formatChf(r.earnings.net.hourly)} pro Stunde` : "Satz fehlt"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader
          title={`Was dir bleibt: ${selected.title}`}
          description={earnings ? hoursText(earnings, inputs.workload, settings) : undefined}
          actions={
            <span className="flex flex-wrap gap-2 print:hidden">
              <LinkButton href={`/admin/auftraege/neu?${newAssignment.toString()}`} icon={Plus} size="sm">
                Als Auftrag erfassen
              </LinkButton>
              <PrintButton />
            </span>
          }
        />
        {earnings ? (
          <>
            <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label={earnings.revenue.label} value={money(earnings.revenue.month)} hint={`${money(earnings.revenue.year)} pro Jahr`} />
              <StatTile
                label={`${netLabel(earnings)} pro Monat`}
                value={<span className={earnings.net.month < 0 ? "text-red-700" : "text-blue-700"}>{money(earnings.net.month)}</span>}
                hint={`${formatChf(earnings.net.hourly)} pro Stunde`}
              />
              <StatTile label={`${netLabel(earnings)} pro Jahr`} value={money(earnings.net.year)} hint="aufs Jahr hochgerechnet" />
              <StatTile label="Abzüge und Kosten" value={money(earnings.revenue.month - earnings.net.month)} hint="pro Monat" />
            </div>
            {earnings.notices.length ? (
              <div className="space-y-2 px-5 pt-4">
                {earnings.notices.map((n) => (
                  <Notice key={n} tone="amber">
                    {n}
                  </Notice>
                ))}
              </div>
            ) : null}
            <EarningsBreakdown earnings={earnings} />
          </>
        ) : (
          <CardBody>
            <p className="text-sm text-slate">Gib einen Satz und ein Pensum ein.</p>
          </CardBody>
        )}
      </Card>
    </div>
  );
}

function hoursText(e: Earnings, workload: number, s: EarningsSettings): string {
  if (e.hoursOverridden) return `${formatHours(e.hoursPerMonth)} pro Monat, von dir festgelegt.`;
  return `${formatHours(e.hoursPerMonth)} pro Monat: ${workload} % × 8.4 h × ${workingDaysPerYear(s)} Arbeitstage ÷ 12.`;
}
