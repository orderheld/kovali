import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { ServiceIcon } from "@/components/sections/service-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { articleHref, articles, getArticle } from "@/content/insights";
import { articleCover } from "@/content/scenes";
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

/** "01", "02", … for the mono numbering of the table of contents. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Article page: banner with category, title, excerpt and date; the 3D cover and the text in a
 * reading column with a sticky table of contents beside it on large screens; the matching
 * services, further articles and the closing band. The banner also carries the breadcrumb
 * structured data.
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
          lead={
            <>
              <p>{article.excerpt}</p>
              <p className="mt-8 flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.06em] text-white/60">
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                {article.updatedAt ? (
                  <>
                    <span aria-hidden>/</span>
                    <span>
                      Aktualisiert am <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                    </span>
                  </>
                ) : null}
                <span aria-hidden>/</span>
                <span>{article.readingMinutes} Min. Lesezeit</span>
              </p>
            </>
          }
          size="lg"
        />

        <Container className="grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
          {toc.length > 1 ? (
            <nav aria-labelledby="toc-title" className="hidden self-start lg:sticky lg:top-28 lg:col-span-3 lg:block">
              <p id="toc-title" className="kicker">
                Inhalt
              </p>
              <ol className="mt-5 border-t border-line">
                {toc.map((h, i) => (
                  <li key={h.id} className="border-b border-line">
                    <a
                      href={`#${h.id}`}
                      className="flex gap-3 py-3 text-[0.9375rem] leading-snug text-slate transition-colors hover:text-night"
                    >
                      <span aria-hidden className="pt-[0.2em] font-mono text-xs text-blue">
                        {nr(i)}
                      </span>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="min-w-0 max-w-(--container-prose) lg:col-span-8 lg:col-start-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-night">
              <Image
                src={articleCover(article.slug)}
                alt=""
                fill
                sizes="(min-width: 1024px) 42rem, 92vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>

            <div className="mt-12 md:mt-16">
              <ArticleBody blocks={article.blocks} />
            </div>

            {related.length ? (
              <aside aria-labelledby="passend-title" className="mt-16 border-t border-line pt-12">
                <h2 id="passend-title" className="text-h3 text-night">
                  Passende Leistungen
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {related.map((s) => (
                    <li
                      key={s.slug}
                      className="group relative flex items-center gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-blue/40"
                    >
                      <ServiceIcon slug={s.slug} className="size-8 shrink-0" />
                      <Link
                        href={serviceHref(s.slug)}
                        className="min-w-0 flex-1 font-medium leading-snug text-night after:absolute after:inset-0 after:rounded-2xl group-hover:text-blue"
                      >
                        {s.name}
                      </Link>
                      <ArrowUpRight
                        aria-hidden
                        className="size-5 shrink-0 text-slate transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue"
                      />
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </Container>
      </article>

      {more.length ? (
        <Section tone="mist" labelledBy="weitere-title" space="loose">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionHeader id="weitere-title" kicker="Insights" title="Weitere Artikel" titleClassName="text-night" />
              <Link
                href="/insights"
                className="group mt-8 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
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
