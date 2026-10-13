import Link from "next/link";
import { ArrowRight, Building2, Mail } from "lucide-react";
import { Certifications } from "@/components/sections/certifications";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { competencies } from "@/content/company";
import { industries } from "@/content/industries";
import { business } from "@/content/business";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Für Unternehmen – Business Analyst Contracting",
  description:
    "Business Analyst Contracting für Beratungen, IT-Dienstleister und Unternehmen: KOVALI übernimmt Rollen in Business Analysis, Requirements Engineering, Application Management und Test.",
  path: "/unternehmen",
});

const requestHref = "/kontakt?anfrage=contracting";

export default function UnternehmenPage() {
  const experience = industries.filter((i) => i.kind === "experience");
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Für Unternehmen", path: "/unternehmen" },
        ]}
        eyebrow="Für Beratungen, IT-Dienstleister und Unternehmen"
        title="Spezialisierte Rollen für Ihre IT-Mandate"
        lead={business.intro}
      >
        <ButtonLink href={requestHref} arrow>
          Zusammenarbeit anfragen
        </ButtonLink>
        <ButtonLink href="/ueber-uns" variant="secondary">
          Über KOVALI
        </ButtonLink>
      </PageHero>

      <Section labelledBy="rollen-title">
        <SectionHeader
          id="rollen-title"
          eyebrow="Rollen"
          title="Business Analyst Contracting: diese Rollen übernimmt KOVALI"
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {business.roles.map((r) => (
            <li key={r.title} className="bg-white p-7">
              <h3 className="text-h3 font-semibold">{r.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{r.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="mist" labelledBy="kompetenzen-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <SectionHeader id="kompetenzen-title" eyebrow="Kompetenzen" title="Was KOVALI in Ihr Mandat einbringt" />
            <dl className="mt-10 space-y-6">
              {competencies.map((c) => (
                <div key={c.group}>
                  <dt className="font-semibold text-ink">{c.group}</dt>
                  <dd className="mt-1 text-slate">{c.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-blue">Methodenstandards</h3>
            <div className="mt-5">
              <Certifications stacked headingLevel="h4" />
            </div>
            <h3 className="mt-12 font-mono text-xs uppercase tracking-[0.12em] text-blue">Branchenerfahrung</h3>
            <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-white">
              {experience.map((i) => (
                <li key={i.id} className="p-5">
                  <Link href={`/branchen#${i.id}`} className="font-semibold text-ink hover:text-blue">
                    {i.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate">{i.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="modelle-title">
        <SectionHeader
          id="modelle-title"
          eyebrow="Zusammenarbeit"
          title="Zusammenarbeitsmodelle"
          text="Die Vertragsform richtet sich nach Ihrem Mandat. Rollen, Ergebnisse und Verantwortlichkeiten werden vor dem Start schriftlich vereinbart."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {business.models.map((m, i) => (
            <li key={m.title} className="rounded-xl border border-line p-7">
              <span className="font-mono text-xs text-blue">Modell {i + 1}</span>
              <h3 className="mt-3 text-h3 font-semibold">{m.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate">{business.scopeNote}</p>
      </Section>

      <Section tone="mist" labelledBy="ablauf-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="ablauf-title" eyebrow="Ablauf" title="So übermitteln Sie einen Bedarf" />
            <ButtonLink href={requestHref} arrow className="mt-9">
              Zusammenarbeit anfragen
            </ButtonLink>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
            {business.requestSteps.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-line bg-white p-7">
                <span className="flex size-9 items-center justify-center rounded-md bg-navy font-mono text-sm text-white">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-h3 font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-slate">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section labelledBy="ansprechpartner-title">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-line p-8 md:p-10">
            <p className="eyebrow">Ansprechpartner</p>
            <h2 id="ansprechpartner-title" className="mt-4 text-2xl font-semibold tracking-tight">
              {site.contact.person}
            </h2>
            <p className="mt-1 text-slate">{site.contact.role}</p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3">
                <Mail aria-hidden className="size-5 text-blue" />
                <a href={`mailto:${site.contact.email.value}`} className="text-ink hover:text-blue">
                  {site.contact.email.value}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Building2 aria-hidden className="size-5 text-blue" />
                <Link href="/ueber-uns" className="text-ink hover:text-blue">
                  Über KOVALI
                </Link>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-mist p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-slate">Für Fachleute</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Sie suchen selbst ein Mandat?</h2>
            <p className="mt-4 leading-relaxed text-slate">
              Fachleute aus Business Analysis, Requirements Engineering, Application Management und Test können ihr
              Profil auf der Seite für Fachleute senden.
            </p>
            <Link
              href="/fachleute"
              className="mt-6 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              Zur Seite für Fachleute <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" eyebrow="FAQ" title="Fragen von Unternehmen" />
          </div>
          <div className="lg:col-span-8">
            <Faq items={business.faq} />
          </div>
        </div>
      </Section>

      <CtaBand
        title="Sie haben ein Mandat mit offener Rolle?"
        text="Senden Sie das Anforderungsprofil oder eine kurze Beschreibung. Wir prüfen die Anfrage persönlich und melden uns mit einer ersten Einschätzung."
        primary={{ label: "Zusammenarbeit anfragen", href: requestHref }}
        secondary={null}
      />
      <JsonLd data={faqJsonLd([...business.faq])} />
    </>
  );
}
