import type { ArticleBlock, PublishedArticle } from "../types";
import { article as wasMachtEinBusinessAnalyst } from "./was-macht-ein-business-analyst";
import { article as baVsRe } from "./business-analysis-vs-requirements-engineering";
import { article as externerBusinessAnalyst } from "./externer-business-analyst";

const WORDS_PER_MINUTE = 200;

/** Visible text of one content block. */
function blockText(block: ArticleBlock): string[] {
  switch (block.type) {
    case "p":
    case "h2":
    case "h3":
      return [block.text];
    case "ul":
    case "ol":
      return block.items;
    case "callout":
      return [block.title, block.text];
    case "table":
      return [block.caption, ...block.head, ...block.rows.flat()];
  }
}

/**
 * Reading time in minutes from the word count of the article body (spec 3.10): 200 words per
 * minute, at least 1. Link markup "[Label](/pfad)" counts as its label only.
 */
export function readingMinutes(blocks: readonly ArticleBlock[]): number {
  const words = blocks
    .flatMap(blockText)
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Published articles, newest first. New articles: add a file and list it here. The reading
 * time is computed from the text.
 */
export const articles: PublishedArticle[] = [wasMachtEinBusinessAnalyst, baVsRe, externerBusinessAnalyst]
  .map((a) => ({ ...a, readingMinutes: readingMinutes(a.blocks) }))
  .sort((a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt));

export function getArticle(slug: string): PublishedArticle | undefined {
  return articles.find((a) => a.slug === slug);
}

export function articleHref(slug: string): string {
  return `/insights/${slug}`;
}
