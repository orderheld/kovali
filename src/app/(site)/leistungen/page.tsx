import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { ToolsGrid } from "@/components/sections/tools-grid";
import { ButtonChevron, ButtonLink } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { home } from "@/content/home";
import { serviceHref, services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Leistungen – Requirements Engineering, Business Analysis und Test",
  description: `IT Consulting von ${site.brand}: Requirements Engineering, Business Analysis, Testmanagement, Test Engineering und Application Management in der ganzen Schweiz.`,
  path: "/leistungen",
});

/** How many tasks of each service the overview lists (the most important come first). */
const TASKS_SHOWN = 6;

/** How the services work together: the strength "Analyse und Test aus einer Hand" of the home page. */
const together = home.strengths.items[1];

/** The chain from requirement to acceptance that links analysis and test. */
const chain = ["Anforderung", "User Story", "Testfall", "Abnahme"];

/**
 * Overview of the four services: page header, one card per service (name, summary and main
 * tasks; the whole card links to the service page), how analysis and test work together, the
 * tools, closing panel.
 */
export default function LeistungenPage() {
  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
        ]}
        title="Leistungen"
        lead="Wir übernehmen in Ihrem IT-Projekt eine einzelne Aufgabe oder Analyse und Test im selben Mandat."
      />

      <Section className="pt-0 md:pt-0">
        <ol className="grid gap-4">
          {services.map((s) => (
            <li
              key={s.slug}
              className="group relative grid gap-8 rounded-3xl bg-canvas p-7 transition-colors duration-200 hover:bg-[#ededf0] sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-12"
            >
              <div className="flex flex-col lg:col-span-5">
                <ServiceIcon slug={s.slug} />
                <h2 className="mt-8 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-graphite">
                  {/* The link covers the whole card. */}
                  <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-3xl">
                    {s.name}
                  </Link>
                </h2>
                <p className="mt-4 text-muted">{s.summary}</p>
                <p aria-hidden className="mt-auto flex items-center gap-1 pt-8 text-[1.0625rem] text-blue">
                  Mehr erfahren
                  <ButtonChevron />
                </p>
              </div>
              <div className="border-t border-hairline pt-8 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                <p className="text-[0.9375rem] font-semibold text-graphite">Aufgaben</p>
                <ul className="mt-5 grid gap-x-8 gap-y-3 md:grid-cols-2">
                  {s.tasks.slice(0, TASKS_SHOWN).map((task) => (
                    <li key={task} className="flex gap-3 text-graphite">
                      <span aria-hidden className="mt-[0.65em] size-1 shrink-0 rounded-full bg-muted" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="canvas" labelledBy="zusammenspiel-title" space="loose">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <SectionHeader id="zusammenspiel-title" kicker="Arbeitsweise" title={together.title} text={together.text} />
            <ButtonLink href="/unternehmen#zusammenarbeit" variant="link" className="mt-8">
              Formen der Zusammenarbeit
            </ButtonLink>
          </div>
          <ol className="flex flex-col gap-3 self-center lg:col-span-6" aria-label="Von der Anforderung bis zur Abnahme">
            {chain.map((step, i) => (
              <li key={step} className="flex items-center gap-4 rounded-2xl bg-white px-6 py-5">
                <span aria-hidden className="w-5 text-[0.9375rem] font-semibold tabular-nums text-blue">
                  {i + 1}
                </span>
                <span className="text-[1.0625rem] font-semibold text-graphite">{step}</span>
                {i < chain.length - 1 ? (
                  <ChevronRight aria-hidden strokeWidth={1.75} className="ml-auto size-5 rotate-90 text-muted" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section labelledBy="werkzeuge-title" space="loose">
        <SectionHeader id="werkzeuge-title" kicker={home.tools.kicker} title={home.tools.title} text={home.tools.text} />
        <ToolsGrid className="mt-14" />
      </Section>

      <CtaBand title="Welche Aufgabe ist in Ihrem Projekt offen?" />
    </>
  );
}
