import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleCard } from "@/components/sections/article-card";
import { CtaBand } from "@/components/sections/cta-band";
import { ServiceList } from "@/components/sections/service-list";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { site } from "@/config/site";
import { articleHref, articles, getArticle } from "@/content/insights";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

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

export default async function ArticlePage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const path = articleHref(article.slug);
  const crumbs = [
    { name: "Start", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: article.title, path },
  ];
  const toc = article.blocks.flatMap((b) => (b.type === "h2" ? [b] : []));
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <article>
        <header className="border-b border-line bg-mist">
          <Container className="pb-14 pt-10 md:pb-16 md:pt-12">
            <Breadcrumbs items={crumbs} />
            <div className="mt-12 max-w-3xl md:mt-16">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-blue">{article.category}</p>
              <h1 className="mt-4 text-h1 font-semibold">{article.title}</h1>
              <p className="mt-6 text-lead text-slate">{article.excerpt}</p>
              <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate">
                <span>
                  Von <span className="font-medium text-ink">{site.contact.person}</span>
                </span>
                <span aria-hidden>·</span>
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                {article.updatedAt ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Aktualisiert <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                    </span>
                  </>
                ) : null}
                <span aria-hidden>·</span>
                <span>{article.readingMinutes} Min. Lesezeit</span>
              </p>
            </div>
          </Container>
        </header>

        <Container className="grid gap-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
          <nav aria-labelledby="toc-title" className="self-start lg:sticky lg:top-28 lg:order-2 lg:col-span-3 lg:col-start-10">
            <p id="toc-title" className="font-mono text-xs uppercase tracking-[0.12em] text-slate">
              Inhalt
            </p>
            <ol className="mt-4 space-y-2.5 border-l border-line text-[0.9375rem]">
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-4 text-slate hover:border-blue hover:text-blue">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="min-w-0 lg:col-span-8">
            <ArticleBody blocks={article.blocks} />
          </div>
        </Container>
      </article>

      <Section tone="mist" labelledBy="passend-title" className="md:py-20">
        <p className="eyebrow">Passende Leistungen</p>
        <h2 id="passend-title" className="mt-4 text-h2 font-semibold">
          Unterstützung für Ihr Vorhaben
        </h2>
        <ServiceList only={article.relatedServices} className="mt-10" />
        {more.length ? (
          <>
            <h2 className="mt-20 text-2xl font-semibold tracking-tight">Weitere Beiträge</h2>
            <ul className="mt-8 grid gap-5 md:grid-cols-2">
              {more.map((a) => (
                <li key={a.slug}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      <CtaBand />
      <JsonLd data={[articleJsonLd(article, path), breadcrumbJsonLd(crumbs)]} />
    </>
  );
}
