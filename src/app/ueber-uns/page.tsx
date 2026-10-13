import { Approach } from "@/components/sections/approach";
import { Certifications } from "@/components/sections/certifications";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { founder, principles, projectLanguages } from "@/content/company";
import { pageMetadata, personJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Über uns – IT Consulting für die ganze Schweiz",
  description:
    `KOVALI ist ein IT-Consulting-Unternehmen für Business Analysis, Requirements Engineering und Test in der ganzen Schweiz. ${site.contact.title}: ${site.contact.person}.`,
  path: "/ueber-uns",
});

export default function UeberUnsPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Über uns", path: "/ueber-uns" },
        ]}
        eyebrow="Über uns"
        title="IT Consulting für die ganze Schweiz"
        lead="KOVALI bringt Klarheit in IT-Vorhaben: Anforderungen, die alle Beteiligten gleich verstehen, und Lösungen, die nachweislich tun, was sie sollen."
      />

      <Section labelledBy="name-title">
        <SectionHeader
          id="name-title"
          eyebrow="Der Name"
          title="KO · VA · LI"
          text={
            <>
              Der Name verbindet die drei Schritte, die jedes IT-Vorhaben braucht. Dahinter steht der Anspruch, der
              auch im Claim steckt: <span className="font-medium text-ink">{site.claim}</span>
            </>
          }
        />
        <div className="mt-12">
          <Approach />
        </div>
      </Section>

      <Section tone="mist" labelledBy="arbeitsweise-title">
        <SectionHeader id="arbeitsweise-title" eyebrow="Arbeitsweise" title="Wie KOVALI arbeitet" />
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => (
            <li key={p.title} className="border-t-2 border-navy pt-6">
              <span className="font-mono text-xs text-blue">0{i + 1}</span>
              <h3 className="mt-3 text-h3 font-semibold">{p.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{p.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="leitung-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="lg:col-span-7">
            <SectionHeader id="leitung-title" eyebrow={founder.role} title={founder.name} />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate">
              {founder.summary.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Schwerpunkte</dt>
                <dd className="mt-2 text-ink">Business Analysis, Requirements Engineering, Application Management, Test</dd>
              </div>
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Projektsprachen</dt>
                <dd className="mt-2 text-ink">{projectLanguages.join(", ")}</dd>
              </div>
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Arbeitsmodell</dt>
                <dd className="mt-2 text-ink">Vor Ort, remote oder hybrid in der ganzen Schweiz</dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="zertifikate-title">
        <SectionHeader id="zertifikate-title" eyebrow="Methodik" title="Methodische Grundlage" />
        <div className="mt-12">
          <Certifications />
        </div>
      </Section>

      <CtaBand />
      <JsonLd data={personJsonLd()} />
    </>
  );
}
