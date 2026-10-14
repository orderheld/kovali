"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Receipt, RotateCcw } from "lucide-react";
import { CheckboxField, SelectField, TextField } from "@/components/admin/form";
import { buttonClass, Card, CardBody, CardHeader, Notice, StatTile, Table, Td, Th } from "@/components/admin/ui";
import { formatChf, formatNumber, formatPercent } from "@/lib/admin/format";
import { rateUnits } from "@/lib/admin/options";
import { b2bMargin, buyRateForTargetMargin, parseDecimal, VAT_RATE_PERCENT, VAT_SOURCE, VAT_THRESHOLD } from "@/lib/admin/payroll";
import { HOURS_PER_DAY, toDaily, toHourly } from "@/lib/admin/rates";
import { cn } from "@/lib/utils";
import { PrintButton, PrintSheet, PrintStyles, PrintTable } from "./print";

/**
 * Margin of a subcontractor deal: the client (Auftraggeber) pays a rate, KOVALI pays the
 * specialist's firm a rate; the difference per hour, day, month and year. Recomputed on every
 * keystroke from the form, nothing is sent to the server.
 */

interface Values {
  sell: number;
  sellUnit: "stunde" | "tag";
  buy: number;
  buyUnit: "stunde" | "tag";
  workload: number;
  target: number;
  kovaliVat: boolean;
  subVat: boolean;
}

const unitOf = (v: FormDataEntryValue | null): "stunde" | "tag" => (v === "tag" ? "tag" : "stunde");
const per = (unit: "stunde" | "tag") => (unit === "tag" ? "pro Tag" : "pro Stunde");

function read(form: HTMLFormElement): Values {
  const fd = new FormData(form);
  return {
    sell: parseDecimal(fd.get("sell")),
    sellUnit: unitOf(fd.get("sellUnit")),
    buy: parseDecimal(fd.get("buy")),
    buyUnit: unitOf(fd.get("buyUnit")),
    workload: parseDecimal(fd.get("workload")),
    target: parseDecimal(fd.get("target")),
    kovaliVat: fd.get("kovaliVat") === "on",
    subVat: fd.get("subVat") === "on",
  };
}

/**
 * Next.js keeps recently visited pages mounted but hidden; like ActionForm, the calculator
 * starts fresh each time its page is shown again.
 */
export function B2bCalculator(props: { kovaliVatRegistered: boolean }) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return <B2bCalculatorInner key={generation} {...props} />;
}

function B2bCalculatorInner({ kovaliVatRegistered }: { kovaliVatRegistered: boolean }) {
  const initial: Values = {
    sell: 120,
    sellUnit: "stunde",
    buy: 100,
    buyUnit: "stunde",
    workload: 100,
    target: 15,
    kovaliVat: kovaliVatRegistered,
    subVat: true,
  };
  const [values, setValues] = useState<Values>(initial);
  const [generation, setGeneration] = useState(0);

  const workloadValid = values.workload >= 10 && values.workload <= 100;
  const vat = { kovaliRegistered: values.kovaliVat, subcontractorCharges: values.subVat, ratePercent: VAT_RATE_PERCENT };
  const result =
    Number.isFinite(values.sell) && Number.isFinite(values.buy) && workloadValid
      ? b2bMargin({ sell: values.sell, sellUnit: values.sellUnit, buy: values.buy, buyUnit: values.buyUnit, workloadPercent: values.workload, vat })
      : null;
  const unrecoverableVat = values.subVat && !values.kovaliVat ? VAT_RATE_PERCENT : 0;
  const maxBuy = Number.isFinite(values.target) ? buyRateForTargetMargin(values.sell, values.target, unrecoverableVat) : null;
  const maxBuyHourly = maxBuy !== null ? toHourly(maxBuy, values.sellUnit) : null;
  const negative = result ? result.perHour < 0 : false;
  const overThreshold = result ? result.revenuePerYear >= VAT_THRESHOLD : false;
  const buyInputHourly = toHourly(values.buy, values.buyUnit);

  const rows = result
    ? [
        { label: "Auftraggeber zahlt", hourly: result.sellHourly },
        { label: "KOVALI zahlt dem Subunternehmen", hourly: -result.buyHourly },
        ...(result.vatCostHourly ? [{ label: `MWST des Subunternehmens (${formatPercent(VAT_RATE_PERCENT)}, nicht abziehbar)`, hourly: -result.vatCostHourly }] : []),
        { label: "Marge KOVALI", hourly: result.perHour, total: true },
      ]
    : [];
  const amounts = (hourly: number) => [hourly, hourly * HOURS_PER_DAY, hourly * (result?.hoursPerMonth ?? 0), hourly * (result?.hoursPerMonth ?? 0) * 12];

  return (
    <>
      <PrintStyles />
      <div className="grid gap-6 print:hidden xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Eingaben" description="Alle Sätze ohne MWST." />
          <CardBody>
            <form
              key={generation}
              noValidate
              onSubmit={(e) => e.preventDefault()}
              onInput={(e) => setValues(read(e.currentTarget))}
              onChange={(e) => setValues(read(e.currentTarget))}
              className="space-y-5"
            >
              <fieldset className="grid grid-cols-[minmax(0,1fr)_10rem] items-end gap-3">
                <legend className="sr-only">Satz des Auftraggebers</legend>
                <TextField name="sell" label="Auftraggeber zahlt" defaultValue={initial.sell} inputMode="decimal" suffix="CHF" />
                <SelectField name="sellUnit" label="Einheit" options={rateUnits} defaultValue={initial.sellUnit} />
              </fieldset>
              <fieldset className="grid grid-cols-[minmax(0,1fr)_10rem] items-end gap-3">
                <legend className="sr-only">Satz des Subunternehmens</legend>
                <TextField name="buy" label="KOVALI zahlt Subunternehmen" defaultValue={initial.buy} inputMode="decimal" suffix="CHF" />
                <SelectField name="buyUnit" label="Einheit" options={rateUnits} defaultValue={initial.buyUnit} />
              </fieldset>
              <TextField
                name="workload"
                label="Pensum"
                defaultValue={initial.workload}
                inputMode="decimal"
                suffix="%"
                hint={
                  workloadValid && result
                    ? `${formatNumber(result.hoursPerMonth, 1)} Stunden pro Monat (8.4 h × 21 Tage × Pensum)`
                    : "Bitte 10 bis 100 % eingeben."
                }
              />
              <TextField name="target" label="Zielmarge" defaultValue={initial.target} inputMode="decimal" suffix="%" hint="Für den höchsten Einkaufssatz, siehe rechts." />
              <div className="space-y-3 border-t border-line pt-4">
                <CheckboxField
                  name="kovaliVat"
                  label="KOVALI ist MWST-pflichtig"
                  defaultChecked={initial.kovaliVat}
                  hint={`Pflicht ab CHF 100’000 Umsatz pro Jahr. Dann rechnet KOVALI ${formatPercent(VAT_RATE_PERCENT)} MWST ab und kann die MWST des Subunternehmens abziehen.`}
                />
                <CheckboxField name="subVat" label="Subunternehmen rechnet MWST ab" defaultChecked={initial.subVat} hint="Üblich bei einer GmbH oder AG mit mehr als CHF 100’000 Umsatz." />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => {
                    setGeneration((g) => g + 1);
                    setValues(initial);
                  }}
                >
                  <RotateCcw aria-hidden className="size-4" />
                  Zurücksetzen
                </button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-6" aria-live="polite">
          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <StatTile
                  label="Marge pro Stunde"
                  value={<span className={cn(negative && "text-red-700")}>{formatChf(result.perHour)}</span>}
                  hint={`${formatPercent(Math.round(result.percent * 100) / 100)} vom Verkaufssatz${result.markupPercent !== null ? `, Aufschlag ${formatPercent(Math.round(result.markupPercent * 100) / 100)}` : ""}`}
                  tone={negative ? "red" : "neutral"}
                />
                <StatTile label="Marge pro Tag" value={<span className={cn(negative && "text-red-700")}>{formatChf(result.perDay)}</span>} hint="8.4 Stunden" />
                <StatTile
                  label="Marge pro Monat"
                  value={<span className={cn(negative && "text-red-700")}>{formatChf(result.perMonth, { round: true })}</span>}
                  hint={`${formatNumber(result.hoursPerMonth, 1)} Stunden bei ${formatPercent(values.workload)}`}
                />
                <StatTile label="Marge pro Jahr" value={<span className={cn(negative && "text-red-700")}>{formatChf(result.perYear, { round: true })}</span>} hint="12 Monate" />
              </div>

              {negative ? (
                <Notice tone="red" title="Negative Marge">
                  KOVALI zahlt dem Subunternehmen mehr, als der Auftraggeber bezahlt.
                </Notice>
              ) : null}

              <Card>
                <CardHeader title="Übersicht" description="Umsatz, Einkauf und Marge im gewählten Pensum." />
                <Table>
                  <thead>
                    <tr>
                      <Th>Position</Th>
                      <Th align="right">Stunde</Th>
                      <Th align="right">Tag</Th>
                      <Th align="right">Monat</Th>
                      <Th align="right">Jahr</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className={r.total ? "bg-mist/60 font-semibold" : undefined}>
                        <Td className="min-w-48">{r.label}</Td>
                        {amounts(r.hourly).map((a, i) => (
                          <Td key={i} align="right" className={cn("whitespace-nowrap", a < 0 && !r.total ? "text-slate" : undefined, r.total && a < 0 ? "text-red-700" : undefined)}>
                            {formatChf(a, { round: i >= 2 })}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {values.kovaliVat ? (
                  <CardBody className="border-t border-line text-sm text-slate">
                    Rechnung an den Auftraggeber inkl. {formatPercent(VAT_RATE_PERCENT)} MWST: {formatChf(result.invoiceHourlyGross)} pro Stunde,{" "}
                    {formatChf(result.invoiceHourlyGross * result.hoursPerMonth, { round: true })} pro Monat. Die MWST ist ein Durchlaufposten und ändert die Marge
                    nicht.
                  </CardBody>
                ) : null}
              </Card>

              <Card>
                <CardHeader title="Einkaufssatz für die Zielmarge" />
                <CardBody className="space-y-3 text-sm">
                  {maxBuy !== null && maxBuyHourly !== null ? (
                    <>
                      <p className="text-ink">
                        Für {formatPercent(values.target)} Marge darfst du dem Subunternehmen höchstens{" "}
                        <strong className="font-semibold">{formatChf(maxBuyHourly)} pro Stunde</strong> ({formatChf(toDaily(maxBuyHourly, "stunde"))} pro Tag) zahlen
                        {unrecoverableVat ? `, zuzüglich seiner ${formatPercent(VAT_RATE_PERCENT)} MWST` : ""}.
                      </p>
                      {buyInputHourly !== null ? (
                        <p className={cn("font-medium", buyInputHourly <= maxBuyHourly + 0.005 ? "text-emerald-700" : "text-amber-800")}>
                          {buyInputHourly <= maxBuyHourly + 0.005
                            ? `Der eingegebene Satz liegt ${formatChf(maxBuyHourly - buyInputHourly)} pro Stunde darunter.`
                            : `Der eingegebene Satz liegt ${formatChf(buyInputHourly - maxBuyHourly)} pro Stunde darüber.`}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-slate">Bitte eine Zielmarge unter 100 % eingeben.</p>
                  )}
                </CardBody>
              </Card>

              {!values.kovaliVat && (overThreshold || values.subVat) ? (
                <Notice tone="amber" icon={Receipt} title="MWST beachten">
                  {values.subVat ? (
                    <>
                      Solange KOVALI nicht MWST-pflichtig ist, kann sie die MWST des Subunternehmens nicht abziehen: Sie kostet hier{" "}
                      {formatChf(result.vatCostHourly)} pro Stunde ({formatChf(result.vatCostHourly * result.hoursPerMonth, { round: true })} pro Monat).{" "}
                    </>
                  ) : null}
                  {overThreshold
                    ? `Mit diesem Mandat liegt der Umsatz bei ${formatChf(result.revenuePerYear, { round: true })} pro Jahr und damit über CHF 100’000: KOVALI muss sich bei der ESTV für die MWST anmelden.`
                    : null}
                </Notice>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <PrintButton />
                {/* Wraps on phones; the button style alone keeps the text on one line. */}
                {buyInputHourly ? (
                  <Link
                    href={`/admin/rechner?modus=lohn&satz=${encodeURIComponent(String(values.buy))}&einheit=${values.buyUnit}`}
                    className={buttonClass("ghost", "md", "h-auto min-h-10 py-2 text-left whitespace-normal")}
                  >
                    Lohn der Fachperson aus diesem Satz berechnen
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                ) : null}
              </div>
              <p className="text-xs text-slate">
                {VAT_SOURCE.label}. Quelle: {VAT_SOURCE.source}. Stand 13.10.2026, jährlich prüfen.
              </p>
            </>
          ) : (
            <Notice tone="amber" title="Eingaben unvollständig">
              Bitte beide Sätze als Zahl und ein Pensum zwischen 10 und 100 % eingeben.
            </Notice>
          )}
        </div>
      </div>

      {result ? (
        <PrintSheet title="Marge Subunternehmen" subtitle={`Pensum ${formatPercent(values.workload)}, ${formatNumber(result.hoursPerMonth, 1)} Stunden pro Monat`}>
          <PrintTable
            caption="Eingaben"
            rows={[
              ["Auftraggeber zahlt", `${formatChf(values.sell)} ${per(values.sellUnit)}`],
              ["KOVALI zahlt Subunternehmen", `${formatChf(values.buy)} ${per(values.buyUnit)}`],
              ["KOVALI MWST-pflichtig", values.kovaliVat ? "ja" : "nein"],
              ["Subunternehmen rechnet MWST ab", values.subVat ? "ja" : "nein"],
              ["Zielmarge", formatPercent(values.target)],
            ]}
          />
          <PrintTable
            caption="Ergebnis"
            columns={["Position", "Stunde", "Tag", "Monat", "Jahr"]}
            rows={rows.map((r) => [r.label, ...amounts(r.hourly).map((a, i) => formatChf(a, { round: i >= 2 }))])}
          />
          <PrintTable
            caption="Kennzahlen"
            rows={[
              ["Marge in % vom Verkaufssatz", formatPercent(Math.round(result.percent * 100) / 100)],
              ["Höchster Einkaufssatz für Zielmarge", maxBuyHourly !== null ? `${formatChf(maxBuyHourly)} pro Stunde` : "–"],
            ]}
          />
          <p className="text-xs">Alle Beträge ohne MWST, sofern nicht anders angegeben. Interne Planungsrechnung.</p>
        </PrintSheet>
      ) : null}
    </>
  );
}
