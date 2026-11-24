import Image from "next/image";
import Link from "next/link";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ButtonArrow } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { articleHref, articles } from "@/content/insights";
import { articleCover } from "@/content/scenes";
import type { PublishedArticle } from "@/content/types";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Insights – Ratgeber Business Analysis",
  description:
    "Ratgeber Business Analysis: Fachartikel zu Business Analysis und Requirements Engineering in IT-Projekten in der Schweiz.",
  path: "/insights",
});

/**
 * The newest article as a large teaser: the 3D cover on the left, category, title, excerpt and
 * date on the right. As with the cards, the whole block is the link (through the title).
 */
function FeaturedArticle({ article }: { article: PublishedArticle }) {
  return (
    <article className="group relative grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-16">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-night lg:col-span-7">
        <Image
          src={articleCover(article.slug)}
          alt=""
          fill
          loading="eager"
          sizes="(min-width: 1280px) 44rem, (min-width: 1024px) 56vw, 92vw"
          placeholder="blur"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="lg:col-span-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.06em] text-slate">
          <span className="text-blue">{article.category}</span>
          <span aria-hidden>/</span>
          <span>{article.readingMinutes} Min. Lesezeit</span>
        </p>
        <h2 className="mt-5 text-h2 text-night">
          <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 group-hover:text-blue">
            {article.title}
          </Link>
        </h2>
        <p className="mt-5 text-lead text-slate">{article.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6">
          <p className="text-sm text-slate">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </p>
          {/* Visual cue only: the title above is the link. */}
          <span aria-hidden className="inline-flex items-center gap-2 font-medium text-blue group-hover:text-blue-700">
            Artikel lesen
            <ButtonArrow />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Article overview: banner, the newest article as a large teaser, the others as cards, closing band. */
export default function InsightsPage() {
  const [featured, ...rest] = articles;

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

      {featured ? (
        <Section space="loose">
          <FeaturedArticle article={featured} />
        </Section>
      ) : null}

      {rest.length ? (
        <Section tone="mist" labelledBy="weitere-title" space="loose">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionHeader id="weitere-title" kicker="Fachartikel" title="Weitere Artikel" titleClassName="text-night" />
            </div>
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:col-span-8">
              {rest.map((a) => (
                <li key={a.slug}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      <CtaBand />
    </>
  );
}
