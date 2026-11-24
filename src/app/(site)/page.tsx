import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { HomeHero } from "@/components/sections/home-hero";
import { PersonBlock } from "@/components/sections/person-block";
import { ServiceList } from "@/components/sections/service-list";
import { WorkSamples } from "@/components/sections/work-samples";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { home } from "@/content/home";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "KOVALI | IT Consulting Schweiz für Business Analysis und Test",
  absoluteTitle: true,
  description:
    "IT Consulting in der Schweiz: KOVALI übernimmt Business Analysis, Requirements Engineering, Testmanagement und Application Management in IT-Projekten.",
  path: "/",
});

/**
 * Home: 7 blocks (spec 3.1). Tones: night hero, white person block, cloud IT Consulting,
 * night work samples, white reasons, cloud partner block with a blue rule, night CTA into the
 * footer. Only the closing CTA band carries the arm lines.
 */
export default function HomePage() {
  const { services, reasons, partnerBand } = home;

  return (
    <>
      <HomeHero />

      <PersonBlock id="ferhat-demir" />

      <Section tone="cloud" labelledBy="it-consulting-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <SectionHeader id="it-consulting-title" title={services.title} text={services.text} />
            <ButtonLink href={services.overview.href} variant="secondary" arrow className="mt-9">
              {services.overview.label}
            </ButtonLink>
          </div>
          <div className="lg:col-span-7">
            <ServiceList umbrella />
          </div>
        </div>
      </Section>

      <WorkSamples />

      <Section labelledBy="warum-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="warum-title" title={reasons.title} />
          </div>
          <div className="lg:col-span-8">
            <ul className="border-b border-line">
              {reasons.items.map((r, i) => (
                <li
                  key={r.title}
                  className="grid gap-2 border-t border-line py-8 sm:grid-cols-[3rem_14rem_1fr] sm:gap-x-6"
                >
                  <span aria-hidden className="font-mono text-xs leading-7 text-blue">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-h3 font-semibold">{r.title}</h3>
                  <p className="leading-relaxed text-slate">{r.text}</p>
                </li>
              ))}
            </ul>
            <Link
              href={reasons.link.href}
              className="group mt-8 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              {reasons.link.label}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Section>

      <Section tone="cloud" space="tight" labelledBy="partner-band-title">
        <div className="grid gap-8 border-l-2 border-blue pl-6 sm:pl-8 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2
              id="partner-band-title"
              className="max-w-3xl text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink md:text-[2.125rem]"
            >
              {partnerBand.title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate">{partnerBand.text}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-4 lg:justify-end">
            <ButtonLink href={partnerBand.primary.href} arrow>
              {partnerBand.primary.label}
            </ButtonLink>
            <Link
              href={partnerBand.secondary.href}
              className="font-medium text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue"
            >
              {partnerBand.secondary.label}
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
