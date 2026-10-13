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
        lead="Grosse Organisationen haben viele Anspruchsgruppen, gewachsene Systemlandschaften und hohe Anforderungen an Nachvollziehbarkeit. Genau dort liegt die Erfahrung, auf der KOVALI aufbaut."
      />

      <Section labelledBy="erfahrung-title">
        <SectionHeader
          id="erfahrung-title"
          eyebrow="Erfahrung"
          title="Branchen, die KOVALI aus der Praxis kennt"
          text="Abläufe, Fachbegriffe und typische Anforderungen dieser Branchen sind vertraut, von der Erhebung über die Spezifikation bis zum Test."
        />
        <div className="mt-12">
          <IndustryCards kind="experience" detailed label={false} />
        </div>
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
