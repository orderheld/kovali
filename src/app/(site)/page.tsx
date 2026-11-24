import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { ServiceIcon } from "@/components/sections/service-icon";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { about } from "@/content/about";
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

/** "01", "02", … for the mono numbering of sections and cards. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Home: dark hero with the 3D image, introduction, the four services on dark, how we work,
 * the team roles, the latest articles and the closing panel.
 */
export default function HomePage() {
  const { hero, intro, strengths, services: servicesBlock, insights } = home;
  const { team } = about;

  return (
    <>
      <section aria-labelledby="hero-title" className="on-dark relative isolate overflow-hidden bg-night text-white">
        {/* Small screens: the image as a band at the top, the text below it. Wide screens: the image
            on the right behind the text. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-20 h-[19rem] sm:h-[24rem] md:h-[30rem] lg:inset-y-0 lg:left-auto lg:h-auto lg:w-[72%]"
        >
          <Image
            src={scenes.hero}
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 72vw, 100vw"
            placeholder="blur"
            className="object-cover object-[85%_50%] lg:object-[70%_50%]"
          />
        </div>
        {/* Dark behind the text: from the left on wide screens, below the image band on small ones. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[19rem] bg-[linear-gradient(180deg,rgb(6_11_24/0)_0%,rgb(6_11_24/0.15)_45%,var(--color-night)_100%)] sm:h-[24rem] md:h-[30rem] lg:inset-y-0 lg:h-auto lg:bg-[linear-gradient(90deg,var(--color-night)_0%,rgb(6_11_24/0.9)_32%,rgb(6_11_24/0.2)_62%,rgb(6_11_24/0)_100%)]"
        />
        <Container className="flex flex-col justify-end pb-16 pt-[15rem] sm:pt-[19rem] md:pt-[23rem] lg:min-h-[calc(100svh-8rem)] lg:max-h-[50rem] lg:justify-center lg:pb-20 lg:pt-28">
          <p className="kicker kv-rise">IT Consulting · Schweiz</p>
          <h1 id="hero-title" className="kv-rise mt-6 max-w-[16ch] text-hero font-semibold text-white [--kv-delay:0.04s]">
            {hero.title}
          </h1>
          <p className="kv-rise mt-7 max-w-xl text-display text-white/75 [--kv-delay:0.08s]">{hero.lead}</p>
          <div className="kv-rise mt-10 flex flex-wrap gap-3 [--kv-delay:0.12s]">
            <ButtonLink href={hero.primary.href} variant="light">
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink href={servicesBlock.link.href} variant="ghost" arrow={false}>
              {servicesBlock.kicker}
            </ButtonLink>
          </div>
        </Container>
        <div className="border-t border-white/[0.08]">
          <Container>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2 py-5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-white/55 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s, i) => (
                <li key={s.slug}>
                  <span aria-hidden className="mr-2 text-sky">
                    {nr(i)}
                  </span>
                  {s.name}
                </li>
              ))}
            </ul>
          </Container>
        </div>
      </section>

      <Section labelledBy="intro-title" space="loose">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="kicker">01 / Unternehmen</p>
            <h2 id="intro-title" className="mt-5 text-h2 text-night">
              {intro.title}
            </h2>
          </div>
          <div className="lg:col-span-7">
            {intro.paragraphs.map((p) => (
              <p key={p} className="mt-6 text-lead text-slate first:mt-0">
                {p}
              </p>
            ))}
            <ButtonLink href={intro.link.href} variant="outline" className="mt-10">
              {intro.link.label}
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section tone="night" labelledBy="leistungen-title" space="loose">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="leistungen-title" kicker={`02 / ${servicesBlock.kicker}`} title={servicesBlock.title} />
          <ButtonLink href={servicesBlock.link.href} variant="ghost" className="shrink-0 self-start md:self-auto">
            {servicesBlock.link.label}
          </ButtonLink>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <div className="relative min-h-[18rem] overflow-hidden rounded-2xl border border-white/[0.08] lg:min-h-0">
            <Image
              src={scenes.intro}
              alt=""
              fill
              sizes="(min-width: 1024px) 24rem, 92vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {services.map((s, i) => (
              <li
                key={s.slug}
                className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-colors hover:border-electric/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <ServiceIcon slug={s.slug} className="text-electric" />
                  <span aria-hidden className="font-mono text-xs text-white/55">
                    {nr(i)}
                  </span>
                </div>
                <h3 className="mt-8 text-h3 text-white">
                  <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-2xl">
                    {s.name}
                  </Link>
                </h3>
                <p className="mt-3 leading-relaxed text-white/65">{s.summary}</p>
                <div className="mt-auto pt-6">
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 text-white/55 transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-electric"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="staerken-title" space="loose">
        <SectionHeader id="staerken-title" kicker="03 / Arbeitsweise" title={strengths.title} />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {strengths.items.map((item, i) => (
            <li key={item.title} className="border-t border-night pt-6">
              <span aria-hidden className="font-mono text-sm text-blue">
                {nr(i)}
              </span>
              <h3 className="mt-4 text-h3 text-night">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{item.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="mist" labelledBy="team-title" space="loose">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeader id="team-title" kicker={`04 / ${team.kicker}`} title={team.title} text={team.text} />
            <ButtonLink href={strengths.link.href} variant="outline" className="mt-8">
              {strengths.link.label}
            </ButtonLink>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
            {team.roles.map((role, i) => (
              <li key={role.id} className="flex flex-col rounded-2xl border border-line bg-white p-6">
                <span aria-hidden className="font-mono text-xs text-blue">
                  {nr(i)}
                </span>
                <h3 className="mt-6 text-lg font-medium leading-snug tracking-[-0.01em] text-night">{role.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-slate">{role.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="insights-title" space="loose">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="insights-title" kicker={`05 / ${insights.kicker}`} title={insights.title} text={insights.text} />
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
