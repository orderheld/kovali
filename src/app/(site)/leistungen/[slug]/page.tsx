import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { getService, serviceHref, services } from "@/content/services";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

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

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="relative pl-6 leading-relaxed text-slate before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-blue"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * One service: banner, SEO heading with intro, tasks and results, FAQ, links to the other
 * services, closing band.
 */
export default async function ServicePage({ params }: PageProps<"/leistungen/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const path = serviceHref(service.slug);
  const others = services.filter((s) => s.slug !== service.slug);

  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
          { name: service.name, path },
        ]}
        scene="leistungen"
        kicker="Leistungen"
        title={service.name}
      />

      <Section labelledBy="einleitung-title">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <h2 id="einleitung-title" className="text-h2 text-navy hyphens-manual lg:col-span-6">
            {service.h1}
          </h2>
          <p className="text-lead text-slate lg:col-span-6">{service.intro}</p>
        </div>
      </Section>

      <Section tone="cloud" labelledBy="aufgaben-title">
        {/* Subgrid from md: both headings share the first row, so both lists start at the same height. */}
        <div className="grid gap-16 md:grid-cols-2 md:grid-rows-[auto_auto] md:gap-x-16 md:gap-y-0 lg:gap-x-24">
          <div className="md:row-span-2 md:grid md:grid-rows-subgrid">
            <h2 id="aufgaben-title" className="text-h3 text-navy">
              {service.tasksTitle}
            </h2>
            <div className="mt-8">
              <Bullets items={service.tasks} />
            </div>
          </div>
          <div className="md:row-span-2 md:grid md:grid-rows-subgrid">
            <h2 id="ergebnisse-title" className="text-h3 text-navy">
              Ergebnisse
            </h2>
            <div className="mt-8">
              <Bullets items={service.deliverables} />
            </div>
          </div>
        </div>
      </Section>

      <Section labelledBy="faq-title">
        <SectionHeader id="faq-title" title={service.faqTitle} align="center" />
        <div className="mx-auto mt-12 max-w-3xl md:mt-14">
          <Faq items={service.faq} />
        </div>
      </Section>

      <Section tone="cloud" space="tight" labelledBy="weitere-title">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-8">
          <h2 id="weitere-title" className="text-h3 text-navy lg:col-span-3">
            Weitere Leistungen
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8 lg:col-span-9">
            {others.map((s) => (
              <li key={s.slug}>
                <Link href={serviceHref(s.slug)} className="group flex items-center gap-4 font-medium text-navy hover:text-blue">
                  <ServiceIcon slug={s.slug} className="size-8 shrink-0" />
                  <span className="leading-snug underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-current">
                    {s.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand
        title={service.ctaTitle}
        primary={{ label: service.cta, href: `/kontakt?leistung=${service.slug}` }}
      />

      <JsonLd data={[serviceJsonLd(service, path), faqJsonLd(service.faq)]} />
    </>
  );
}
