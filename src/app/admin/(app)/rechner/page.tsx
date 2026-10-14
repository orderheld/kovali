import type { Metadata } from "next";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, Notice, PageHeader, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { earningsFallback, loadEarningsSettings } from "@/lib/admin/data/earnings";
import { param } from "@/lib/admin/data/query";
import { EARNINGS_AS_OF } from "@/lib/admin/earnings";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { parseDecimal } from "@/lib/admin/payroll";
import { clearEarningsSettings } from "./actions";
import { EarningsCalculator, type CalculatorInitial } from "./earnings-calculator";
import { EarningsSettingsForm } from "./earnings-settings-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Rechner" };

/** Positive number below `max` from a search parameter, else null. */
function amount(value: string | undefined, max: number): number | null {
  const n = parseDecimal(value ?? "");
  return Number.isFinite(n) && n > 0 && n < max ? n : null;
}

/**
 * /admin/rechner: "Was bleibt mir?" for a rate, prefilled from ?satz=&einheit=&pensum=&modell=
 * &basis=&stunden=&spesen= (links from assignments and vacancies). ?ansicht=annahmen shows the
 * assumptions with their sources; ?zurueckgesetzt= follows a reset to the defaults.
 */
export default async function CalculatorPage({ searchParams }: PageProps<"/admin/rechner">) {
  await requireAdmin();
  const sp = await searchParams;
  const view = param(sp.ansicht) === "annahmen" ? "annahmen" : "rechnen";
  const { settings, savedAt, saved } = await loadEarningsSettings();

  const workload = Number(param(sp.pensum));
  const model = param(sp.modell);
  const basis = param(sp.basis);
  const initial: CalculatorInitial = {
    rate: amount(param(sp.satz), 100_000) ?? 120,
    unit: param(sp.einheit) === "tag" ? "tag" : "stunde",
    workload: Number.isInteger(workload) && workload >= 1 && workload <= 100 ? workload : 100,
    billing: model === "lohn" ? "lohn" : "rechnung",
    rateBasis: basis === "kostensatz" ? "kostensatz" : "brutto",
    hoursPerMonth: amount(param(sp.stunden), 400),
    expensesMonthly: amount(param(sp.spesen), 100_000) ?? 0,
  };
  // A new prefill (another assignment) starts the calculator fresh.
  const calculatorKey = JSON.stringify(initial);
  // Changes only on a reset: the form then shows the defaults. A save keeps the form mounted,
  // so its success message stays visible.
  const reset = param(sp.zurueckgesetzt);
  const savedText = !saved
    ? "Noch nicht gespeichert: Es gelten die Standardwerte."
    : savedAt
      ? `Deine Werte, gespeichert am ${formatDateTime(savedAt)}.`
      : "Deine gespeicherten Werte.";

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Rechner" description="Was dir von einem Satz bleibt, als Rechnung über deine Einzelfirma oder als Lohn über einen Anbieter." />
        <Tabs
          items={[
            { label: "Was bleibt mir?", href: "/admin/rechner", active: view === "rechnen" },
            { label: "Annahmen", href: "/admin/rechner?ansicht=annahmen", active: view === "annahmen" },
          ]}
        />
      </div>
      {view === "rechnen" ? (
        <>
          <h1 className="mb-4 hidden text-xl font-semibold print:block">Was bleibt mir?</h1>
          <EarningsCalculator key={calculatorKey} settings={settings} initial={initial} saved={saved} />
        </>
      ) : (
        <div className="max-w-5xl space-y-6">
          {reset && !saved ? (
            <Notice tone="green" icon={CheckCircle2}>
              Zurückgesetzt. Es gelten wieder die Standardwerte.
            </Notice>
          ) : null}
          <Card>
            <CardBody className="flex flex-wrap items-start justify-between gap-4 text-sm">
              <div className="max-w-2xl space-y-1.5">
                <p className="text-ink">
                  Mit diesen Werten rechnen der Rechner, deine Aufträge und die Übersicht. Die Standardwerte gelten für 2026, recherchiert am {formatDate(EARNINGS_AS_OF)}. Prüfe sie einmal im Jahr.
                </p>
                <p className="text-slate">
                  «Richtwert» und «Annahme» sind Schätzungen. Ersetze sie durch die Zahlen aus deinen Offerten und Verfügungen.
                </p>
                <p className="font-medium text-ink">{savedText}</p>
              </div>
              {saved ? (
                <ActionButton
                  action={clearEarningsSettings}
                  confirm="Deine gespeicherten Annahmen löschen? Danach gelten wieder die Standardwerte."
                  icon={<RotateCcw aria-hidden className="size-4" />}
                >
                  Auf Standardwerte zurücksetzen
                </ActionButton>
              ) : null}
            </CardBody>
          </Card>
          <EarningsSettingsForm key={reset ?? "annahmen"} settings={settings} defaults={earningsFallback()} />
        </div>
      )}
    </>
  );
}
