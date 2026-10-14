import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articleHref } from "@/content/insights";
import type { PublishedArticle } from "@/content/types";
import { formatDate } from "@/lib/utils";

export function ArticleCard({ article, headingLevel = "h3" }: { article: PublishedArticle; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white p-7 transition-[border-color,box-shadow] duration-200 hover:border-blue/40 hover:shadow-[0_24px_48px_-28px_rgb(20_91_206/0.45)]">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-blue to-electric transition-transform duration-300 group-hover:scale-x-100"
      />
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.06em] text-slate">
        <span className="font-medium text-blue">{article.category}</span>
        <span aria-hidden>·</span>
        <span>{article.readingMinutes} Min. Lesezeit</span>
      </p>
      <Heading className="mt-4 font-sans text-h3 font-semibold">
        <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 after:rounded-xl group-hover:text-blue">
          {article.title}
        </Link>
      </Heading>
      <p className="mb-6 mt-3 leading-relaxed text-slate">{article.excerpt}</p>
      <p className="mt-auto flex items-center justify-between border-t border-line pt-5 font-mono text-xs text-slate">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        <ArrowRight aria-hidden className="size-4 text-blue transition-transform group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}
