import { CtaBand } from "@/components/sections/cta-band";
import { IndustryCards } from "@/components/sections/industry-cards";
import { PageHero } from "@/components/sections/page-hero";
import { Section, SectionHeader } from "@/components/ui/section";
import { founder } from "@/content/company";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Branchen – IT Business Analyst für Verwaltung und Logistik",
  description:
    "IT Business Analyst mit Erfahrung in öffentlicher Verwaltung, Logistik, Transport, Detailhandel und Zahlungsverkehr, dazu Banken, Versicherungen und IT-Dienstleister.",
  path: "/branchen",
});

export default function BranchenPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Branchen", path: "/branchen" },
        ]}
        eyebrow="Branchen"
        title="IT Business Analyst für öffentliche Verwaltung und komplexe Organisationen"
        lead="Grosse Organisationen haben viele Anspruchsgruppen, gewachsene Systemlandschaften und hohe Anforderungen an Nachvollziehbarkeit. Genau dort liegt die Projekterfahrung hinter KOVALI."
      />

      <Section labelledBy="erfahrung-title">
        <SectionHeader
          id="erfahrung-title"
          eyebrow="Projekterfahrung"
          title="Branchen mit nachgewiesener Projekterfahrung"
          text="In diesen Branchen wurden Anforderungen erhoben, Fachkonzepte erstellt, Applikationen betreut und Tests verantwortet."
        />
        <div className="mt-12">
          <IndustryCards kind="experience" detailed label={false} />
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate">{founder.employerNote}</p>
      </Section>

      <Section tone="mist" labelledBy="zielmaerkte-title">
        <SectionHeader
          id="zielmaerkte-title"
          eyebrow="Zielmärkte"
          title="Weitere Branchen mit übertragbaren Anforderungen"
          text="Regulierte Branchen stellen ähnliche Anforderungen: viele Schnittstellen, strenge Vorgaben und belastbare Tests. Hier setzt KOVALI Methodik und Erfahrung aus vergleichbaren Umgebungen ein."
        />
        <div className="mt-12">
          <IndustryCards kind="target" detailed label={false} />
        </div>
      </Section>

      <CtaBand
        title="Ihre Branche ist nicht aufgeführt?"
        text="Die Methoden der Business Analysis und des Testens sind branchenübergreifend. Schildern Sie Ihr Vorhaben, und Sie erhalten eine ehrliche Einschätzung zur Passung."
      />
    </>
  );
}
