/**
 * Content types. All copy lives in src/content and is rendered by components;
 * inline links use the form [Label](/pfad) inside text strings.
 */

export type ServiceSlug =
  /** Business Analysis & Requirements Engineering (one service; /leistungen/requirements-engineering redirects here). */
  | "business-analysis"
  | "application-management"
  | "test-management"
  | "test-engineering";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Service {
  slug: ServiceSlug;
  /** Visible name of the discipline, e.g. "Testmanagement" (one word in visible copy). */
  name: string;
  /** Short line for lists and navigation: when the discipline helps and what we do. */
  summary: string;
  /** H2 beside the intro on the discipline page (SEO phrasing, keep stable). */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Main keyword this page is optimised for (see concept, keyword mapping). */
  keyword: string;
  /** Intro paragraph of the discipline page. */
  intro: string;
  /** H2 of the task list, hand-written per discipline (no template strings). */
  tasksTitle: string;
  /** At most ten, most important first: /leistungen lists the first six. */
  tasks: string[];
  /** Listed under "Ergebnisse" on the discipline page. */
  deliverables: string[];
  /** H2 of the FAQ section, hand-written per discipline. */
  faqTitle: string;
  /** Discipline-specific questions (visible FAQ and FAQPage JSON-LD). */
  faq: FaqItem[];
  /** H2 of the closing call to action, hand-written per discipline. */
  ctaTitle: string;
  /** Label of the contextual call to action. */
  cta: string;
}

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; title: string; text: string }
  | { type: "table"; caption: string; head: string[]; rows: string[][] };

export interface Article {
  slug: string;
  title: string;
  /** <title> without the " | <site.brand>" suffix, max. ~55 characters. */
  metaTitle: string;
  /** Meta description, 140–160 characters. */
  description: string;
  keyword: string;
  category: string;
  /** ISO date, e.g. "2026-10-13". */
  publishedAt: string;
  updatedAt?: string;
  excerpt: string;
  relatedServices: ServiceSlug[];
  blocks: ArticleBlock[];
}

/** Article as listed and rendered: the reading time is computed from `blocks` (insights/index.ts). */
export interface PublishedArticle extends Article {
  readingMinutes: number;
}
