import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StoryCard } from "@/components/artifacts/story-card";
import { TestRunCard } from "@/components/artifacts/test-run-card";
import { DarkBackdrop } from "@/components/brand/motifs";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { founder } from "@/content/company";
import { home } from "@/content/home";
import { serviceHref, services } from "@/content/services";
import { Portrait } from "./portrait";

/**
 * Home hero on near-black ink with grid and blue glow: mono kicker, H1 and lead that say what
 * KOVALI does, the buttons (above the fold on laptop screens), the four disciplines as indexed
 * links and Ferhat Demir's byline with a small avatar. On the right an example user story; from
 * lg the test run overlaps it. Text rises into place once (kv-rise, transform only). Below sm the
 * buttons are full width.
 */
export function HomeHero() {
  const { hero } = home;
  return (
    <section aria-labelledby="hero-title" className="on-dark relative isolate overflow-hidden bg-night text-white">
      <DarkBackdrop variant="hero" />
      <Container className="relative grid gap-14 pb-20 pt-14 md:pt-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-24 lg:pt-16">
        <div className="lg:col-span-6">
          <p className="eyebrow kv-rise">{hero.kicker}</p>
          <h1 id="hero-title" className="kv-rise mt-6 text-h1 font-semibold text-white [--kv-delay:0.04s]">
            {hero.title}
          </h1>
          <p className="kv-rise mt-6 max-w-xl text-lead text-white/70 [--kv-delay:0.08s]">{hero.lead}</p>

          <div className="kv-rise mt-9 grid gap-3 sm:flex sm:flex-wrap [--kv-delay:0.12s]">
            <ButtonLink href={hero.primary.href} variant="inverse" arrow>
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="outline-inverse">
              {hero.secondary.label}
            </ButtonLink>
          </div>

          <ul
            aria-label={hero.disciplinesLabel}
            className="kv-rise mt-12 grid max-w-xl gap-x-6 border-b border-white/10 sm:grid-cols-2 [--kv-delay:0.16s]"
          >
            {services.map((s, i) => (
              <li key={s.slug} className="border-t border-white/10">
                <Link
                  href={serviceHref(s.slug)}
                  className="group flex h-full items-start gap-3 py-3.5 text-[0.9375rem] font-medium leading-snug text-white/90 transition-colors hover:text-electric"
                >
                  <span aria-hidden className="pt-0.5 font-mono text-[0.6875rem] text-sky/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{s.name}</span>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-white/35 transition-[color,translate] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-electric"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="kv-rise mt-8 flex max-w-xl items-center gap-3.5 [--kv-delay:0.2s]">
            <Portrait size="avatar" eager />
            <p className="text-[0.9375rem] leading-snug text-white/70">
              <span className="font-semibold text-white">{founder.name}</span>, {founder.role} ·{" "}
              <span className="whitespace-nowrap">{hero.byline}</span>
            </p>
          </div>
        </div>

        <div className="kv-rise relative min-w-0 [--kv-delay:0.18s] lg:col-span-6">
          {/* Electric glow under the artefacts. */}
          <div
            aria-hidden
            className="kv-glow absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(53_169_255/0.2)_0%,rgb(20_91_206/0.14)_35%,transparent_65%)]"
          />
          <StoryCard overlap className="relative w-full md:max-w-xl lg:max-w-[30rem]" />
          <TestRunCard className="relative hidden lg:-mt-10 lg:ml-auto lg:block lg:w-[23rem]" />
        </div>
      </Container>
    </section>
  );
}
