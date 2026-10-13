import { MapPin } from "lucide-react";
import { Approach } from "@/components/sections/approach";
import { Certifications } from "@/components/sections/certifications";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { founder, location, principles } from "@/content/company";
import { pageMetadata, personJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Über uns – IT Consulting aus Grenchen",
  description:
    "KOVALI ist ein IT-Consulting-Unternehmen aus Grenchen für Business Analysis, Requirements Engineering und Test in der ganzen Schweiz. Gründer: Ferhat Demir.",
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
        title="IT Consulting aus Grenchen für die ganze Schweiz"
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

      <Section labelledBy="gruender-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <SectionHeader id="gruender-title" eyebrow="Gründer" title={founder.name} />
            <p className="mt-3 font-medium text-blue">{founder.role}</p>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate">
              {founder.summary.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <h3 className="mt-14 text-h3 font-semibold">Ausgewählte Projekterfahrung</h3>
            <ol className="mt-6 border-l border-line">
              {founder.experience.map((e) => (
                <li key={e.organisation} className="relative pb-10 pl-8 last:pb-0">
                  <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rotate-45 bg-blue" />
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-slate">{e.period}</p>
                  <h4 className="mt-2 text-lg font-semibold">{e.organisation}</h4>
                  <p className="text-blue">{e.role}</p>
                  <ul className="mt-3 space-y-1.5 text-slate">
                    {e.points.slice(0, 3).map((pt) => (
                      <li key={pt} className="flex gap-3">
                        <span aria-hidden className="mt-[0.7em] h-px w-2.5 shrink-0 bg-slate/50" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm leading-relaxed text-slate">{founder.employerNote}</p>
          </div>

          <div className="self-start lg:sticky lg:top-28 lg:col-span-4 lg:col-start-9">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Schwerpunkte</dt>
                <dd className="mt-2 text-ink">Business Analysis, Requirements Engineering, Application Management, Test</dd>
              </div>
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Sprachen</dt>
                <dd className="mt-2 space-y-1 text-ink">
                  {founder.languages.map((l) => (
                    <p key={l.name}>
                      {l.name} <span className="text-slate">· {l.level}</span>
                    </p>
                  ))}
                </dd>
              </div>
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Arbeitsmodell</dt>
                <dd className="mt-2 text-ink">Vor Ort, remote oder hybrid in der ganzen Schweiz</dd>
              </div>
              <div className="p-6">
                <dt className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Standort</dt>
                <dd className="mt-2 text-ink">
                  {site.contact.address.city}, Kanton Solothurn
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="zertifikate-title">
        <SectionHeader id="zertifikate-title" eyebrow="Zertifizierungen" title="Methodische Grundlage" />
        <div className="mt-12">
          <Certifications />
        </div>
      </Section>

      <Section labelledBy="standort-title">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <SectionHeader id="standort-title" eyebrow="Standort" title={location.title} text={location.text} />
          </div>
          <address className="self-end rounded-xl bg-mist p-7 not-italic md:col-span-4 md:col-start-9">
            <MapPin aria-hidden className="size-6 text-blue" />
            <p className="mt-4 font-semibold text-ink">{site.brand}</p>
            <p className="mt-1 leading-relaxed text-slate">
              {site.contact.address.street}
              <br />
              {site.contact.address.postalCode} {site.contact.address.city}
              <br />
              {site.contact.address.country}
            </p>
          </address>
        </div>
      </Section>

      <CtaBand />
      <JsonLd data={personJsonLd()} />
    </>
  );
}
