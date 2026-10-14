import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Briefcase, Building2, Calculator, FileSignature, Telescope, TextQuote } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { setupProgress } from "@/lib/admin/data/dashboard";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

function greeting(now: Date): string {
  // formatToParts: in de-CH a bare hour is formatted as "9 Uhr", which is not a number.
  const parts = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  if (hour < 5) return "Hallo, Ferhat";
  if (hour < 11) return "Guten Morgen, Ferhat";
  if (hour < 18) return "Guten Tag, Ferhat";
  return "Guten Abend, Ferhat";
}

function longToday(now: Date): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
}

function ModuleLink({ href, label, hint, icon: Icon, count }: { href: string; label: string; hint: string; icon: LucideIcon; count?: number }) {
  return (
    <li>
      <Link href={href} className="flex h-full items-start gap-3 px-5 py-4 transition-colors hover:bg-mist/60">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue/10 text-blue">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            {label}
            {count !== undefined ? <span className="ml-1.5 text-slate tabular-nums">({count})</span> : null}
          </span>
          <span className="mt-0.5 block text-xs text-slate">{hint}</span>
        </span>
        <ArrowRight aria-hidden className="mt-1 size-3.5 shrink-0 text-slate/60" />
      </Link>
    </li>
  );
}

/** Placeholder until the dashboard with earnings, pipeline and snippets arrives. */
export default async function DashboardPage() {
  await requireAdmin();
  const now = new Date();
  const counts = await setupProgress();

  return (
    <>
      <PageHeader title={greeting(now)} description={`${longToday(now)}.`} />
      <Card>
        <ul className="divide-y divide-line sm:grid sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
          <ModuleLink href="/admin/auftraege" label="Aufträge" hint="Wo du gerade arbeitest und was dir bleibt." icon={Briefcase} count={counts.assignments} />
          <ModuleLink href="/admin/vakanzen" label="Vakanzen" hint="Bewerbungen und nächste Schritte." icon={Telescope} count={counts.vacancies} />
          <ModuleLink href="/admin/vertraege" label="Verträge" hint="Unterzeichnete Verträge ablegen und finden." icon={FileSignature} count={counts.contracts} />
          <ModuleLink href="/admin/texte" label="Textbausteine" hint="Texte für Bewerbungen, mit einem Klick kopiert." icon={TextQuote} count={counts.snippets} />
          <ModuleLink href="/admin/firmen" label="Firmen & Kontakte" hint="Vermittler, Endkunden und Ansprechpersonen." icon={Building2} count={counts.companies} />
          <ModuleLink href="/admin/rechner" label="Rechner" hint="Was bleibt dir bei einem Stundensatz?" icon={Calculator} />
        </ul>
      </Card>
    </>
  );
}
