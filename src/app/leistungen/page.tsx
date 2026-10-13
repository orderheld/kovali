import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { business } from "@/content/business";
import { services, serviceHref } from "@/content/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Leistungen – Business Analysis Dienstleistungen",
  description:
    "Business Analysis Dienstleistungen, Requirements Engineering, Application Management, Test Management und Test Engineering für IT-Projekte in der Schweiz.",
  path: "/leistungen",
});

const phases = [
  { phase: "Verstehen", slugs: ["business-analysis"] },
  { phase: "Spezifizieren", slugs: ["requirements-engineering"] },
  { phase: "Prüfen und abnehmen", slugs: ["test-management", "test-engineering"] },
  { phase: "Betreiben und weiterentwickeln", slugs: ["application-management"] },
] as const;

export default function LeistungenPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
        ]}
        eyebrow="Leistungen"
        title="Business Analysis Dienstleistungen für IT-Projekte"
        lead="Von der ersten Anforderung bis zur abgenommenen Lösung: KOVALI unterstützt Fachbereiche, IT-Abteilungen und Projektteams dort, wo Anforderungen entstehen, umgesetzt und geprüft werden."
      >
        <ButtonLink href="/kontakt" arrow>
          Zusammenarbeit anfragen
        </ButtonLink>
      </PageHero>

      <Section labelledBy="uebersicht-title">
        <h2 id="uebersicht-title" className="sr-only">
          Die fünf Leistungen
        </h2>
        <ul className="grid gap-5 lg:grid-cols-2">
          {services.map((s) => (
            <li key={s.slug} className="group relative flex flex-col rounded-xl border border-line bg-white p-8 transition-colors hover:border-blue/50 md:p-10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-blue">{s.code}</span>
                <ArrowRight aria-hidden className="size-5 text-slate/50 transition-all group-hover:translate-x-0.5 group-hover:text-blue" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-xl group-hover:text-blue">
                  {s.name}
                </Link>
              </h3>
              <p className="mt-3 leading-relaxed text-slate">{s.summary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {s.tasks.slice(0, 4).map((t) => (
                  <li key={t} className="rounded-md bg-mist px-3 py-1.5 text-sm text-ink">
                    {t}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li className="flex flex-col justify-between rounded-xl bg-navy p-8 text-white md:p-10">
            <div>
              <p className="font-mono text-sm text-electric">01–05</p>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">Mehrere Leistungen kombinieren</h3>
              <p className="mt-3 leading-relaxed text-white/75">
                Viele Vorhaben brauchen Analyse und Test aus einer Hand. Die Leistungen lassen sich kombinieren, damit
                Anforderungen und Testfälle nahtlos zusammenpassen.
              </p>
            </div>
            <ButtonLink href="/kontakt" variant="inverse" arrow className="mt-8 self-start">
              Vorhaben besprechen
            </ButtonLink>
          </li>
        </ul>
      </Section>

      <Section tone="mist" labelledBy="zusammenspiel-title">
        <SectionHeader
          id="zusammenspiel-title"
          eyebrow="Zusammenspiel"
          title="Eine durchgängige Strecke statt einzelner Übergaben"
          text="Wer die Anforderungen kennt, testet gezielter. Wer die Tests kennt, formuliert prüfbare Anforderungen. Die Leistungen folgen dem Lebenszyklus einer Lösung."
        />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((p, i) => (
            <li key={p.phase} className="bg-white p-7">
              <span className="font-mono text-xs text-slate">Phase {i + 1}</span>
              <h3 className="mt-3 text-lg font-semibold">{p.phase}</h3>
              <ul className="mt-4 space-y-2">
                {p.slugs.map((slug) => {
                  const s = services.find((x) => x.slug === slug)!;
                  return (
                    <li key={slug}>
                      <Link href={serviceHref(slug)} className="text-blue hover:underline">
                        {s.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="mandate-title">
        <SectionHeader
          id="mandate-title"
          eyebrow="Zusammenarbeit"
          title="Mandatsformen"
          text="KOVALI arbeitet direkt für Unternehmen und öffentliche Organisationen oder als Subunternehmen für IT-Dienstleister."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {business.models.map((m) => (
            <li key={m.title} className="rounded-xl border border-line p-7">
              <h3 className="text-h3 font-semibold">{m.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-slate">
          Mehr zur Zusammenarbeit mit Beratungen und IT-Dienstleistern:{" "}
          <Link href="/unternehmen" className="text-blue underline underline-offset-[3px]">
            Für Unternehmen
          </Link>
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
