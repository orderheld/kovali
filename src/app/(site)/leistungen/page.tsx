import { ProcessStrip } from "@/components/artifacts/process-strip";
import { CheckList } from "@/components/sections/check-list";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceList } from "@/components/sections/service-list";
import { ButtonLink } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { Section, SectionHeader } from "@/components/ui/section";
import { priceTeasers } from "@/content/pricing";
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
        <ButtonLink href="/kontakt" arrow>
          Projekt besprechen
        </ButtonLink>
        <ButtonLink href="/preise" variant="secondary" className="border-field bg-transparent">
          Preise ansehen
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
          <h3 className="text-lg font-semibold text-ink">Dazu gehört</h3>
          <CheckList items={scope} className="mt-6" />
          <p className="mt-10 max-w-3xl leading-relaxed text-slate">
            <RichText text="Nicht dazu gehören Programmierung, technischer Betrieb sowie Personalverleih und Stellenvermittlung. [Was KOVALI nicht anbietet](/warum-kovali#abgrenzung)" />
          </p>
        </div>
      </Section>

      <Section rule labelledBy="disziplinen-title">
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

      <Section tone="paper" labelledBy="zusammenspiel-title">
        <SectionHeader
          id="zusammenspiel-title"
          layout="split"
          title="Analyse und Test im selben Mandat"
          text="Wenn KOVALI die User Stories schreibt und auch den Test plant, entstehen die Testfälle direkt aus den Akzeptanzkriterien. Das spart eine Übergabe und die Rückfragen, die dabei üblicherweise entstehen. Wer die Applikation danach im Betrieb betreut, kennt die Anforderungen, auf denen sie beruht."
        />
        <ProcessStrip framed={false} horizontalFrom="lg" className="mt-12 px-0 lg:px-0" process={lifecycle} />
      </Section>

      <Section space="tight" labelledBy="preise-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="preise-title" className="text-h2 font-medium text-ink">
              {priceTeasers.overview.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate">{priceTeasers.overview.text}</p>
            <ButtonLink href="/preise" variant="secondary" arrow className="mt-8 border-field">
              Preise im Detail
            </ButtonLink>
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-slate lg:pt-2">
            <p>
              <RichText text="KOVALI arbeitet direkt für Unternehmen und öffentliche Organisationen oder als Subunternehmen für Beratungen und IT-Dienstleister, vor Ort, remote oder hybrid in der ganzen Schweiz. [Zusammenarbeit im Detail](/unternehmen)" />
            </p>
            <p>
              {/* No years of experience here: they never stand next to prices (spec 4.1). */}
              <RichText text="Geführt wird KOVALI von Ferhat Demir, Geschäftsführer. Er ist Ihr Ansprechpartner, vom ersten Gespräch bis zur Übergabe. [Warum KOVALI](/warum-kovali#geschaeftsleitung)" />
            </p>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Welche Aufgabe ist in Ihrem Projekt offen?"
        text="Beschreiben Sie Aufgabe, Zeitraum und Pensum. Sie erhalten eine Offerte mit verbindlichem Stundensatz."
        primary={{ label: "Offerte anfragen", href: "/kontakt" }}
        secondary={null}
      />
    </>
  );
}
