import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { articleHref, articles, getArticle } from "@/content/insights";
import { getService, serviceHref } from "@/content/services";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

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
 * Article page: banner with category and title, the text with a short table of contents
 * beside it on large screens, the matching services, further articles and the closing band.
 * The banner also carries the breadcrumb structured data.
 */
export default async function ArticlePage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const path = articleHref(article.slug);
  const toc = article.blocks.flatMap((b) => (b.type === "h2" ? [b] : []));
  const related = article.relatedServices.flatMap((s) => getService(s) ?? []);
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <article>
        <PageBanner
          crumbs={[
            { name: "Start", path: "/" },
            { name: "Insights", path: "/insights" },
            { name: article.title, path },
          ]}
          scene="insights"
          kicker={article.category}
          title={article.title}
          size="lg"
        />

        <Container className="grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
          {toc.length > 1 ? (
            <nav aria-labelledby="toc-title" className="hidden self-start lg:sticky lg:top-28 lg:col-span-3 lg:block">
              <p id="toc-title" className="text-sm font-medium text-navy">
                Inhalt
              </p>
              <ol className="mt-4 space-y-1 border-l border-line text-[0.9375rem] leading-snug">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-slate transition-colors hover:border-blue hover:text-blue"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="min-w-0 max-w-(--container-prose) lg:col-span-8 lg:col-start-5">
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate">
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
            <p className="mt-6 text-lead text-navy">{article.excerpt}</p>

            <div className="mt-12 border-t border-line pt-12">
              <ArticleBody blocks={article.blocks} />
            </div>

            {related.length ? (
              <aside aria-labelledby="passend-title" className="mt-16 border-t border-line pt-10">
                <h2 id="passend-title" className="text-h3 text-navy">
                  Passende Leistungen
                </h2>
                <ul className="mt-5 space-y-3">
                  {related.map((s) => (
                    <li key={s.slug}>
                      <Link href={serviceHref(s.slug)} className="group font-medium text-blue hover:text-blue-700">
                        {/* The arrow stays with the last word when a long name wraps. */}
                        {s.name.slice(0, s.name.lastIndexOf(" ") + 1)}
                        <span className="whitespace-nowrap">
                          {s.name.slice(s.name.lastIndexOf(" ") + 1)}
                          <ArrowRight
                            aria-hidden
                            className="ml-2 inline-block size-4 align-[-0.15em] transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </Container>
      </article>

      {more.length ? (
        <Section tone="cloud" labelledBy="weitere-title">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <SectionHeader id="weitere-title" title="Weitere Artikel" />
              <Link
                href="/insights"
                className="group mt-6 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
              >
                Alle Artikel
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:col-span-8">
              {more.map((a) => (
                <li key={a.slug}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      <CtaBand />
      <JsonLd data={articleJsonLd(article, path)} />
    </>
  );
}
