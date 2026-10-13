import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckList } from "@/components/sections/check-list";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { ServiceList } from "@/components/sections/service-list";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
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

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
          { name: service.name, path },
        ]}
        eyebrow={`${service.code} · ${service.name}`}
        title={service.h1}
        lead={service.intro}
      >
        <ButtonLink href={contactHref} arrow>
          {service.cta}
        </ButtonLink>
        <ButtonLink href="/leistungen" variant="secondary">
          Alle Leistungen
        </ButtonLink>
      </PageHero>

      <Section labelledBy="aufgaben-title">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <SectionHeader id="aufgaben-title" eyebrow="Aufgaben" title={`Was ${service.name} bei KOVALI umfasst`} />
            <CheckList items={service.tasks} className="mt-10" />
          </div>
          <div className="self-start rounded-xl bg-mist p-8 lg:col-span-5">
            <h2 id="ergebnisse-title" className="font-mono text-xs uppercase tracking-[0.12em] text-blue">
              Typische Ergebnisse
            </h2>
            <ul className="mt-6 space-y-4">
              {service.deliverables.map((d) => (
                <li key={d} className="flex gap-3 border-b border-line pb-4 leading-snug text-ink last:border-0 last:pb-0">
                  <span aria-hidden className="mt-[0.55em] h-0.5 w-2.5 shrink-0 -rotate-[48deg] bg-blue" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="nutzen-title">
        <SectionHeader id="nutzen-title" eyebrow="Ihr Nutzen" title="Was Sie davon haben" />
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {service.benefits.map((b) => (
            <li key={b.title} className="border-t-2 border-blue pt-6">
              <h3 className="text-h3 font-semibold">{b.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{b.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="szenarien-title">
        <SectionHeader id="szenarien-title" eyebrow="Einsatzszenarien" title="Typische Situationen für diese Leistung" />
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {service.scenarios.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-line p-7 md:p-8">
              <span className="font-mono text-xs text-blue">Szenario {i + 1}</span>
              <h3 className="mt-3 text-h3 font-semibold">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{s.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="mist" labelledBy="kontext-title">
        <h2 id="kontext-title" className="sr-only">
          Branchen und Methoden
        </h2>
        <div className="grid gap-12 md:grid-cols-2 md:gap-8">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-blue">Branchen</h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {service.industries.map((id) => {
                const industry = getIndustry(id);
                return industry ? (
                  <li key={id}>
                    <Link
                      href={`/branchen#${id}`}
                      className="inline-block rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink hover:border-blue hover:text-blue"
                    >
                      {industry.name}
                      {industry.kind === "target" ? <span className="text-slate"> (Zielmarkt)</span> : null}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-blue">Methoden und Werkzeuge</h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {service.methods.map((m) => (
                <li key={m} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" eyebrow="FAQ" title={`Häufige Fragen zu ${service.name}`} />
          </div>
          <div className="lg:col-span-8">
            <Faq items={service.faq} />
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="weitere-title" className="md:py-20">
        <SectionHeader id="weitere-title" eyebrow="Weitere Leistungen" title="Passt zusammen" />
        <ServiceList only={others} className="mt-10" />
      </Section>

      <CtaBand
        title={`Sie suchen Unterstützung in ${service.name}?`}
        text="Beschreiben Sie Ihr Vorhaben, den Zeitrahmen und die gesuchte Rolle. Sie erhalten eine persönliche Rückmeldung."
        primary={{ label: service.cta, href: contactHref }}
        secondary={{ label: "Alle Leistungen", href: "/leistungen" }}
      />

      <JsonLd data={[serviceJsonLd(service, path), faqJsonLd(service.faq)]} />
    </>
  );
}
