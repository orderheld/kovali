import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckList, Tick } from "@/components/sections/check-list";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceList } from "@/components/sections/service-list";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { responseClause } from "@/config/site";
import { getIndustry } from "@/content/industries";
import { getService, serviceHref, services } from "@/content/services";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

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

export default async function ServicePage({ params }: PageProps<"/leistungen/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const path = serviceHref(service.slug);
  const contactHref = `/kontakt?leistung=${service.slug}`;
  const others = services.filter((s) => s.slug !== service.slug).map((s) => s.slug);
  const industries = service.industries.flatMap((id) => getIndustry(id) ?? []);

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
          { name: service.name, path },
        ]}
        eyebrow="IT Consulting"
        title={service.h1}
        lead={service.intro}
      >
        <ButtonLink href={contactHref} arrow>
          {service.cta}
        </ButtonLink>
        <ButtonLink href="/leistungen" variant="secondary" className="border-field bg-transparent">
          IT Consulting im Überblick
        </ButtonLink>
      </PageHero>

      <Section labelledBy="aufgaben-title">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <SectionHeader id="aufgaben-title" title={service.tasksTitle} />
            <CheckList items={service.tasks} className="mt-10" />
          </div>
          <div className="self-start rounded-[10px] bg-paper p-8 lg:col-span-5">
            <h3 className="text-lg font-semibold text-ink">Typische Ergebnisse</h3>
            <ul className="mt-6 space-y-4">
              {service.deliverables.map((d) => (
                <li
                  key={d}
                  className="flex gap-3 border-b border-paper-line pb-4 leading-snug text-ink last:border-0 last:pb-0"
                >
                  <Tick />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section rule labelledBy="ausgangslagen-title">
        <SectionHeader id="ausgangslagen-title" title="Typische Ausgangslagen" />
        <ul className="mt-12 grid gap-x-10 md:grid-cols-2">
          {service.situations.map((situation) => (
            <li
              key={situation}
              className="flex gap-3 border-t border-line py-6 text-lg leading-relaxed text-ink"
            >
              <Tick className="mt-[0.75em]" />
              {situation}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" space="tight" labelledBy="kontext-title">
        <h2 id="kontext-title" className="sr-only">
          Branchen und Werkzeuge
        </h2>
        <dl className="divide-y divide-paper-line border-y border-paper-line">
          <div className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
            <dt className="font-semibold text-ink">Branchen</dt>
            <dd className="leading-relaxed text-slate">
              {industries.map((industry, i) => (
                <Fragment key={industry.id}>
                  {i > 0 ? ", " : null}
                  <Link
                    href={`/branchen#${industry.id}`}
                    className="text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                  >
                    {industry.name}
                  </Link>
                  {industry.kind === "target" ? "\u00a0(Zielmarkt)" : null}
                </Fragment>
              ))}
            </dd>
          </div>
          <div className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
            <dt className="font-semibold text-ink">Methoden und Werkzeuge</dt>
            <dd className="leading-relaxed text-slate">{service.methods.join(", ")}</dd>
          </div>
        </dl>
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" title={service.faqTitle} />
          </div>
          <div className="lg:col-span-8">
            <Faq items={service.faq} />
          </div>
        </div>
      </Section>

      <Section tone="paper" space="tight" labelledBy="weitere-title">
        <SectionHeader id="weitere-title" title="Weitere Disziplinen im IT Consulting" />
        <ServiceList only={others} className="mt-10" />
      </Section>

      <CtaBand
        title={service.ctaTitle}
        text={`Beschreiben Sie Vorhaben, Zeitraum und Pensum. Sie erhalten eine erste Einschätzung von Ferhat Demir${responseClause()}.`}
        primary={{ label: service.cta, href: contactHref }}
        secondary={{ label: "Alle Leistungen", href: "/leistungen" }}
      />

      <JsonLd data={[serviceJsonLd(service, path), faqJsonLd(service.faq)]} />
    </>
  );
}
