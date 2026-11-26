import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceExample } from "@/components/examples/artefacts";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonChevron, ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { ToolsGrid } from "@/components/sections/tools-grid";
import { getService, serviceHref, services } from "@/content/services";
import { toolGroupsFor } from "@/content/tools";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import { cardFocus, cn } from "@/lib/utils";

/**
 * Every service page is prerendered from generateStaticParams. A navigation may wait for the
 * page instead of showing an empty fallback while `params` resolves (as on insights/[slug]).
 */
export const instant = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/leistungen/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return pageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: serviceHref(service.slug),
  });
}

/** Bullet list of the site: small grey dots. */
function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-graphite">
          <span aria-hidden className="mt-[0.65em] size-1 shrink-0 rounded-full bg-muted" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * One service: page header with an example artefact, intro with tasks and results, the tools
 * of the discipline, FAQ, links to the other services, closing panel with the service's own
 * call to action.
 */
export default async function ServicePage({ params }: PageProps<"/leistungen/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const path = serviceHref(service.slug);
  const others = services.filter((s) => s.slug !== service.slug);
  const contactHref = `/kontakt?leistung=${service.slug}`;

  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
          { name: service.name, path },
        ]}
        kicker={service.name}
        title={service.h1}
        lead={service.summary}
        aside={<ServiceExample slug={service.slug} />}
        size="title"
      >
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <ButtonLink href={contactHref}>{service.cta}</ButtonLink>
          <ButtonLink href="/leistungen" variant="link">
            Alle Leistungen
          </ButtonLink>
        </div>
      </PageBanner>

      <Section tone="canvas" labelledBy="ueberblick-title" space="loose">
        <SectionHeader id="ueberblick-title" kicker="Überblick" title={service.tasksTitle} text={service.intro} />
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-7 sm:p-10">
            <h3 className="text-h3 text-graphite">
              Aufgaben
            </h3>
            <div className="mt-6">
              <Bullets items={service.tasks} />
            </div>
          </div>
          <div className="rounded-3xl bg-white p-7 sm:p-10">
            <h3 className="text-h3 text-graphite">
              Was Sie von uns erhalten
            </h3>
            <div className="mt-6">
              <Bullets items={service.deliverables} />
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="werkzeuge-title" space="loose">
        <SectionHeader
          id="werkzeuge-title"
          kicker="Werkzeuge"
          title="Womit wir arbeiten"
          text="Wir arbeiten in den Werkzeugen, die in Ihrem Projekt im Einsatz sind, zum Beispiel:"
        />
        <ToolsGrid className="mt-14" groups={toolGroupsFor(service.slug)} showMethods={service.slug === "business-analysis"} />
      </Section>

      <Section tone="canvas" labelledBy="faq-title" space="loose">
        <SectionHeader id="faq-title" kicker="FAQ" title={service.faqTitle} />
        <div className="mt-12 max-w-4xl">
          <Faq items={service.faq} />
        </div>
      </Section>

      <Section labelledBy="weitere-title" space="loose">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader id="weitere-title" kicker="Leistungen" title="Weitere Leistungen" />
          <ButtonLink href="/leistungen" variant="link" className="shrink-0 self-start md:self-auto">
            Alle Leistungen
          </ButtonLink>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {others.map((s) => (
            <li
              key={s.slug}
              className={cn(
                "group relative flex flex-col rounded-3xl bg-canvas p-7 transition-colors duration-200 hover:bg-canvas-hover",
                cardFocus,
              )}
            >
              <ServiceIcon slug={s.slug} className="size-8" />
              <h3 className="mt-6 text-h3 text-graphite">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-3xl">
                  {s.name}
                </Link>
              </h3>
              <p aria-hidden className="mt-auto flex items-center gap-1 pt-6 text-[1.0625rem] text-blue">
                Mehr erfahren
                <ButtonChevron />
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title={service.ctaTitle} primary={{ label: service.cta, href: contactHref }} />

      <JsonLd data={[serviceJsonLd(service, path), faqJsonLd(service.faq)]} />
    </>
  );
}
