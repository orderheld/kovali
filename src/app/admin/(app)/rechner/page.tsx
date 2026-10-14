import type { Metadata } from "next";
import { PageHeader, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { param } from "@/lib/admin/data/query";
import { kovaliParty } from "@/lib/admin/party";
import { parseDecimal } from "@/lib/admin/payroll";
import { clearCalculatorDefaults, saveCalculatorDefaults } from "./actions";
import { B2bCalculator } from "./b2b-calculator";
import { loadCalculatorDefaults } from "./defaults";
import { WageCalculator } from "./wage-calculator";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Rechner" };

export default async function CalculatorPage({ searchParams }: PageProps<"/admin/rechner">) {
  await requireAdmin();
  const sp = await searchParams;
  const mode = param(sp.modus) === "lohn" ? "lohn" : "marge";

  // The margin tab links here with the subcontractor's rate (?satz=100&einheit=stunde).
  const satz = parseDecimal(param(sp.satz) ?? "");
  const initialRate = Number.isFinite(satz) && satz > 0 && satz < 100_000 ? { rate: satz, unit: param(sp.einheit) === "tag" ? ("tag" as const) : ("stunde" as const) } : null;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Rechner"
          description="Marge zwischen Auftraggeber und Subunternehmen, und was die Firma der Fachperson daraus als Lohn zahlen kann."
        />
        <Tabs
          items={[
            { label: "Marge Subunternehmen (B2B)", href: "/admin/rechner", active: mode === "marge" },
            { label: "Lohn der Fachperson", href: "/admin/rechner?modus=lohn", active: mode === "lohn" },
          ]}
        />
      </div>
      {mode === "marge" ? (
        <B2bCalculator kovaliVatRegistered={Boolean(kovaliParty().vatNumber)} />
      ) : (
        <WageCalculator
          key={initialRate ? `${initialRate.rate}-${initialRate.unit}` : "ohne-satz"}
          saved={await loadCalculatorDefaults()} initialRate={initialRate} saveAction={saveCalculatorDefaults} clearAction={clearCalculatorDefaults} />
      )}
    </>
  );
}
