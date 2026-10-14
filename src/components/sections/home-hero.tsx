import Link from "next/link";
import { StoryCard } from "@/components/artifacts/story-card";
import { TestRunCard } from "@/components/artifacts/test-run-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { founder } from "@/content/company";
import { home } from "@/content/home";
import { serviceHref, services } from "@/content/services";
import { Portrait } from "./portrait";

/**
 * Home hero on paper: kicker, H1 and lead that say what KOVALI does, the four disciplines
 * as plain links, Ferhat Demir's byline and the buttons. On the right an example user story;
 * from lg the test run overlaps it. Each text item rises in once, staggered (kv-rise).
 */
export function HomeHero() {
  const { hero } = home;
  return (
    <section aria-labelledby="hero-title" className="border-b border-paper-line bg-paper">
      <Container className="grid gap-12 pb-16 pt-14 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="eyebrow kv-rise">{hero.kicker}</p>
          <h1 id="hero-title" className="kv-rise mt-5 text-h1 font-medium text-ink [--kv-delay:0.05s]">
            {hero.title}
          </h1>
          <p className="kv-rise mt-6 max-w-xl text-lead text-slate [--kv-delay:0.1s]">{hero.lead}</p>

          <ul
            aria-label={hero.disciplinesLabel}
            className="kv-rise mt-8 grid max-w-xl grid-cols-2 gap-x-6 [--kv-delay:0.15s]"
          >
            {services.map((s) => (
              <li key={s.slug} className="border-t border-paper-line">
                <Link
                  href={serviceHref(s.slug)}
                  className="block py-3 text-[0.9375rem] font-medium leading-snug text-ink underline-offset-4 hover:text-blue hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="kv-rise mt-8 flex max-w-xl items-center gap-3.5 border-t border-paper-line pt-6 [--kv-delay:0.2s]">
            <Portrait size="avatar" />
            <p className="text-[0.9375rem] leading-snug text-slate">
              <span className="font-semibold text-ink">{founder.name}</span>, {founder.role} ·{" "}
              <span className="whitespace-nowrap">{hero.byline}</span>
            </p>
          </div>

          <div className="kv-rise mt-8 flex flex-wrap gap-3 [--kv-delay:0.25s]">
            <ButtonLink href={hero.primary.href} arrow>
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="secondary" className="border-field bg-transparent">
              {hero.secondary.label}
            </ButtonLink>
          </div>
        </div>

        <div className="kv-rise relative min-w-0 [--kv-delay:0.2s] lg:col-span-6">
          <StoryCard overlap className="w-full md:max-w-xl lg:max-w-[30rem]" />
          <TestRunCard className="relative hidden lg:-mt-10 lg:ml-auto lg:block lg:w-[23rem]" />
        </div>
      </Container>
    </section>
  );
}
