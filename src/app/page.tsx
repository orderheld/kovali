import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Approach } from "@/components/sections/approach";
import { ArticleCard } from "@/components/sections/article-card";
import { Certifications } from "@/components/sections/certifications";
import { CtaBand } from "@/components/sections/cta-band";
import { Facts } from "@/components/sections/facts";
import { HomeHero } from "@/components/sections/home-hero";
import { IndustryCards } from "@/components/sections/industry-cards";
import { DiagonalAccent } from "@/components/sections/page-hero";
import { ServiceList } from "@/components/sections/service-list";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { competencies, reasons } from "@/content/company";
import { home } from "@/content/home";
import { articles } from "@/content/insights";
import { partner } from "@/content/partner";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "KOVALI | IT Consulting Schweiz für Business Analysis und Test",
  absoluteTitle: true,
  description:
    "IT Consulting in der Schweiz: KOVALI unterstützt Unternehmen und Verwaltungen mit Business Analysis, Requirements Engineering, Application Management und Test Management.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <Facts />

      <Section labelledBy="leistungen-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <SectionHeader
              id="leistungen-title"
              eyebrow={home.services.eyebrow}
              title={home.services.title}
              text={home.services.text}
            />
            <ButtonLink href="/leistungen" variant="secondary" arrow className="mt-9">
              Alle Leistungen
            </ButtonLink>
          </div>
          <div className="lg:col-span-7">
            <ServiceList />
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="vorgehen-title">
        <SectionHeader
          id="vorgehen-title"
          eyebrow={home.approach.eyebrow}
          title={home.approach.title}
          text={home.approach.text}
        />
        <div className="mt-14">
          <Approach />
        </div>
      </Section>

      <Section labelledBy="branchen-title">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader
            id="branchen-title"
            eyebrow={home.industries.eyebrow}
            title={home.industries.title}
            text={home.industries.text}
          />
          <ButtonLink href="/branchen" variant="text" arrow className="shrink-0">
            Branchen im Detail
          </ButtonLink>
        </div>
        <h3 id="branchen-praxis" className="mt-14 font-mono text-xs uppercase tracking-[0.12em] text-blue">
          Aus der Praxis
        </h3>
        <div className="mt-5">
          <IndustryCards kind="experience" label={false} headingLevel="h4" labelledBy="branchen-praxis" />
        </div>
        <h3 id="branchen-zielmaerkte" className="mt-12 font-mono text-xs uppercase tracking-[0.12em] text-slate">
          Weitere Zielmärkte
        </h3>
        <div className="mt-5">
          <IndustryCards kind="target" label={false} headingLevel="h4" labelledBy="branchen-zielmaerkte" />
        </div>
      </Section>

      <Section tone="mist" labelledBy="kompetenzen-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-4">
            <SectionHeader id="kompetenzen-title" eyebrow={home.competencies.eyebrow} title={home.competencies.title} />
          </div>
          <dl className="divide-y divide-line border-y border-line lg:col-span-8">
            {competencies.map((c) => (
              <div key={c.group} className="grid gap-3 py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
                <dt className="font-semibold text-ink">{c.group}</dt>
                <dd>
                  <ul className="flex flex-wrap gap-2">
                    {c.items.map((item) => (
                      <li key={item} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink">
                        {item}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section labelledBy="warum-title">
        <SectionHeader id="warum-title" eyebrow={home.reasons.eyebrow} title={home.reasons.title} />
        <ul className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => (
            <li key={r.title} className="border-t-2 border-navy pt-6">
              <span className="font-mono text-xs text-blue">0{i + 1}</span>
              <h3 className="mt-3 text-h3 font-semibold">{r.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{r.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-20 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="eyebrow">{home.certifications.eyebrow}</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">{home.certifications.title}</h3>
          </div>
          <div className="lg:col-span-8">
            <Certifications headingLevel="h4" />
          </div>
        </div>
      </Section>

      <section aria-labelledby="partner-title" className="on-dark relative overflow-hidden bg-navy-800 text-white">
        <DiagonalAccent tone="dark" className="absolute -left-24 top-0 hidden h-full -scale-x-100 opacity-70 lg:block" />
        <div className="relative mx-auto grid w-full max-w-site gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <SectionHeader id="partner-title" eyebrow={home.partner.eyebrow} title={home.partner.title} text={home.partner.text} />
            <ButtonLink href={home.partner.cta.href} variant="inverse" arrow className="mt-9">
              {home.partner.cta.label}
            </ButtonLink>
          </div>
          <ul className="grid content-start gap-x-8 gap-y-4 sm:grid-cols-2 lg:col-span-5 lg:col-start-8">
            {partner.roles.map((role) => (
              <li key={role.title} className="flex gap-3 border-b border-white/10 pb-4 text-white/85">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-electric" />
                {role.title}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section labelledBy="insights-title">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeader id="insights-title" eyebrow={home.insights.eyebrow} title={home.insights.title} />
          <Link href="/insights" className="inline-flex shrink-0 items-center gap-2 font-medium text-blue hover:text-blue-700">
            Alle Beiträge <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {articles.slice(0, 3).map((a) => (
            <li key={a.slug}>
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
