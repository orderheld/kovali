import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/sections/page-hero";
import { Section } from "@/components/ui/section";
import { articles } from "@/content/insights";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Insights – Ratgeber Business Analysis",
  description:
    "Ratgeber Business Analysis: Fachbeiträge zu Business Analysis, Requirements Engineering und Testmanagement in IT-Projekten in der Schweiz.",
  path: "/insights",
});

export default function InsightsPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Insights", path: "/insights" },
        ]}
        title="Ratgeber Business Analysis und Requirements Engineering"
        lead="Fachbeiträge zu Anforderungen, Analyse und Test in IT-Projekten."
      />
      <Section labelledBy="beitraege-title">
        <h2 id="beitraege-title" className="sr-only">
          Beiträge
        </h2>
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
