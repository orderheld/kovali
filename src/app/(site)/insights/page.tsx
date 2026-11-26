import Link from "next/link";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ButtonChevron } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { articleHref, articles } from "@/content/insights";
import type { PublishedArticle } from "@/content/types";
import { pageMetadata } from "@/lib/seo";
import { cardFocus, cn, formatDate } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Insights – Ratgeber Business Analysis",
  description:
    "Ratgeber Business Analysis: Fachartikel zu Business Analysis und Requirements Engineering, zu Aufgaben, Abgrenzung und externer Unterstützung in IT-Projekten.",
  path: "/insights",
});

/**
 * The newest article as a large teaser on a canvas panel: category, title, excerpt, date and
 * reading time. As with the cards, the whole panel is the link (through the title).
 */
function FeaturedArticle({ article }: { article: PublishedArticle }) {
  return (
    <article
      className={cn(
        "group relative grid gap-8 rounded-[2rem] bg-canvas p-8 transition-colors duration-200 hover:bg-canvas-hover sm:p-12 lg:grid-cols-12 lg:gap-16 lg:p-16",
        cardFocus,
      )}
    >
      <div className="lg:col-span-7">
        <p className="text-[0.9375rem] font-semibold text-blue">{article.category}</p>
        <h2 className="mt-4 text-h2 text-graphite">
          <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 after:rounded-[2rem]">
            {article.title}
          </Link>
        </h2>
      </div>
      <div className="flex flex-col lg:col-span-5 lg:pt-10">
        <p className="text-lead text-muted">{article.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-6">
          <p className="text-[0.9375rem] text-muted">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span aria-hidden> · </span>
            {article.readingMinutes} Min. Lesezeit
          </p>
          {/* Visual cue only: the title is the link. */}
          <span aria-hidden className="inline-flex items-center gap-1 text-[1.0625rem] text-blue">
            Artikel lesen
            <ButtonChevron />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Article overview: page header, the newest article as a large teaser, the others as cards, closing panel. */
export default function InsightsPage() {
  const [featured, ...rest] = articles;

  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Insights", path: "/insights" },
        ]}
        title="Insights"
        lead="Fachartikel zu Requirements Engineering und Business Analysis."
      />

      {featured ? (
        <Section className="pt-0 md:pt-0">
          <FeaturedArticle article={featured} />
        </Section>
      ) : null}

      {rest.length ? (
        <Section labelledBy="weitere-title" className="pt-0 md:pt-0" space="loose">
          <SectionHeader id="weitere-title" kicker="Fachartikel" title="Weitere Artikel" />
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <CtaBand />
    </>
  );
}
