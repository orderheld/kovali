import Link from "next/link";
import { TraceabilityExample } from "@/components/examples/artefacts";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { Portrait } from "@/components/sections/portrait";
import { RoleIcon } from "@/components/sections/role-icon";
import { ServiceIcon } from "@/components/sections/service-icon";
import { ToolsGrid } from "@/components/sections/tools-grid";
import { ButtonChevron, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { about } from "@/content/about";
import { certifications, founder } from "@/content/company";
import { home } from "@/content/home";
import { articles } from "@/content/insights";
import { serviceHref, services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";
import { cardFocus, cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: home.meta.title,
  absoluteTitle: true,
  description: home.meta.description,
  path: "/",
});

/** How many tasks each service card lists (the most important come first). */
const TASKS_SHOWN = 4;

/**
 * Home (design v3): centred hero on white with an example artefact, the four activities of
 * Requirements Engineering, the services, how we work, the tools, the team, the latest
 * articles and the closing panel. White and canvas sections alternate.
 */
export default function HomePage() {
  const { hero, requirements, services: servicesBlock, strengths, tools, insights } = home;
  const { team } = about;

  return (
    <>
      <section aria-labelledby="hero-title" className="overflow-hidden bg-white">
        <Container className="pb-20 pt-16 text-center sm:pt-20 md:pb-28 md:pt-28">
          <p className="kicker kv-rise">{hero.kicker}</p>
          <h1
            id="hero-title"
            className="kv-rise mx-auto mt-5 max-w-5xl text-balance text-hero text-graphite [--kv-delay:0.04s]"
          >
            {hero.title}
          </h1>
          <p className="kv-rise mx-auto mt-7 max-w-2xl text-lead text-muted [--kv-delay:0.08s]">{hero.lead}</p>
          <div className="kv-rise mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 [--kv-delay:0.12s]">
            <ButtonLink href={hero.primary.href}>{hero.primary.label}</ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="link">
              {hero.secondary.label}
            </ButtonLink>
          </div>
          <TraceabilityExample className="kv-rise mt-16 [--kv-delay:0.18s] md:mt-20" />
        </Container>
      </section>

      <Section tone="canvas" labelledBy="re-title" space="loose">
        <SectionHeader id="re-title" kicker={requirements.kicker} title={requirements.title} text={requirements.text} />
        <ol className="mt-14 grid gap-4 md:grid-cols-2">
          {requirements.activities.map((a, i) => (
            <li key={a.title} className="flex flex-col rounded-3xl bg-white p-7 sm:p-9">
              <span aria-hidden className="text-[0.875rem] font-semibold tabular-nums text-blue">
                {i + 1}
              </span>
              <h3 className="mt-3 text-h3 text-graphite">{a.title}</h3>
              <p className="mt-3 text-muted">{a.text}</p>
              <ul className="mt-auto flex flex-wrap gap-2 pt-6" aria-label="Ergebnisse">
                {a.results.map((r) => (
                  <li key={r} className="rounded-full bg-canvas px-3 py-1 text-[0.8125rem] text-graphite">
                    {r}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <ButtonLink href={requirements.link.href} variant="link" className="mt-10">
          {requirements.link.label}
        </ButtonLink>
      </Section>

      <Section labelledBy="leistungen-title" space="loose">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="leistungen-title" kicker={servicesBlock.kicker} title={servicesBlock.title} />
          <ButtonLink href={servicesBlock.link.href} variant="link" className="shrink-0 self-start md:self-auto">
            {servicesBlock.link.label}
          </ButtonLink>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <li
              key={s.slug}
              className={cn(
                // From md the two cards of a row share their row lines (subgrid), so summaries, lists and links line up.
                "group relative flex flex-col rounded-3xl bg-canvas p-7 transition-colors duration-200 hover:bg-canvas-hover sm:p-9 md:row-span-5 md:grid md:grid-rows-subgrid md:gap-y-0",
                cardFocus,
              )}
            >
              <ServiceIcon slug={s.slug} className="size-9" />
              <h3 className="mt-7 text-[1.5rem] font-semibold leading-tight tracking-[-0.022em] text-graphite">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-3xl">
                  {s.name}
                </Link>
              </h3>
              <p className="mt-3 text-muted">{s.summary}</p>
              <ul className="mt-6 grid gap-y-2 border-t border-hairline pt-6 text-[0.9375rem] text-graphite">
                {s.tasks.slice(0, TASKS_SHOWN).map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-muted" />
                    {t}
                  </li>
                ))}
              </ul>
              <p aria-hidden className="mt-auto flex items-center gap-1 pt-7 text-[1.0625rem] text-blue">
                Mehr erfahren
                <ButtonChevron />
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="canvas" labelledBy="staerken-title" space="loose">
        <SectionHeader id="staerken-title" kicker={strengths.kicker} title={strengths.title} />
        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {strengths.items.map((item) => (
            <li key={item.title} className="rounded-3xl bg-white p-7 sm:p-8">
              <h3 className="text-h3 text-graphite">{item.title}</h3>
              <p className="mt-3 text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="werkzeuge-title" space="loose">
        <SectionHeader id="werkzeuge-title" kicker={tools.kicker} title={tools.title} text={tools.text} />
        <ToolsGrid className="mt-14" />
      </Section>

      <Section tone="canvas" labelledBy="team-title" space="loose">
        <SectionHeader id="team-title" kicker={team.kicker} title={team.title} text={team.text} />
        <div className="mt-14 grid gap-4">
          <div className="grid gap-8 rounded-3xl bg-white p-7 sm:grid-cols-[14rem_1fr] sm:items-center sm:p-8 lg:grid-cols-[18rem_1fr] lg:gap-12">
            <Portrait size="lg" caption={false} sizes="(min-width: 1024px) 18rem, (min-width: 640px) 14rem, 90vw" />
            <div>
              <p className="kicker">Geschäftsführung</p>
              <p className="mt-2 text-h3 font-semibold text-graphite">{founder.name}</p>
              <p className="text-muted">{founder.role}</p>
              <p className="mt-5 max-w-xl text-muted">
                {founder.name} arbeitet {founder.experienceLine}. Er ist nach{" "}
                {certifications.map((c) => c.short).join(" und ")} zertifiziert.
              </p>
              <ButtonLink href={home.team.link.href} variant="link" className="mt-5">
                {home.team.link.label}
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-4 lg:grid-cols-3">
            {team.roles.map((role, i) => (
              <li key={role.id} className="rounded-3xl bg-white p-7">
                <RoleIcon index={i} />
                <h3 className="mt-6 text-h3 text-graphite">{role.title}</h3>
                <p className="mt-3 text-muted">{role.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="insights-title" space="loose">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="insights-title" kicker={insights.kicker} title={insights.title} text={insights.text} />
          <ButtonLink href={insights.link.href} variant="link" className="shrink-0 self-start md:self-auto">
            {insights.link.label}
          </ButtonLink>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
