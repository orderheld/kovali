import { CtaBand } from "@/components/sections/cta-band";
import { Tick } from "@/components/sections/check-list";
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
        <ButtonLink href={hero.primary.href} arrow>
          {hero.primary.label}
        </ButtonLink>
        <ButtonLink href={hero.secondary.href} variant="secondary" className="border-field bg-transparent">
          {hero.secondary.label}
        </ButtonLink>
      </PageHero>

      <PersonBlock variant="full" id="geschaeftsleitung" headingId="ferhat-demir" />

      <Section rule labelledBy="gruende-title">
        <SectionHeader id="gruende-title" title={reasons.title} />
        <ul className="mt-12 grid gap-x-8 md:grid-cols-2">
          {reasons.items.map((r) => (
            <li key={r.title} className="border-t border-line pb-10 pt-7">
              <h3 className="text-h3 font-semibold">{r.title}</h3>
              <p className="mt-3 max-w-xl leading-relaxed text-slate">
                <RichText text={r.text} />
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" labelledBy="arbeitsweise-title">
        <SectionHeader id="arbeitsweise-title" title={why.principles.title} />
        <ul className="mt-12 border-b border-paper-line">
          {principles.map((p) => (
            <li key={p.title} className="grid gap-2 border-t border-paper-line py-6 lg:grid-cols-12 lg:gap-8">
              <h3 className="text-lg font-semibold leading-snug lg:col-span-5">{p.title}</h3>
              <p className="max-w-2xl leading-relaxed text-slate lg:col-span-7">{p.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-14 max-w-4xl font-display text-statement text-ink">
          {why.principles.closing}
          <span lang="en" className="mt-2 block">
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
            <ul className="space-y-5">
              {exclusions.items.map((item) => (
                <li key={item.title} className="flex gap-3 leading-relaxed text-slate">
                  <Tick />
                  <p>
                    <strong className="font-semibold text-ink">{item.title}</strong> {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="paper" labelledBy="faq-title">
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
