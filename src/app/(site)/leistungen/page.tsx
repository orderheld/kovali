import { ProcessStrip } from "@/components/artifacts/process-strip";
import { CheckList } from "@/components/sections/check-list";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceList } from "@/components/sections/service-list";
import { ButtonLink } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { Section, SectionHeader } from "@/components/ui/section";
import { serviceHref } from "@/content/services";
import type { ProcessNode } from "@/content/work-samples";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "IT Consulting Schweiz – Business Analysis und Test",
  description:
    "IT Consulting von KOVALI: Business Analysis, Requirements Engineering, Testmanagement, Test Engineering und Application Management in der ganzen Schweiz.",
  path: "/leistungen",
});

const scope = [
  "Anforderungen mit den Fachbereichen erheben und priorisieren",
  "Abläufe, Datenflüsse und Schnittstellen fachlich spezifizieren",
  "Tests planen und bis zur Abnahme steuern",
  "Business-Applikationen nach dem Go-live fachlich betreuen",
  "Mitarbeit in Scrum-, Kanban- oder SAFe-Teams und in klassischen Projekten",
];

/** The disciplines along the life of an application; a real flow, so the strip is not framed as "Beispiel". */
const lifecycle: { nodes: ProcessNode[] } = {
  nodes: [
    {
      type: "task",
      label: "Verstehen und spezifizieren",
      links: [{ label: "Business Analysis & Requirements Engineering", href: serviceHref("business-analysis") }],
    },
    {
      type: "task",
      label: "Prüfen und abnehmen",
      links: [
        { label: "Testmanagement", href: serviceHref("test-management") },
        { label: "Test Engineering", href: serviceHref("test-engineering") },
      ],
    },
    {
      type: "task",
      label: "Betreiben und weiterentwickeln",
      links: [{ label: "Application Management", href: serviceHref("application-management") }],
    },
  ],
};

export default function LeistungenPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
        ]}
        title="IT Consulting für Business Analysis und Test"
        lead="KOVALI übernimmt in Ihrem IT-Projekt eine fest umrissene Aufgabe: Business Analysis und Requirements Engineering, Testmanagement, Test Engineering oder die fachliche Betreuung einer Applikation. Aufgaben und Ergebnisse vereinbaren wir vor dem Start schriftlich."
      >
        <ButtonLink href="/kontakt" variant="inverse" arrow>
          Projekt besprechen
        </ButtonLink>
        <ButtonLink href="/unternehmen" variant="outline-inverse">
          Zusammenarbeit
        </ButtonLink>
      </PageHero>

      <Section labelledBy="definition-title">
        <SectionHeader
          id="definition-title"
          layout="split"
          title="Was IT Consulting bei KOVALI heisst"
          text="Der Begriff deckt vieles ab, von der Strategieberatung bis zum Laptop-Support. Bei KOVALI ist er eng gefasst: Wir arbeiten dort, wo Fachbereich und IT klären, was eine Applikation können soll, und dort, wo geprüft wird, ob sie es kann."
        />
        <div className="mt-14 border-t border-line pt-10 md:mt-16">
          <h3 className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-blue">Dazu gehört</h3>
          <CheckList items={scope} className="mt-6" />
          <p className="mt-10 max-w-3xl leading-relaxed text-slate">
            <RichText text="Nicht dazu gehören Programmierung, technischer Betrieb sowie Personalverleih und Stellenvermittlung. [Was KOVALI nicht anbietet](/warum-kovali#abgrenzung)" />
          </p>
        </div>
      </Section>

      <Section tone="cloud" labelledBy="disziplinen-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <SectionHeader
              id="disziplinen-title"
              title="Die Disziplinen im IT Consulting"
              text="Jede Disziplin ist einzeln buchbar."
            />
          </div>
          <div className="lg:col-span-7">
            <ServiceList umbrella detailed />
          </div>
        </div>
      </Section>

      <Section labelledBy="zusammenspiel-title">
        <SectionHeader
          id="zusammenspiel-title"
          layout="split"
          title="Analyse und Test im selben Mandat"
          text="Wenn KOVALI die User Stories schreibt und auch den Test plant, entstehen die Testfälle direkt aus den Akzeptanzkriterien. Das spart eine Übergabe und die Rückfragen, die dabei üblicherweise entstehen. Wer die Applikation danach im Betrieb betreut, kennt die Anforderungen, auf denen sie beruht."
        />
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-line bg-cloud px-5 py-2 sm:px-8 lg:py-6">
          <div
            aria-hidden
            className="tech-grid pointer-events-none absolute inset-0 [--grid-color:rgb(20_91_206/0.07)] [--grid-size:32px]"
          />
          <ProcessStrip framed={false} horizontalFrom="lg" className="relative px-0 lg:px-0" process={lifecycle} />
        </div>
      </Section>

      <Section tone="cloud" space="tight" labelledBy="zusammenarbeit-title">
        <SectionHeader
          id="zusammenarbeit-title"
          layout="split"
          title="Direkt oder als Subunternehmen"
          text={
            <div className="space-y-6">
              <p>
                <RichText text="KOVALI arbeitet direkt für Unternehmen und öffentliche Organisationen oder als Subunternehmen für Beratungen und IT-Dienstleister, vor Ort, remote oder hybrid in der ganzen Schweiz. [Zusammenarbeit im Detail](/unternehmen)" />
              </p>
              <p>
                <RichText text="Geführt wird KOVALI von Ferhat Demir, Geschäftsführer. Er ist Ihr Ansprechpartner, vom ersten Gespräch bis zur Übergabe. [Warum KOVALI](/warum-kovali#geschaeftsleitung)" />
              </p>
            </div>
          }
        />
      </Section>

      <CtaBand
        title="Welche Aufgabe ist in Ihrem Projekt offen?"
        text="Beschreiben Sie Aufgabe, Zeitraum und Pensum. Sie erhalten eine erste Einschätzung und danach eine schriftliche Offerte."
        primary={{ label: "Offerte anfragen", href: "/kontakt" }}
        secondary={null}
      />
    </>
  );
}
