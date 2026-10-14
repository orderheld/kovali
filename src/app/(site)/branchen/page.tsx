import { CtaBand } from "@/components/sections/cta-band";
import { IndustryCards } from "@/components/sections/industry-cards";
import { PageHero } from "@/components/sections/page-hero";
import { Section, SectionHeader } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Branchen – IT Business Analyst für Verwaltung und Logistik",
  description:
    "Business Analysis, Requirements Engineering und Test für öffentliche Verwaltung, Logistik, Transport, Detailhandel und Zahlungsverkehr sowie für Banken, Versicherungen und IT-Dienstleister.",
  path: "/branchen",
});

/**
 * Branchen (spec 3.7): the industries from Ferhat Demir's own practice, then the target
 * markets KOVALI addresses (no experience is claimed there).
 */
export default function BranchenPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Branchen", path: "/branchen" },
        ]}
        title="Business Analysis und Test für Verwaltung, Logistik und Zahlungsverkehr"
        lead="In der öffentlichen Verwaltung, in der Logistik und im Detailhandel mit Zahlungsverkehr hat Ferhat Demir, Geschäftsführer von KOVALI, Anforderungen erhoben, Schnittstellen spezifiziert und Tests durchgeführt."
      />

      <Section labelledBy="erfahrung-title">
        <SectionHeader
          id="erfahrung-title"
          title="Aus der Praxis von Ferhat Demir"
          text="In diesen Branchen hat Ferhat Demir gearbeitet. Abläufe, Fachbegriffe und typische Vorgaben kennt er aus eigener Erfahrung, das verkürzt die Einarbeitung."
        />
        <div className="mt-12">
          <IndustryCards kind="experience" labelledBy="erfahrung-title" />
        </div>
      </Section>

      <Section tone="paper" labelledBy="zielmaerkte-title">
        <SectionHeader
          id="zielmaerkte-title"
          title="Weitere Zielmärkte"
          text="Banken, Versicherungen und IT-Dienstleister spricht KOVALI gezielt an: Zahlungsverkehr, Datenschutz und Regressionstests über viele Systeme sind dort Alltag."
        />
        <div className="mt-12">
          <IndustryCards kind="target" variant="list" labelledBy="zielmaerkte-title" />
        </div>
      </Section>

      <CtaBand
        title="Ihre Branche ist nicht aufgeführt?"
        text="Business Analysis und Test funktionieren branchenübergreifend. Schildern Sie Ihr Vorhaben. Ferhat Demir sagt Ihnen, ob KOVALI dafür passt."
        primary={{ label: "Vorhaben schildern", href: "/kontakt" }}
        secondary={null}
      />
    </>
  );
}
