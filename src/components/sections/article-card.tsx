import Image from "next/image";
import Link from "next/link";
import { articleHref } from "@/content/insights";
import { articleCover } from "@/content/scenes";
import type { PublishedArticle } from "@/content/types";
import { formatDate } from "@/lib/utils";

/** Article teaser: 3D cover image, category and reading time, title, excerpt, date. The whole card is the link. */
export function ArticleCard({ article, headingLevel = "h3" }: { article: PublishedArticle; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-night">
        <Image
          src={articleCover(article.slug)}
          alt=""
          fill
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"
          placeholder="blur"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.06em] text-slate">
        <span className="text-blue">{article.category}</span>
        <span aria-hidden>/</span>
        <span>{article.readingMinutes} Min. Lesezeit</span>
      </p>
      <Heading className="mt-3 text-h3 text-night">
        <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 group-hover:text-blue">
          {article.title}
        </Link>
      </Heading>
      <p className="mt-3 leading-relaxed text-slate">{article.excerpt}</p>
      <p className="mt-auto pt-5 text-sm text-slate">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      </p>
    </article>
  );
}
