import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { articleHref, articles, getArticle } from "@/content/insights";
import { getService, serviceHref } from "@/content/services";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import { cardFocus, cn, formatDate } from "@/lib/utils";

/**
 * Every article is prerendered from generateStaticParams. A navigation may wait for the page
 * instead of showing an empty fallback while `params` resolves.
 */
export const instant = false;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return pageMetadata({
    title: article.metaTitle,
    description: article.description,
    path: articleHref(article.slug),
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  });
}

/**
 * Article page: light page header with category, title, excerpt and date; the text in a
 * reading column with a sticky table of contents beside it on large screens; the matching
 * services, further articles and the closing panel. The header also carries the breadcrumb
 * structured data.
 */
export default async function ArticlePage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const path = articleHref(article.slug);
  const toc = article.blocks.flatMap((b) => (b.type === "h2" ? [b] : []));
  const related = article.relatedServices.flatMap((s) => getService(s) ?? []);
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <article>
        <PageBanner
          crumbs={[
            { name: "Start", path: "/" },
            { name: "Insights", path: "/insights" },
            { name: article.title, path },
          ]}
          kicker={article.category}
          title={article.title}
          lead={
            <>
              <p>{article.excerpt}</p>
              <p className="mt-8 flex flex-wrap gap-x-2 gap-y-1 text-[0.9375rem] text-muted">
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                {article.updatedAt ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Aktualisiert am <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                    </span>
                  </>
                ) : null}
                <span aria-hidden>·</span>
                <span>{article.readingMinutes} Min. Lesezeit</span>
              </p>
            </>
          }
        />

        <Container className="grid gap-12 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-8">
          {toc.length > 1 ? (
            <nav aria-labelledby="toc-title" className="hidden self-start lg:sticky lg:top-28 lg:col-span-3 lg:block">
              <p id="toc-title" className="text-[0.9375rem] font-semibold text-graphite">
                Inhalt
              </p>
              <ol className="mt-4 border-t border-hairline">
                {toc.map((h) => (
                  <li key={h.id} className="border-b border-hairline">
                    <a
                      href={`#${h.id}`}
                      className="block py-3 text-[0.9375rem] leading-snug text-muted transition-colors hover:text-blue"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="min-w-0 max-w-(--container-prose) lg:col-span-8 lg:col-start-5">
            <ArticleBody blocks={article.blocks} />

            {related.length ? (
              <aside aria-labelledby="passend-title" className="mt-16 border-t border-hairline pt-12">
                <h2 id="passend-title" className="text-h3 text-graphite">
                  Passende Leistungen
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {related.map((s) => (
                    <li
                      key={s.slug}
                      className={cn(
                        "group relative flex items-center gap-4 rounded-2xl bg-canvas p-5 transition-colors duration-200 hover:bg-canvas-hover",
                        cardFocus,
                      )}
                    >
                      <ServiceIcon slug={s.slug} className="size-8 shrink-0" />
                      <Link
                        href={serviceHref(s.slug)}
                        className="min-w-0 flex-1 font-semibold leading-snug text-graphite after:absolute after:inset-0 after:rounded-2xl"
                      >
                        {s.name}
                      </Link>
                      <ChevronRight aria-hidden strokeWidth={2} className="size-5 shrink-0 text-blue" />
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </Container>
      </article>

      {more.length ? (
        <Section tone="canvas" labelledBy="weitere-title" space="loose">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeader id="weitere-title" kicker="Insights" title="Weitere Artikel" />
            <ButtonLink href="/insights" variant="link" className="shrink-0 self-start md:self-auto">
              Alle Artikel
            </ButtonLink>
          </div>
          <ul className={cn("mt-12 grid gap-4 md:grid-cols-2", more.length > 2 && "lg:grid-cols-3")}>
            {more.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} tone="white" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <CtaBand />
      <JsonLd data={articleJsonLd(article, path)} />
    </>
  );
}
