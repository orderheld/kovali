import { ArrowDown } from "lucide-react";
import { Tick } from "@/components/sections/check-list";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { RateRange } from "@/components/sections/rate-range";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { pricing } from "@/content/pricing";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: pricing.meta.title,
  description: pricing.meta.description,
  path: "/preise",
});

/*
 * Both tables are real tables from 640 px. Below that their rows stack (block or grid
 * display); the explicit ARIA roles keep the table semantics, which some screen readers
 * drop once a table element changes its display. The column headers stay available to
 * screen readers on small screens and become visible from 640 px.
 */
const stackTable = "block w-full border-collapse text-left sm:table";
const stackHead = "sr-only sm:not-sr-only sm:table-header-group";
const stackBody = "block sm:table-row-group";
const colHead = "pb-3 pr-6 align-bottom text-sm font-medium text-slate sm:table-cell";

export default function PreisePage() {
  const { factors, more, example, billing } = pricing;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Preise", path: "/preise" },
        ]}
        title={pricing.hero.title}
        lead={pricing.hero.lead}
      >
        <ButtonLink href={pricing.hero.primary.href} arrow>
          {pricing.hero.primary.label}
        </ButtonLink>
      </PageHero>

      <Section labelledBy="spanne-title">
        <h2 id="spanne-title" className="sr-only">
          Richtwerte pro Stunde
        </h2>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <RateRange className="lg:col-span-8" />
          <div className="border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-slate lg:col-span-4">
            <p>{pricing.range.note}</p>
            <a
              href={pricing.range.exampleLink.href}
              className="mt-3 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              {pricing.range.exampleLink.label}
              <ArrowDown aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </Section>

      <Section rule labelledBy="faktoren-title">
        <SectionHeader id="faktoren-title" title={factors.title} />
        <table role="table" className={cn(stackTable, "mt-12")}>
          <caption className="sr-only">{factors.caption}</caption>
          <thead role="rowgroup" className={stackHead}>
            <tr role="row" className="sm:table-row">
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[22%]")}>
                {factors.head.factor}
              </th>
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[39%]")}>
                {factors.head.low}
              </th>
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[39%]")}>
                {factors.head.high}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className={stackBody}>
            {factors.rows.map((row) => (
              <tr role="row" key={row.factor} className="block border-t border-line py-6 last:border-b sm:table-row sm:py-0">
                <th
                  role="rowheader"
                  scope="row"
                  className="block text-lg font-semibold leading-relaxed text-ink sm:table-cell sm:py-6 sm:pr-6 sm:align-top sm:text-base"
                >
                  {row.factor}
                </th>
                <td role="cell" className="mt-4 block leading-relaxed text-slate sm:mt-0 sm:table-cell sm:py-6 sm:pr-6 sm:align-top">
                  <span aria-hidden className="mb-1 block text-sm font-medium text-ink sm:hidden">
                    {factors.head.low}
                  </span>
                  {row.low}
                </td>
                <td role="cell" className="mt-4 block leading-relaxed text-slate sm:mt-0 sm:table-cell sm:py-6 sm:align-top">
                  <span aria-hidden className="mb-1 block text-sm font-medium text-ink sm:hidden">
                    {factors.head.high}
                  </span>
                  {row.high}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section rule space="tight" labelledBy="sonst-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <h2 id="sonst-title" className="text-h2 font-medium text-ink lg:col-span-4">
            {more.title}
          </h2>
          <dl className="grid gap-8 md:grid-cols-2 md:gap-10 lg:col-span-8">
            {more.items.map((item) => (
              <div key={item.term} className="border-t border-line pt-5">
                <dt className="font-semibold text-ink">{item.term}</dt>
                <dd className="mt-2 leading-relaxed text-slate">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section id="rechenbeispiel" tone="paper" labelledBy="beispiel-title">
        <SectionHeader id="beispiel-title" layout="split" title={example.title} text={example.intro} />
        <table role="table" className={cn(stackTable, "mt-12 tabular-nums")}>
          <caption className="sr-only">{example.caption}</caption>
          <thead role="rowgroup" className={stackHead}>
            <tr role="row" className="sm:table-row">
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[32%]")}>
                {example.head.step}
              </th>
              <th role="columnheader" scope="col" className={colHead}>
                {example.head.calculation}
              </th>
              <th role="columnheader" scope="col" className={cn(colHead, "pr-0 text-right")}>
                {example.head.result}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className={stackBody}>
            {example.rows.map((row) => (
              <tr
                role="row"
                key={row.step}
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t py-4 last:border-b sm:table-row sm:py-0",
                  row.total ? "border-navy" : "border-paper-line",
                )}
              >
                <th
                  role="rowheader"
                  scope="row"
                  className="col-span-2 font-semibold leading-relaxed text-ink sm:table-cell sm:py-4 sm:pr-6 sm:align-top"
                >
                  {row.step}
                </th>
                <td role="cell" className="leading-relaxed text-slate sm:table-cell sm:py-4 sm:pr-6 sm:align-top">
                  {row.calculation}
                </td>
                <td
                  role="cell"
                  className={cn(
                    "whitespace-nowrap text-right leading-relaxed sm:table-cell sm:py-4 sm:align-top",
                    row.total ? "font-semibold text-navy" : "font-medium text-ink",
                  )}
                >
                  {row.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 max-w-3xl text-[0.9375rem] leading-relaxed text-slate">{example.note}</p>
      </Section>

      <Section labelledBy="abrechnung-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <h2 id="abrechnung-title" className="text-h2 font-medium text-ink lg:col-span-4">
            {billing.title}
          </h2>
          <ul className="divide-y divide-line border-y border-line lg:col-span-8">
            {billing.items.map((item) => (
              <li key={item} className="flex gap-3 py-4 leading-relaxed text-ink">
                <Tick className="mt-[0.7em]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="paper" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" title={pricing.faqTitle} />
          </div>
          <div className="lg:col-span-8">
            <Faq items={pricing.faq} />
          </div>
        </div>
      </Section>

      <CtaBand
        title={pricing.cta.title}
        text={pricing.cta.text}
        primary={pricing.cta.primary}
        secondary={null}
      />

      <JsonLd data={faqJsonLd(pricing.faq)} />
    </>
  );
}
