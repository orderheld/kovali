import { PageBanner } from "@/components/sections/page-banner";
import { Section } from "@/components/ui/section";

/**
 * Imprint and privacy policy: the light page header with the title, then the text in a calm
 * reading column on white. The date of the current version sits beside the text on wide
 * screens and above it on small ones.
 */
export function LegalPage({
  title,
  heading,
  path,
  updated,
  children,
}: {
  title: string;
  /** The H1 where it differs from `title`, e.g. with a soft hyphen in a word too long for a phone. */
  heading?: React.ReactNode;
  path: string;
  updated: string;
  children: React.ReactNode;
}) {
  const crumbs = [
    { name: "Start", path: "/" },
    { name: title, path },
  ];
  return (
    <>
      <PageBanner crumbs={crumbs} title={heading ?? title} />
      <Section tone="white" className="pt-0 md:pt-0">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <p className="text-[0.875rem] text-muted lg:col-span-3">Stand: {updated}</p>
          <div className="prose-kovali min-w-0 lg:col-span-8 lg:col-start-5">{children}</div>
        </div>
      </Section>
    </>
  );
}

/**
 * Numbers the H2s of a legal page in render order, so adding or removing a section needs no
 * renumbering: `const section = sectionCounter();` then `<h2>{section("Anbieter")}</h2>`
 * renders the number in front of the heading text ("1. Anbieter").
 */
export function sectionCounter() {
  let n = 0;
  return function section(title: string) {
    const number = ++n;
    return (
      <>
        <span className="tabular-nums text-muted">{number}.</span> {title}
      </>
    );
  };
}
