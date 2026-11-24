import { PageBanner } from "@/components/sections/page-banner";
import { Section } from "@/components/ui/section";

/**
 * Imprint and privacy policy: image banner with the title, then the text in one centred
 * reading column on white. The date of the current version sits above the text.
 */
export function LegalPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
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
      <PageBanner crumbs={crumbs} scene="rechtliches" title={title} />
      <Section tone="white">
        <div className="mx-auto max-w-(--container-prose)">
          <p className="border-b border-line pb-5 text-sm text-slate">Stand: {updated}</p>
          <div className="prose-kovali mt-10 md:mt-12">{children}</div>
        </div>
      </Section>
    </>
  );
}
