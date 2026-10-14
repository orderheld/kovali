import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { Portrait } from "@/components/sections/portrait";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { RichText } from "@/components/ui/rich-text";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { business } from "@/content/business";
import { founder } from "@/content/company";
import { industries } from "@/content/industries";
import { serviceHref } from "@/content/services";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Für Unternehmen – Business Analysis und Test im Mandat",
  description:
    "KOVALI übernimmt Business Analysis, Requirements Engineering, Testmanagement und Application Management in Ihrem Projekt, direkt oder als Subunternehmen.",
  path: "/unternehmen",
});

const requestHref = "/kontakt?anfrage=contracting";

/*
 * Tables are real tables from 640 px. Below that their rows stack; the explicit ARIA roles
 * keep the table semantics, which some screen readers drop once a table element changes its
 * display. Column headers stay available to screen readers and become visible from 640 px.
 */
const stackTable = "block w-full border-collapse text-left sm:table";
const stackHead = "sr-only sm:not-sr-only sm:table-header-group";
const stackBody = "block sm:table-row-group";
const colHead = "pb-3 pr-6 align-bottom text-sm font-medium text-slate sm:table-cell";

/** "Seit über 10 Jahren in der IT, seit 2020 in …" */
const experienceSentence = `${founder.experienceLine.charAt(0).toUpperCase()}${founder.experienceLine.slice(1)}.`;

export default function UnternehmenPage() {
  const experience = industries.filter((i) => i.kind === "experience");
  const { tasks, methods, contracts, requestSteps, specialistsPanel } = business;
  const email = site.contact.email.value;
  const phone = site.contact.phone.value;

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Für Unternehmen", path: "/unternehmen" },
        ]}
        eyebrow="Für Beratungen, IT-Dienstleister und Unternehmen"
        title="Business Analysis und Test für Ihr Mandat"
        lead={business.intro}
      >
        <ButtonLink href={requestHref} arrow>
          Anforderungsprofil senden
        </ButtonLink>
        <ButtonLink href="/warum-kovali" variant="secondary" className="border-field bg-transparent">
          Warum KOVALI
        </ButtonLink>
      </PageHero>

      <Section labelledBy="aufgaben-title">
        <SectionHeader id="aufgaben-title" title={tasks.title} />
        <dl className="mt-12 border-b border-line">
          {tasks.items.map((t) => (
            <div key={t.title} className="grid gap-2 border-t border-line py-6 sm:grid-cols-[16rem_1fr] sm:gap-8">
              <dt className="text-lg font-semibold leading-snug text-ink">
                <Link href={serviceHref(t.slug)} className="hover:text-blue hover:underline hover:underline-offset-4">
                  {t.title}
                </Link>
              </dt>
              <dd className="max-w-2xl leading-relaxed text-slate">{t.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="paper" labelledBy="methoden-title">
        <SectionHeader id="methoden-title" title={methods.title} />
        <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-8">
          <table role="table" className={cn(stackTable, "lg:col-span-8")}>
            <caption className="sr-only">{methods.caption}</caption>
            <thead role="rowgroup" className={stackHead}>
              <tr role="row" className="sm:table-row">
                <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[42%]")}>
                  {methods.head.method}
                </th>
                <th role="columnheader" scope="col" className={cn(colHead, "pr-0")}>
                  {methods.head.use}
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className={stackBody}>
              {methods.rows.map((row) => (
                <tr
                  role="row"
                  key={row.method}
                  className="block border-t border-paper-line py-5 last:border-b sm:table-row sm:py-0"
                >
                  <th
                    role="rowheader"
                    scope="row"
                    className="block font-semibold text-ink sm:table-cell sm:py-5 sm:pr-6 sm:align-top"
                  >
                    {row.method}
                  </th>
                  <td role="cell" className="mt-1.5 block leading-relaxed text-slate sm:mt-0 sm:table-cell sm:py-5 sm:align-top">
                    {row.use}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="lg:col-span-4 lg:col-start-9">
            <h3 id="praxis-title" className="text-h3 font-semibold">
              {methods.industriesTitle}
            </h3>
            <ul aria-labelledby="praxis-title" className="mt-5 border-b border-paper-line">
              {experience.map((i) => (
                <li key={i.id} className="border-t border-paper-line py-4">
                  <Link
                    href={`/branchen#${i.id}`}
                    className="font-medium text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                  >
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[0.9375rem] leading-relaxed text-slate">
              <RichText text={methods.certificatesLine} />
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="vertragsformen-title">
        <SectionHeader id="vertragsformen-title" title={contracts.title} text={contracts.text} />
        <table role="table" className={cn(stackTable, "mt-12")}>
          <caption className="sr-only">{contracts.caption}</caption>
          <thead role="rowgroup" className={stackHead}>
            <tr role="row" className="sm:table-row">
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[28%]")}>
                {contracts.head.form}
              </th>
              <th role="columnheader" scope="col" className={cn(colHead, "sm:w-[38%]")}>
                {contracts.head.parties}
              </th>
              <th role="columnheader" scope="col" className={cn(colHead, "pr-0")}>
                {contracts.head.typical}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className={stackBody}>
            {contracts.rows.map((row) => (
              <tr role="row" key={row.form} className="block border-t border-line py-6 last:border-b sm:table-row sm:py-0">
                <th
                  role="rowheader"
                  scope="row"
                  className="block text-lg font-semibold leading-snug text-ink sm:table-cell sm:py-6 sm:pr-6 sm:align-top sm:text-base"
                >
                  {row.form}
                </th>
                <td role="cell" className="mt-4 block leading-relaxed text-slate sm:mt-0 sm:table-cell sm:py-6 sm:pr-6 sm:align-top">
                  <span aria-hidden className="mb-1 block text-sm font-medium text-ink sm:hidden">
                    {contracts.head.parties}
                  </span>
                  {row.parties}
                </td>
                <td role="cell" className="mt-4 block leading-relaxed text-slate sm:mt-0 sm:table-cell sm:py-6 sm:align-top">
                  <span aria-hidden className="mb-1 block text-sm font-medium text-ink sm:hidden">
                    {contracts.head.typical}
                  </span>
                  {row.typical}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate">{business.scopeNote}</p>
      </Section>

      <Section tone="paper" id="ablauf" labelledBy="ablauf-title" className="scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="ablauf-title" title={requestSteps.title} />
            <ButtonLink href={requestHref} arrow className="mt-9">
              Anforderungsprofil senden
            </ButtonLink>
          </div>
          <ol className="border-b border-paper-line lg:col-span-8">
            {requestSteps.items.map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[1.75rem_1fr] gap-x-4 gap-y-1.5 border-t border-paper-line py-6 sm:grid-cols-[1.75rem_11rem_1fr] sm:gap-x-6"
              >
                <span
                  aria-hidden
                  className="flex size-7 items-center justify-center rounded-full border border-line bg-white text-sm font-medium tabular-nums text-blue"
                >
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold leading-7">{s.title}</h3>
                <p className="col-start-2 max-w-xl leading-relaxed text-slate sm:col-start-3 sm:pt-px">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section labelledBy="ansprechpartner-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="flex gap-6">
            <Portrait size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue">Ansprechpartner</p>
              <h2 id="ansprechpartner-title" className="mt-2 text-[1.75rem] font-medium leading-tight text-ink">
                {site.contact.person}
              </h2>
              <p className="mt-1 text-slate">{site.contact.role}</p>
              <p className="mt-5 max-w-md leading-relaxed text-slate">{experienceSentence}</p>
              <ul className="mt-6 space-y-2">
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                  >
                    {email}
                  </a>
                </li>
                {phone ? (
                  <li>
                    <a
                      href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                      className="text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                    >
                      {phone}
                    </a>
                  </li>
                ) : null}
                <li>
                  <Link
                    href="/warum-kovali#geschaeftsleitung"
                    className="text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                  >
                    Warum KOVALI
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl bg-paper p-8 md:p-10">
            <p className="text-sm font-medium text-slate">{specialistsPanel.label}</p>
            <h2 className="mt-3 text-2xl font-medium leading-snug text-ink">{specialistsPanel.title}</h2>
            <p className="mt-4 leading-relaxed text-slate">{specialistsPanel.text}</p>
            <Link
              href={specialistsPanel.link.href}
              className="mt-6 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              {specialistsPanel.link.label} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      <Section tone="paper" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" title={business.faqTitle} />
          </div>
          <div className="lg:col-span-8">
            <Faq items={business.faq} />
          </div>
        </div>
      </Section>

      <CtaBand
        title={business.cta.title}
        text={business.cta.text}
        primary={{ label: "Anforderungsprofil senden", href: requestHref }}
        secondary={null}
      />
      <JsonLd data={faqJsonLd([...business.faq])} />
    </>
  );
}
