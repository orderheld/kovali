import { PageBanner } from "@/components/sections/page-banner";
import { Section } from "@/components/ui/section";

/**
 * Imprint and privacy policy: the dark page header with the title, then the text in a calm
 * reading column on white. The date of the current version sits in a mono line beside the
 * text on wide screens and above it on small ones; the column starts where the article text
 * of the insights starts.
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
      <PageBanner crumbs={crumbs} scene="rechtliches" title={heading ?? title} />
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <p className="border-b border-line pb-5 font-mono text-xs uppercase tracking-[0.08em] text-slate lg:col-span-3 lg:self-start lg:border-b-0 lg:border-t lg:pb-0 lg:pt-5">
            <span className="text-blue">Stand</span> / {updated}
          </p>
          <div className="prose-kovali min-w-0 lg:col-span-8 lg:col-start-5">{children}</div>
        </div>
      </Section>
    </>
  );
}
