import type { Article } from "../types";
import { article as wasMachtEinBusinessAnalyst } from "./was-macht-ein-business-analyst";
import { article as baVsRe } from "./business-analysis-vs-requirements-engineering";
import { article as externerBusinessAnalyst } from "./externer-business-analyst";

/** Published articles, newest first. New articles: add a file and list it here. */
export const articles: Article[] = [wasMachtEinBusinessAnalyst, baVsRe, externerBusinessAnalyst].sort(
  (a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt),
);

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function articleHref(slug: string): string {
  return `/insights/${slug}`;
}
