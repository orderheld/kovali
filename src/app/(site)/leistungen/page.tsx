import Link from "next/link";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { ButtonArrow, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { site } from "@/config/site";
import { home } from "@/content/home";
import { serviceHref, services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "IT Consulting Schweiz – Business Analysis und Test",
  description: `IT Consulting von ${site.brand}: Business Analysis, Requirements Engineering, Testmanagement, Test Engineering und Application Management in der ganzen Schweiz.`,
  path: "/leistungen",
});

/** How many tasks of each service the overview lists (the most important come first). */
const TASKS_SHOWN = 6;

/** "01", "02", … for the mono numbering of the services. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

/** How the services work together: the strength "Analyse und Test aus einer Hand" of the home page. */
const together = home.strengths.items[1];

/**
 * Looks like a button at the end of each card; the card link on the title is the actual target.
 * Below the summary from lg, below the tasks on smaller screens.
 */
function MorePill() {
  return (
    <span
      aria-hidden
      className={buttonClasses({
        variant: "outline",
        size: "sm",
        className: "group-hover:border-night/40 group-hover:bg-mist",
      })}
    >
      Mehr erfahren
      <ButtonArrow />
    </span>
  );
}

/**
 * Overview of the four services: banner, one large numbered card per service (name, summary
 * and main tasks; the whole card links to the service page), how analysis and test work
 * together, closing panel.
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

      <Section tone="mist">
        <ol className="grid gap-4 md:gap-6">
          {services.map((s, i) => (
            <li
              key={s.slug}
              className="group relative grid gap-10 rounded-3xl border border-line bg-white p-7 transition-colors hover:border-blue/40 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-12 xl:p-14"
            >
              <div className="flex flex-col lg:col-span-5">
                <div className="flex items-start justify-between gap-4">
                  <ServiceIcon slug={s.slug} />
                  <span aria-hidden className="font-mono text-sm text-blue">
                    {nr(i)}
                  </span>
                </div>
                <h2 id={`${s.slug}-title`} className="mt-10 text-h3 text-night lg:mt-12">
                  {/* The link covers the whole card. */}
                  <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 after:rounded-3xl">
                    {s.name}
                  </Link>
                </h2>
                <p className="mt-4 leading-relaxed text-slate">{s.summary}</p>
                <div className="mt-auto hidden pt-10 lg:block">
                  <MorePill />
                </div>
              </div>
              <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-12">
                <p className="kicker">Aufgaben</p>
                {/* Two columns only where a long task name still fits on one line. */}
                <ul className="mt-6 grid gap-x-8 gap-y-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {s.tasks.slice(0, TASKS_SHOWN).map((task) => (
                    <li
                      key={task}
                      className="relative pl-6 leading-relaxed text-slate before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-blue"
                    >
                      {task}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 lg:hidden">
                  <MorePill />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="zusammenspiel-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="kicker">01 / Arbeitsweise</p>
            <h2 id="zusammenspiel-title" className="mt-5 text-h2 text-night">
              {together.title}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-lead text-slate">{together.text}</p>
            <ButtonLink href="/unternehmen#zusammenarbeit" variant="outline" className="mt-10">
              Formen der Zusammenarbeit
            </ButtonLink>
          </div>
        </div>
      </Section>

      <CtaBand title="Welche Aufgabe ist in Ihrem Projekt offen?" />
    </>
  );
}
