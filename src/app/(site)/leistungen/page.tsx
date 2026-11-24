import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { Section } from "@/components/ui/section";
import { site } from "@/config/site";
import { serviceHref, services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "IT Consulting Schweiz – Business Analysis und Test",
  description: `IT Consulting von ${site.brand}: Business Analysis, Requirements Engineering, Testmanagement, Test Engineering und Application Management in der ganzen Schweiz.`,
  path: "/leistungen",
});

/** How many tasks of each service the overview lists (the most important come first). */
const TASKS_SHOWN = 6;

/**
 * Overview of the four services: banner, one row per service (name and link on the left,
 * summary and main tasks on the right), closing band.
 */
export default function LeistungenPage() {
  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Leistungen", path: "/leistungen" },
        ]}
        scene="leistungen"
        title="Leistungen"
        lead="Wir übernehmen in Ihrem IT-Projekt eine einzelne Aufgabe oder Analyse und Test im selben Mandat."
      />

      <Section>
        <ul className="divide-y divide-line">
          {services.map((s) => (
            // Name and link sit in the left column from lg; on small screens the link follows the text.
            <li
              key={s.slug}
              className="grid gap-8 py-14 first:pt-0 last:pb-0 md:py-20 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-5"
            >
              <div className="lg:col-span-5 lg:pr-8">
                <ServiceIcon slug={s.slug} />
                <h2 id={`${s.slug}-title`} className="mt-6 text-h3 text-navy">
                  {s.name}
                </h2>
              </div>
              <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
                <p className="text-lead text-slate">{s.summary}</p>
                <ul className="mt-8 space-y-3">
                  {s.tasks.slice(0, TASKS_SHOWN).map((task) => (
                    <li
                      key={task}
                      className="relative pl-6 leading-relaxed text-slate before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-blue"
                    >
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:pr-8">
                <Link href={serviceHref(s.slug)} className="group font-medium text-blue hover:text-blue-700">
                  Mehr zu {s.name}
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2}
                    className="ml-2 inline size-4 align-[-0.125em] transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Welche Aufgabe ist in Ihrem Projekt offen?" />
    </>
  );
}
