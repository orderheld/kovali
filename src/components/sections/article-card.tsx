import Link from "next/link";
import { ButtonChevron } from "@/components/ui/button";
import { articleHref } from "@/content/insights";
import type { PublishedArticle } from "@/content/types";
import { cn, formatDate } from "@/lib/utils";

/**
 * Article teaser on a light grey card, without an image: category, title, excerpt, then date
 * and reading time. The whole card is the link.
 */
export function ArticleCard({
  article,
  headingLevel = "h3",
  tone = "canvas",
}: {
  article: PublishedArticle;
  headingLevel?: "h2" | "h3";
  /** Card colour: canvas on white sections, white on canvas sections. */
  tone?: "canvas" | "white";
}) {
  const Heading = headingLevel;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-3xl p-7 transition-colors duration-200 sm:p-8",
        tone === "canvas" ? "bg-canvas hover:bg-[#ededf0]" : "bg-white hover:bg-white/70",
      )}
    >
      <p className="text-[0.875rem] font-semibold text-blue">{article.category}</p>
      <Heading className="mt-3 text-h3 text-graphite">
        <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 after:rounded-3xl">
          {article.title}
        </Link>
      </Heading>
      <p className="mt-3 text-muted">{article.excerpt}</p>
      <p className="mt-auto flex items-center justify-between gap-4 pt-8 text-[0.875rem] text-muted">
        <span>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          <span aria-hidden> · </span>
          {article.readingMinutes} Min. Lesezeit
        </span>
        <span aria-hidden className="text-blue">
          <ButtonChevron />
        </span>
      </p>
    </article>
  );
}
