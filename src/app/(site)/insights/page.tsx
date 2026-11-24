import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { Section } from "@/components/ui/section";
import { articles } from "@/content/insights";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Insights – Ratgeber Business Analysis",
  description:
    "Ratgeber Business Analysis: Fachartikel zu Business Analysis und Requirements Engineering in IT-Projekten in der Schweiz.",
  path: "/insights",
});

/** Article overview: banner, all articles as cards, closing band. */
export default function InsightsPage() {
  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Insights", path: "/insights" },
        ]}
        scene="insights"
        title="Insights"
        lead="Fachartikel zu Business Analysis und Requirements Engineering."
      />
      <Section>
        <ul className="grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <ArticleCard article={a} headingLevel="h2" />
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
