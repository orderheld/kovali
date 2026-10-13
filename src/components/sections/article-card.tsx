import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { articleHref } from "@/content/insights";
import type { Article } from "@/content/types";
import { formatDate } from "@/lib/utils";

export function ArticleCard({ article, headingLevel = "h3" }: { article: Article; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-line bg-white p-7 transition-colors hover:border-blue/50">
      <p className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-slate">
        <span className="text-blue">{article.category}</span>
        <span aria-hidden>·</span>
        <span>{article.readingMinutes} Min. Lesezeit</span>
      </p>
      <Heading className="mt-4 text-h3 font-semibold">
        <Link href={articleHref(article.slug)} className="after:absolute after:inset-0 after:rounded-xl group-hover:text-blue">
          {article.title}
        </Link>
      </Heading>
      <p className="mt-3 leading-relaxed text-slate">{article.excerpt}</p>
      <p className="mt-auto flex items-center justify-between pt-6 text-sm text-slate">
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        <ArrowRight aria-hidden className="size-4 text-blue transition-transform group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}
