import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { PersonBlock } from "@/components/sections/person-block";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { RichText } from "@/components/ui/rich-text";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { principles } from "@/content/company";
import { why } from "@/content/why";
import { faqJsonLd, pageMetadata, personJsonLd } from "@/lib/seo";

const path = "/warum-kovali";

export const metadata = pageMetadata({
  title: why.meta.title,
  description: why.meta.description,
  shareDescription: why.meta.shareDescription,
  path,
});

/**
 * Warum KOVALI (spec 3.4): who leads KOVALI, why to choose it, the working rules, what it
 * does not offer and an FAQ. Replaces "Über uns" (/ueber-uns redirects here).
 */
export default function WarumKovaliPage() {
  const { hero, reasons, exclusions, cta } = why;

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Warum KOVALI", path },
        ]}
        title={hero.title}
        lead={hero.lead}
      >
        <ButtonLink href={hero.primary.href} variant="inverse" arrow>
          {hero.primary.label}
        </ButtonLink>
        <ButtonLink href={hero.secondary.href} variant="outline-inverse">
          {hero.secondary.label}
        </ButtonLink>
      </PageHero>

      <PersonBlock variant="full" id="geschaeftsleitung" headingId="ferhat-demir" />

      <Section tone="cloud" labelledBy="gruende-title">
        <SectionHeader id="gruende-title" title={reasons.title} />
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reasons.items.map((r, i) => (
            <li
              key={r.title}
              className="relative overflow-hidden rounded-xl border border-cloud-line bg-white p-7 shadow-[0_1px_0_rgb(11_23_51/0.03)]"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-blue to-electric" />
              <p aria-hidden className="font-mono text-xs text-blue">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-h3 font-semibold">{r.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">
                <RichText text={r.text} />
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="night" labelledBy="arbeitsweise-title">
        <SectionHeader id="arbeitsweise-title" title={why.principles.title} />
        <ol className="mt-12 border-b border-white/10">
          {principles.map((p, i) => (
            <li key={p.title} className="grid gap-2 border-t border-white/10 py-7 lg:grid-cols-12 lg:gap-8">
              <h3 className="flex gap-4 text-lg font-semibold leading-snug text-white lg:col-span-5">
                <span aria-hidden className="pt-1 font-mono text-xs font-medium text-electric">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {p.title}
              </h3>
              <p className="max-w-2xl leading-relaxed text-white/70 lg:col-span-7">{p.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-16 max-w-4xl text-statement font-medium text-white">
          {why.principles.closing}
          <span lang="en" className="mt-4 flex items-center gap-3 font-mono text-sm font-normal uppercase tracking-[0.08em] text-electric">
            <span aria-hidden className="h-px w-8 bg-electric" />
            {site.claim}
          </span>
        </p>
      </Section>

      <Section id="abgrenzung" labelledBy="abgrenzung-title" className="scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="abgrenzung-title" title={exclusions.title} />
          </div>
          <div className="lg:col-span-8">
            <ul className="divide-y divide-line border-y border-line">
              {exclusions.items.map((item) => (
                <li key={item.title} className="flex gap-4 py-6 leading-relaxed text-slate">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line font-mono text-sm leading-none text-slate"
                  >
                    ×
                  </span>
                  <p>
                    <strong className="font-semibold text-ink">{item.title}</strong> {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="cloud" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" title={why.faqTitle} />
          </div>
          <div className="lg:col-span-8">
            <Faq items={why.faq} />
          </div>
        </div>
      </Section>

      <CtaBand title={cta.title} text={cta.text} primary={cta.primary} secondary={cta.secondary} />

      <JsonLd data={[personJsonLd(), faqJsonLd(why.faq)]} />
    </>
  );
}
