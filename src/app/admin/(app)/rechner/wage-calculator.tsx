"use client";

import { useLayoutEffect, useState } from "react";
import { Building2, ExternalLink, RotateCcw, Save, Scale } from "lucide-react";
import { ActionButton, ActionForm, CheckboxField, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { Badge, buttonClass, Card, CardBody, CardHeader, Notice, StatTile, Table, Td, Th } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { formatChf, formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/admin/format";
import { rateUnits } from "@/lib/admin/options";
import {
  holidaySupplement,
  parseDecimal,
  RATE_SOURCES,
  RATES_AS_OF,
  rateFromWage,
  wageFromRate,
  type PayrollRates,
  type WagePlan,
} from "@/lib/admin/payroll";
import { cn } from "@/lib/utils";
import { PrintButton, PrintSheet, PrintStyles, PrintTable } from "./print";
import { OFFICIAL_DEFAULTS, readCalculatorForm, toFlat, type CalculatorDefaults } from "./schema";

/**
 * "Was die Firma der Fachperson als Lohn zahlen kann": from the invoice amount of the
 * specialist's GmbH/AG to gross and net salary, or the other way round. All rates are
 * editable; Ferhat can store his own defaults (settings "rechner_defaults").
 */

type Mode = "rechnung" | "lohn";

interface Scenario {
  mode: Mode;
  rate: number;
  unit: "stunde" | "tag";
  baseHourly: number;
}

const modes = [
  { value: "rechnung", label: "Vom Rechnungsbetrag zum Lohn" },
  { value: "lohn", label: "Vom Lohn zum Rechnungsbetrag" },
];

const holidayWeekOptions = [
  { value: "4", label: "4 Wochen (Minimum OR)" },
  { value: "5", label: "5 Wochen" },
  { value: "6", label: "6 Wochen" },
];

const LABELS: Partial<Record<keyof PayrollRates, string>> = {
  holidayPercent: "Ferienentschädigung",
  publicHolidayPercent: "Feiertagsentschädigung",
  thirteenthPercent: "13. Monatslohn",
  ahvIvEo: "AHV/IV/EO je Seite",
  alv: "ALV je Seite",
  alvMaxSalary: "ALV-Höchstlohn pro Jahr",
  fak: "FAK (nur Firma)",
  famel: "FamEL Kanton SO (nur Firma)",
  akAdminPercent: "Verwaltungskosten AK",
  uvgBu: "UVG Berufsunfall (Firma)",
  uvgNbu: "UVG Nichtberufsunfall (Fachperson)",
  uvgMaxSalary: "UVG-Höchstlohn pro Jahr",
  ktgEmployer: "Krankentaggeld Firma",
  ktgEmployee: "Krankentaggeld Fachperson",
  bvgEntryThreshold: "Eintrittsschwelle",
  bvgCoordinationDeduction: "Koordinationsabzug",
  bvgUpperLimit: "Oberer Grenzbetrag",
  bvgMinCoordinated: "Min. koordinierter Lohn",
  bvgCredit25: "Altersgutschrift 25–34",
  bvgCredit35: "Altersgutschrift 35–44",
  bvgCredit45: "Altersgutschrift 45–54",
  bvgCredit55: "Altersgutschrift 55–65",
  bvgRiskPercent: "Risiko und Verwaltung",
  bvgEmployerShare: "Anteil Firma",
  gavEmployer: "Beitrag Firma",
  gavEmployee: "Beitrag Fachperson",
};

function Sources({ keys }: { keys: (keyof PayrollRates)[] }) {
  const list = RATE_SOURCES.filter((s) => s.keys.some((k) => keys.includes(k)));
  return (
    <div className="mt-3 space-y-1.5 rounded-md bg-mist/70 px-3 py-2 text-xs text-slate">
      <p className="font-medium text-ink">Stand {formatDate(RATES_AS_OF)}, jährlich prüfen</p>
      {list.map((s) => (
        <p key={s.label}>
          {s.kind === "annahme" ? <Badge tone="amber" className="mr-1">Annahme</Badge> : null}
          {s.label}. Quelle:{" "}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
              {s.source}
              <ExternalLink aria-hidden className="ml-0.5 inline size-3" />
            </a>
          ) : (
            s.source
          )}
        </p>
      ))}
    </div>
  );
}

function Section({ title, description, keys, children, open }: { title: string; description?: string; keys: (keyof PayrollRates)[]; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-lg border border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-slate transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-line px-4 py-4">
        {description ? <p className="mb-3 text-[0.8125rem] text-slate">{description}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        <Sources keys={keys} />
      </div>
    </details>
  );
}

interface WageCalculatorProps {
  saved: (CalculatorDefaults & { savedAt: string | null }) | null;
  initialRate: { rate: number; unit: "stunde" | "tag" } | null;
  saveAction: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  clearAction: () => Promise<ActionState>;
}

/** Starts fresh each time its (hidden, kept mounted) page is shown again, like ActionForm. */
/** Amount per month with the hourly amount below; four columns fit the narrow result column. */
function AmountCell({ hourly, hours }: { hourly: number; hours: number }) {
  return (
    <Td align="right" className={cn("whitespace-nowrap", !hourly && "text-slate")}>
      {formatChf(hourly * hours, { round: true })}
      <span className="block text-xs font-normal text-slate">{formatChf(hourly)} / h</span>
    </Td>
  );
}

export function WageCalculator(props: WageCalculatorProps) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return <WageCalculatorInner key={generation} {...props} />;
}

function WageCalculatorInner({ saved, initialRate, saveAction, clearAction }: WageCalculatorProps) {
  const [defaults, setDefaults] = useState<CalculatorDefaults>(saved ?? OFFICIAL_DEFAULTS);
  const [values, setValues] = useState<CalculatorDefaults>(saved ?? OFFICIAL_DEFAULTS);
  const [invalid, setInvalid] = useState<string[]>([]);
  const initialScenario: Scenario = { mode: "rechnung", rate: initialRate?.rate ?? 100, unit: initialRate?.unit ?? "stunde", baseHourly: 60 };
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [generation, setGeneration] = useState(0);

  const flat = toFlat(defaults);
  const { rates, wage } = values;

  const plan: WagePlan | null =
    scenario.mode === "rechnung"
      ? Number.isFinite(scenario.rate)
        ? wageFromRate({ rate: scenario.rate, unit: scenario.unit, retainedPercent: wage.retainedPercent, hoursPerMonth: wage.hoursPerMonth, age: wage.age }, rates)
        : null
      : Number.isFinite(scenario.baseHourly)
        ? rateFromWage({ baseHourly: scenario.baseHourly, retainedPercent: wage.retainedPercent, hoursPerMonth: wage.hoursPerMonth, age: wage.age }, rates)
        : null;
  const pr = plan?.payroll;
  const hours = wage.hoursPerMonth;

  const reload = (next: CalculatorDefaults) => {
    setDefaults(next);
    setValues(next);
    setInvalid([]);
    setScenario(initialScenario);
    setGeneration((g) => g + 1);
  };

  const onFormEvent = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const form = target.form;
    if (!form) return;
    if (target.name === "holidayWeeks") {
      // Choosing the weeks sets the matching supplement; it stays editable.
      const percent = form.elements.namedItem("holidayPercent");
      if (percent instanceof HTMLInputElement) percent.value = String(holidaySupplement(Number(target.value)));
    }
    const read = readCalculatorForm(form);
    setValues(read.values);
    setInvalid(read.invalid);
    const fd = new FormData(form);
    setScenario({
      mode: fd.get("mode") === "lohn" ? "lohn" : "rechnung",
      rate: parseDecimal(fd.get("rate") ?? String(scenario.rate)),
      unit: fd.get("unit") === "tag" ? "tag" : "stunde",
      baseHourly: parseDecimal(fd.get("baseHourly") ?? String(scenario.baseHourly)),
    });
  };

  const rateField = (name: keyof PayrollRates, suffix = "%", hint?: string) => (
    <TextField key={name} name={name} label={LABELS[name] ?? name} defaultValue={String(flat[name])} inputMode="decimal" suffix={suffix} hint={hint} />
  );

  const waterfall = pr && plan
    ? [
        { label: "Rechnungsbetrag an KOVALI", hourly: plan.rateHourly, strong: true },
        { label: `Anteil, der in der Firma bleibt (${formatPercent(Math.round(plan.retainedPercent * 100) / 100)})`, hourly: -plan.retainedHourly },
        { label: "Beiträge der Firma als Arbeitgeberin", hourly: -pr.employerContributions },
        { label: "Bruttolohn inkl. Zuschläge", hourly: pr.grossHourly, strong: true },
        { label: "Abzüge der Fachperson", hourly: -pr.employeeDeductions },
        { label: "Nettolohn ca. (vor Steuern)", hourly: pr.netHourly, strong: true },
      ]
    : [];
  const buildUp = pr
    ? [
        { label: "Grundlohn", percent: null as number | null, hourly: pr.base },
        { label: "Feiertagsentschädigung", percent: rates.publicHolidayPercent, hourly: pr.publicHoliday },
        { label: "Ferienentschädigung", percent: rates.holidayPercent, hourly: pr.holiday },
        ...(rates.thirteenthEnabled ? [{ label: "13. Monatslohn", percent: rates.thirteenthPercent, hourly: pr.thirteenth }] : []),
      ]
    : [];

  return (
    <>
      <PrintStyles />
      <div className="space-y-6 print:hidden">
        <div className="grid gap-4 lg:grid-cols-2">
          <Notice tone="blue" icon={Building2} title="Lohn in der Firma der Fachperson">
            Die Fachperson ist bei ihrer eigenen GmbH oder AG angestellt. Der Rechner zeigt, was diese Firma ihr aus dem Rechnungsbetrag an KOVALI als Lohn zahlen
            kann: zuerst die Beiträge der Firma als Arbeitgeberin, dann die Abzüge der Fachperson. Planungswerte, keine Lohnabrechnung.
          </Notice>
          <Notice tone="amber" icon={Scale} title="Eigene Angestellte von KOVALI">
            Nur zur Planung. Wer Personen anstellt und bei Kunden einsetzt, betreibt Personalverleih und braucht eine Bewilligung nach AVG (Kaution, GAV
            Personalverleih). KOVALI hat diese Bewilligung derzeit nicht.
          </Notice>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          <div className="self-start" onInput={onFormEvent} onChange={onFormEvent}>
            <Card>
              <CardHeader
                title="Eingaben"
                description={saved?.savedAt ? `Deine Standardwerte vom ${formatDateTime(saved.savedAt)} sind geladen.` : "Amtliche Standardwerte 2026."}
              />
              <CardBody>
                <ActionForm key={generation} action={saveAction} hideSubmit className="space-y-5">
                  <SelectField name="mode" label="Berechnung" options={modes} defaultValue={scenario.mode} />
                  {scenario.mode === "rechnung" ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_10rem] items-end gap-3">
                      <TextField name="rate" label="Rechnungsbetrag der Firma" defaultValue={String(scenario.rate)} inputMode="decimal" suffix="CHF" hint="Was KOVALI dem Subunternehmen zahlt." />
                      <SelectField name="unit" label="Einheit" options={rateUnits} defaultValue={scenario.unit} />
                    </div>
                  ) : (
                    <TextField name="baseHourly" label="Grundlohn pro Stunde" defaultValue={String(scenario.baseHourly)} inputMode="decimal" suffix="CHF" hint="Ohne Ferien, Feiertage und 13. Monatslohn." />
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <TextField
                      name="retainedPercent"
                      label="Anteil Firma"
                      defaultValue={String(flat.retainedPercent)}
                      inputMode="decimal"
                      suffix="%"
                      hint="Reserve, Buchhaltung, Gewinn"
                      className="col-span-2 sm:col-span-1"
                    />
                    <TextField name="hoursPerMonth" label="Std. pro Monat" defaultValue={String(flat.hoursPerMonth)} inputMode="decimal" hint="Voll: 176.4" />
                    <TextField name="age" label="Alter" defaultValue={String(flat.age)} inputMode="numeric" hint="Für das BVG" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink">Sätze und Annahmen</h3>
                    <Section title="Lohnzuschläge" keys={["holidayWeeks", "holidayPercent", "publicHolidayPercent", "thirteenthPercent"]}>
                      <SelectField name="holidayWeeks" label="Ferien" options={holidayWeekOptions} defaultValue={String(flat.holidayWeeks)} />
                      {rateField("holidayPercent", "%", "Auf Grundlohn und Feiertage")}
                      {rateField("publicHolidayPercent", "%", "z. B. 9 Tage = 3.59 %")}
                      {rateField("thirteenthPercent", "%", "1/12 von Lohn und Zuschlägen")}
                      <CheckboxField name="thirteenthEnabled" label="13. Monatslohn" defaultChecked={Boolean(flat.thirteenthEnabled)} className="sm:col-span-2" />
                    </Section>
                    <Section title="Sozialversicherungen" keys={["ahvIvEo", "alv", "alvMaxSalary", "fak", "famel", "akAdminPercent"]} description="FAK und FamEL je nach Kanton der Firma; voreingestellt ist Solothurn.">
                      {rateField("ahvIvEo")}
                      {rateField("alv")}
                      {rateField("alvMaxSalary", "CHF")}
                      {rateField("fak")}
                      {rateField("famel")}
                      {rateField("akAdminPercent", "%", "in % der AHV/IV/EO-Beiträge")}
                    </Section>
                    <Section
                      title="Pensionskasse (BVG)"
                      keys={["bvgEntryThreshold", "bvgCoordinationDeduction", "bvgUpperLimit", "bvgMinCoordinated", "bvgCredit25", "bvgRiskPercent", "bvgEmployerShare"]}
                      description="Obligatorium (Minimalplan). Viele Pensionskassen versichern mehr."
                    >
                      {rateField("bvgEntryThreshold", "CHF")}
                      {rateField("bvgCoordinationDeduction", "CHF")}
                      {rateField("bvgUpperLimit", "CHF")}
                      {rateField("bvgMinCoordinated", "CHF")}
                      {rateField("bvgCredit25")}
                      {rateField("bvgCredit35")}
                      {rateField("bvgCredit45")}
                      {rateField("bvgCredit55")}
                      {rateField("bvgRiskPercent", "%", "des koordinierten Lohns")}
                      {rateField("bvgEmployerShare", "%", "mindestens 50 %")}
                    </Section>
                    <Section title="Unfall und Krankentaggeld" keys={["uvgBu", "uvgNbu", "uvgMaxSalary", "ktgEmployer", "ktgEmployee"]} description="Prämien hängen von der Police ab; hier Richtwerte.">
                      {rateField("uvgBu")}
                      {rateField("uvgNbu")}
                      {rateField("uvgMaxSalary", "CHF")}
                      {rateField("ktgEmployer")}
                      {rateField("ktgEmployee")}
                    </Section>
                    <Section
                      title="GAV Personalverleih"
                      keys={["gavEmployer", "gavEmployee"]}
                      description="Nur für Betriebe mit Verleihbewilligung, z. B. für eigene Angestellte von KOVALI nach einer Bewilligung."
                    >
                      <CheckboxField name="gavEnabled" label="Beiträge GAV Personalverleih einrechnen" defaultChecked={Boolean(flat.gavEnabled)} className="sm:col-span-2" />
                      {rateField("gavEmployer")}
                      {rateField("gavEmployee")}
                    </Section>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
                    <SubmitButton>
                      <Save aria-hidden className="size-4" />
                      Als meine Standardwerte speichern
                    </SubmitButton>
                    <button type="button" className={buttonClass("ghost")} onClick={() => reload(OFFICIAL_DEFAULTS)}>
                      <RotateCcw aria-hidden className="size-4" />
                      Amtliche Werte
                    </button>
                    {saved ? (
                      <button type="button" className={buttonClass("ghost")} onClick={() => reload(saved)}>
                        Meine Werte
                      </button>
                    ) : null}
                  </div>
                </ActionForm>
                {saved ? (
                  <div className="mt-3">
                    <ActionButton action={clearAction} confirm="Deine gespeicherten Standardwerte löschen?" variant="ghost" className="text-red-700 hover:bg-red-50">
                      Gespeicherte Standardwerte löschen
                    </ActionButton>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <div className="min-w-0 space-y-6" aria-live="polite">
            {invalid.length ? (
              <Notice tone="amber" title="Ungültige Eingaben">
                Für {invalid.map((n) => LABELS[n as keyof PayrollRates] ?? n).join(", ")} wird der amtliche Wert verwendet, bis eine gültige Zahl eingetragen ist.
              </Notice>
            ) : null}
            {plan && pr ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {scenario.mode === "lohn" ? (
                    <StatTile label="Nötiger Rechnungsbetrag" value={formatChf(plan.rateHourly)} hint={`pro Stunde, ${formatChf(plan.rateDaily)} pro Tag`} />
                  ) : (
                    <StatTile label="Bruttolohn pro Stunde" value={formatChf(pr.grossHourly)} hint={`Grundlohn ${formatChf(pr.base)} plus Zuschläge`} />
                  )}
                  <StatTile label="Bruttolohn pro Monat" value={formatChf(pr.grossMonthly, { round: true })} hint={`${formatNumber(hours, 1)} Stunden, ${formatChf(pr.grossAnnual, { round: true })} pro Jahr`} />
                  <StatTile label="Nettolohn ca. pro Monat" value={formatChf(pr.netMonthly, { round: true })} hint="Vor Quellen- bzw. Einkommenssteuer" />
                  <StatTile label="Kosten der Firma pro Stunde" value={formatChf(pr.employerCostHourly)} hint={`Lohn plus ${formatChf(pr.employerContributions)} Beiträge`} />
                </div>
                {plan.retainedHourly < -0.005 ? (
                  <Notice tone="red" title="Der Rechnungsbetrag reicht nicht">
                    Die Firma müsste {formatChf(-plan.retainedMonthly, { round: true })} pro Monat zuschiessen.
                  </Notice>
                ) : null}

                <Card>
                  <CardHeader title="Vom Rechnungsbetrag zum Nettolohn" />
                  <Table>
                    <thead>
                      <tr>
                        <Th>Position</Th>
                        <Th align="right">Stunde</Th>
                        <Th align="right">Monat</Th>
                        <Th align="right">Jahr</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterfall.map((r) => (
                        <tr key={r.label} className={r.strong ? "bg-mist/60 font-semibold" : undefined}>
                          <Td className="min-w-52">{r.label}</Td>
                          <Td align="right" className="whitespace-nowrap">{formatChf(r.hourly)}</Td>
                          <Td align="right" className="whitespace-nowrap">{formatChf(r.hourly * hours, { round: true })}</Td>
                          <Td align="right" className="whitespace-nowrap">{formatChf(r.hourly * hours * 12, { round: true })}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>

                <Card>
                  <CardHeader title="Lohnaufbau" description="Zuschläge bauen aufeinander auf: Ferien auf Grundlohn und Feiertagen, 13. Monatslohn auf allem." />
                  <Table>
                    <thead>
                      <tr>
                        <Th>Bestandteil</Th>
                        <Th align="right">Satz</Th>
                        <Th align="right">Stunde</Th>
                        <Th align="right">Monat</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildUp.map((r) => (
                        <tr key={r.label}>
                          <Td>{r.label}</Td>
                          <Td align="right" className="whitespace-nowrap">{r.percent !== null ? formatPercent(r.percent) : ""}</Td>
                          <Td align="right" className="whitespace-nowrap">{formatChf(r.hourly)}</Td>
                          <Td align="right" className="whitespace-nowrap">{formatChf(r.hourly * hours, { round: true })}</Td>
                        </tr>
                      ))}
                      <tr className="bg-mist/60 font-semibold">
                        <Td>Bruttolohn</Td>
                        <Td />
                        <Td align="right" className="whitespace-nowrap">{formatChf(pr.grossHourly)}</Td>
                        <Td align="right" className="whitespace-nowrap">{formatChf(pr.grossMonthly, { round: true })}</Td>
                      </tr>
                    </tbody>
                  </Table>
                </Card>

                <Card>
                  <CardHeader
                    title="Beiträge und Abzüge"
                    description={
                      pr.bvg.applies
                        ? `Pro Monat, darunter pro Stunde. BVG: koordinierter Lohn ${formatChf(pr.bvg.coordinatedSalary, { round: true })}, Altersgutschrift ${formatPercent(pr.bvg.savingsPercent)} plus ${formatPercent(rates.bvgRiskPercent)} Risiko.`
                        : "Pro Monat, darunter pro Stunde. BVG: kein Obligatorium (Lohn unter der Eintrittsschwelle oder Alter ausserhalb 18–65)."
                    }
                  />
                  <Table>
                    <thead>
                      <tr>
                        <Th>Versicherung</Th>
                        <Th align="right">Satz</Th>
                        <Th align="right">Firma</Th>
                        <Th align="right">Fachperson</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {pr.lines.map((l) => (
                        <tr key={l.key}>
                          <Td className="min-w-44">
                            {l.label}
                            {l.note ? <span className="block text-xs text-slate">{l.note}</span> : null}
                          </Td>
                          <Td align="right" className="whitespace-nowrap">
                            {l.key === "ktg"
                              ? `${formatPercent(rates.ktgEmployer)} / ${formatPercent(rates.ktgEmployee)}`
                              : l.key === "gav"
                                ? `${formatPercent(rates.gavEmployer)} / ${formatPercent(rates.gavEmployee)}`
                                : l.percent !== null
                                  ? formatPercent(l.percent)
                                  : ""}
                          </Td>
                          <AmountCell hourly={l.employer} hours={hours} />
                          <AmountCell hourly={l.employee} hours={hours} />
                        </tr>
                      ))}
                      <tr className="bg-mist/60 font-semibold">
                        <Td>Total</Td>
                        <Td />
                        <AmountCell hourly={pr.employerContributions} hours={hours} />
                        <AmountCell hourly={pr.employeeDeductions} hours={hours} />
                      </tr>
                    </tbody>
                  </Table>
                  <CardBody className="border-t border-line text-xs text-slate">
                    Nettolohn ohne Quellensteuer bzw. Einkommenssteuer, Kinderzulagen, Spesen und Einkäufe in die Pensionskasse. ALV und UVG nur bis{" "}
                    {formatChf(rates.alvMaxSalary, { round: true })} Jahreslohn. Massgebend sind die Abrechnungen der Ausgleichskasse, Pensionskasse und Versicherungen.
                  </CardBody>
                </Card>
                <PrintButton />
              </>
            ) : (
              <Notice tone="amber" title="Eingaben unvollständig">
                Bitte einen Betrag als Zahl und einen Anteil der Firma unter 100 % eingeben.
              </Notice>
            )}
          </div>
        </div>
      </div>

      {plan && pr ? (
        <PrintSheet
          title="Lohn in der Firma der Fachperson"
          subtitle={`${scenario.mode === "rechnung" ? "Vom Rechnungsbetrag zum Lohn" : "Vom Lohn zum Rechnungsbetrag"}, ${formatNumber(hours, 1)} Stunden pro Monat, Alter ${wage.age}`}
        >
          <PrintTable
            caption="Vom Rechnungsbetrag zum Nettolohn"
            columns={["Position", "Stunde", "Monat", "Jahr"]}
            rows={waterfall.map((r) => [r.label, formatChf(r.hourly), formatChf(r.hourly * hours, { round: true }), formatChf(r.hourly * hours * 12, { round: true })])}
          />
          <PrintTable
            caption="Lohnaufbau"
            columns={["Bestandteil", "Satz", "Stunde", "Monat"]}
            rows={[
              ...buildUp.map((r) => [r.label, r.percent !== null ? formatPercent(r.percent) : "", formatChf(r.hourly), formatChf(r.hourly * hours, { round: true })]),
              ["Bruttolohn", "", formatChf(pr.grossHourly), formatChf(pr.grossMonthly, { round: true })],
            ]}
          />
          <PrintTable
            caption="Beiträge und Abzüge"
            columns={["Versicherung", "Firma / Monat", "Fachperson / Monat"]}
            rows={[
              ...pr.lines.map((l) => [l.label, formatChf(l.employer * hours, { round: true }), formatChf(l.employee * hours, { round: true })]),
              ["Total", formatChf(pr.employerContributions * hours, { round: true }), formatChf(pr.employeeDeductions * hours, { round: true })],
            ]}
          />
          <p className="text-xs">
            Sätze Stand {formatDate(RATES_AS_OF)} (AHV/IV/EO {formatPercent(rates.ahvIvEo)}, ALV {formatPercent(rates.alv)}, FAK {formatPercent(rates.fak)}, FamEL{" "}
            {formatPercent(rates.famel)}, UVG {formatPercent(rates.uvgBu)} / {formatPercent(rates.uvgNbu)}, KTG {formatPercent(rates.ktgEmployer)} /{" "}
            {formatPercent(rates.ktgEmployee)}, BVG Minimalplan). Planungsrechnung ohne Gewähr; Nettolohn vor Steuern.
          </p>
        </PrintSheet>
      ) : null}
    </>
  );
}
