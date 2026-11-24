import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section } from "@/components/ui/section";
import { getService, serviceHref, services } from "@/content/services";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

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

/** "01", "02", … for the mono numbering of sections and services. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

/** Bullet list of the site; `dark` for the night panel. */
function Bullets({ items, dark = false }: { items: readonly string[]; dark?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "relative pl-6 leading-relaxed before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3",
            dark ? "text-white/75 before:bg-electric" : "text-slate before:bg-blue",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * One service: banner, SEO heading with intro, tasks and results as two panels, FAQ, links to
 * the other services, closing panel with the service's own call to action.
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
        title={service.h1}
        size="lg"
      />

      <Section labelledBy="einleitung-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="kicker">01 / Überblick</p>
            <h2 id="einleitung-title" className="mt-5 text-h2 text-night">
              {service.name}
            </h2>
          </div>
          <p className="text-lead text-slate lg:col-span-7 lg:pt-9">{service.intro}</p>
        </div>
      </Section>

      <Section tone="mist">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section
            aria-labelledby="aufgaben-title"
            className="rounded-3xl border border-line bg-white p-7 sm:p-10 lg:p-12"
          >
            <p className="kicker">02 / Aufgaben</p>
            <h2 id="aufgaben-title" className="mt-5 text-h3 text-night">
              {service.tasksTitle}
            </h2>
            <div className="mt-8">
              <Bullets items={service.tasks} />
            </div>
          </section>
          <section
            aria-labelledby="ergebnisse-title"
            className="on-dark rounded-3xl bg-night p-7 text-white sm:p-10 lg:p-12"
          >
            <p className="kicker">03 / Ergebnisse</p>
            <h2 id="ergebnisse-title" className="mt-5 text-h3 text-white">
              Was Sie von uns erhalten
            </h2>
            <div className="mt-8">
              <Bullets items={service.deliverables} dark />
            </div>
          </section>
        </div>
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="kicker">04 / FAQ</p>
            <h2 id="faq-title" className="mt-5 text-h2 text-night">
              {service.faqTitle}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <Faq items={service.faq} />
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="weitere-title">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">05 / Leistungen</p>
            <h2 id="weitere-title" className="mt-5 text-h2 text-night">
              Weitere Leistungen
            </h2>
          </div>
          <ButtonLink href="/leistungen" variant="outline" className="shrink-0 self-start md:self-auto">
            Alle Leistungen
          </ButtonLink>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {others.map((s) => (
            // A compact row on small screens, a small card from md.
            <li
              key={s.slug}
              className="group relative flex items-center gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-blue/40 md:flex-col md:items-stretch md:gap-0 md:p-7"
            >
              <div className="flex shrink-0 items-start justify-between gap-4">
                <ServiceIcon slug={s.slug} className="size-8" />
                <span aria-hidden className="hidden font-mono text-xs text-blue md:inline">
                  {nr(services.indexOf(s))}
                </span>
              </div>
              <h3 className="flex-1 text-lg font-medium leading-snug tracking-[-0.01em] text-night md:mt-10 md:flex-none">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-2xl">
                  {s.name}
                </Link>
              </h3>
              <div className="shrink-0 md:mt-auto md:pt-6">
                <ArrowUpRight
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-5 text-blue transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title={service.ctaTitle}
        primary={{ label: service.cta, href: `/kontakt?leistung=${service.slug}` }}
      />

      <JsonLd data={[serviceJsonLd(service, path), faqJsonLd(service.faq)]} />
    </>
  );
}
