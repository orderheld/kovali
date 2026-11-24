import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Layers, UserRound } from "lucide-react";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { ServiceIcon } from "@/components/sections/service-icon";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { home } from "@/content/home";
import { articles } from "@/content/insights";
import { scenes } from "@/content/scenes";
import { serviceHref, services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `${site.brand} | IT Consulting Schweiz für Business Analysis und Test`,
  absoluteTitle: true,
  description: `IT Consulting in der Schweiz: ${site.brand} übernimmt Business Analysis, Requirements Engineering, Testmanagement und Test Engineering in IT-Projekten.`,
  path: "/",
});

const strengthIcons = [ClipboardCheck, Layers, UserRound];

/**
 * Home: hero panorama, introduction with image, three strengths on navy, the four services,
 * the latest articles and the closing band.
 */
export default function HomePage() {
  const { hero, intro, strengths, services: servicesBlock, insights } = home;

  return (
    <>
      <section aria-labelledby="hero-title" className="on-dark relative isolate overflow-hidden bg-night text-white">
        <Image
          src={scenes.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="-z-20 object-cover object-[62%_50%]"
        />
        {/* Darker on the left, where the text sits. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(2_5_12/0.7)_0%,rgb(2_5_12/0.35)_45%,rgb(2_5_12/0)_75%)]" />
        <Container className="flex min-h-[34rem] flex-col justify-center py-24 md:min-h-[40rem] lg:min-h-[calc(100svh-5rem)] lg:max-h-[52rem]">
          <h1 id="hero-title" className="kv-rise max-w-3xl text-[1.25rem] font-semibold uppercase leading-snug tracking-[0.06em] text-white hyphens-manual min-[400px]:text-[1.375rem] sm:text-[1.625rem] md:text-[1.875rem]">
            {hero.title}
          </h1>
          <p className="kv-rise mt-5 max-w-2xl text-display text-white/85 [--kv-delay:0.06s]">{hero.lead}</p>
          <div className="kv-rise mt-10 [--kv-delay:0.12s]">
            <ButtonLink href={hero.primary.href} variant="accent">
              {hero.primary.label}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section labelledBy="intro-title" space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h2 id="intro-title" className="text-h2 text-navy">
              {site.brand}
            </h2>
            {intro.paragraphs.map((p) => (
              <p key={p} className="mt-6 text-lead text-slate">
                {p}
              </p>
            ))}
            <ButtonLink href={intro.link.href} variant="outline" className="mt-10">
              {intro.link.label}
            </ButtonLink>
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={scenes.intro}
                alt=""
                fill
                sizes="(min-width: 1024px) 36rem, 92vw"
                placeholder="blur"
                className="object-cover object-[60%_60%]"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section tone="navy" labelledBy="staerken-title">
        <h2 id="staerken-title" className="sr-only">
          {strengths.title}
        </h2>
        <ul className="grid gap-12 md:grid-cols-3 md:gap-10">
          {strengths.items.map((item, i) => {
            const Icon = strengthIcons[i];
            return (
              <li key={item.title}>
                <Icon aria-hidden strokeWidth={1.25} className="size-11 text-electric" />
                <h3 className="mt-6 text-h3 text-white">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-white/75">{item.text}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-14 flex justify-center">
          <ButtonLink href={strengths.link.href} variant="accent">
            {strengths.link.label}
          </ButtonLink>
        </div>
      </Section>

      <Section tone="cloud" labelledBy="leistungen-title">
        <SectionHeader id="leistungen-title" kicker={servicesBlock.kicker} title={servicesBlock.title} align="center" />
        <ul className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.slug} className="group relative flex flex-col items-center text-center">
              <ServiceIcon slug={s.slug} />
              <h3 className="mt-6 text-h3 text-navy">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 group-hover:text-blue">
                  {s.name}
                </Link>
              </h3>
              <p className="mt-3 max-w-md leading-relaxed text-slate">{s.summary}</p>
            </li>
          ))}
        </ul>
        <div className="mt-16 flex justify-center">
          <ButtonLink href={servicesBlock.link.href}>{servicesBlock.link.label}</ButtonLink>
        </div>
      </Section>

      <Section labelledBy="insights-title">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="insights-title" kicker={insights.kicker} title={insights.title} text={insights.text} />
          <Link
            href={insights.link.href}
            className="group inline-flex shrink-0 items-center gap-2 font-medium text-blue hover:text-blue-700"
          >
            {insights.link.label}
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
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
