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

/** Home: 7 blocks (spec 3.1). Tones: paper, white, white (rule), paper, white, navy-800, paper. */
export default function HomePage() {
  const { services, reasons, specialistsBand } = home;

  return (
    <>
      <HomeHero />

      <PersonBlock id="ferhat-demir" />

      <Section rule labelledBy="it-consulting-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="self-start lg:sticky lg:top-28 lg:col-span-5">
            <SectionHeader id="it-consulting-title" title={services.title} text={services.text} />
            <ButtonLink href={services.overview.href} variant="secondary" className="mt-8 border-field">
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
              {reasons.items.map((r) => (
                <li key={r.title} className="grid gap-2 border-t border-line py-7 sm:grid-cols-[15rem_1fr] sm:gap-8">
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

      <Section tone="navy" space="tight" className="bg-navy-800" labelledBy="fachleute-band-title">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2 id="fachleute-band-title" className="max-w-3xl text-2xl font-medium leading-snug md:text-[1.75rem]">
              {specialistsBand.title}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/75">{specialistsBand.text}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-4 lg:justify-end">
            <ButtonLink href={specialistsBand.primary.href} variant="inverse" arrow>
              {specialistsBand.primary.label}
            </ButtonLink>
            <Link
              href={specialistsBand.secondary.href}
              className="font-medium text-white/85 underline-offset-4 hover:text-white hover:underline"
            >
              {specialistsBand.secondary.label}
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
