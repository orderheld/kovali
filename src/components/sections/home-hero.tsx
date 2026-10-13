import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { home } from "@/content/home";
import { HeroVisual } from "./hero-visual";

export function HomeHero() {
  const { hero } = home;
  return (
    <section aria-labelledby="hero-title" className="on-dark relative overflow-hidden bg-navy text-white">
      <div
        aria-hidden
        className="grid-lines absolute inset-0 opacity-[0.06] [--grid-color:#ffffff] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]"
      />
      <div
        aria-hidden
        className="absolute -right-40 -top-40 size-[36rem] rounded-full bg-blue/25 blur-[120px]"
      />
      <Container className="relative grid items-center gap-14 pb-20 pt-16 md:pb-24 md:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="eyebrow kv-rise">{hero.eyebrow}</p>
          <h1 id="hero-title" className="kv-rise mt-6 text-display font-semibold [--kv-delay:0.05s]">
            {hero.title}
          </h1>
          <p className="kv-rise mt-7 max-w-xl text-lead text-white/75 [--kv-delay:0.12s]">{hero.lead}</p>
          <div className="kv-rise mt-10 flex flex-wrap gap-3 [--kv-delay:0.18s]">
            <ButtonLink href={hero.primary.href} variant="inverse" arrow>
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="outline-inverse">
              {hero.secondary.label}
            </ButtonLink>
          </div>
        </div>
        <div className="hidden md:block lg:col-span-6">
          <HeroVisual className="mx-auto w-full max-w-[40rem]" />
        </div>
      </Container>
    </section>
  );
}
