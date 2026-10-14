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

export type IndustryId =
  | "oeffentliche-verwaltung"
  | "logistik-transport"
  | "detailhandel-zahlungsverkehr"
  | "finanzdienstleistungen"
  | "versicherungen"
  | "it-dienstleister";

export interface TitledText {
  title: string;
  text: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Service {
  slug: ServiceSlug;
  /** Two-digit position in the order of `services` (01–04). Internal only, no longer displayed. */
  code: string;
  /** Visible name of the discipline, e.g. "Testmanagement" (one word in visible copy). */
  name: string;
  /** Short line for lists and navigation: when the discipline helps and what KOVALI does. */
  summary: string;
  /** H1 of the discipline page (SEO, keep stable). */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Main keyword this page is optimised for (see concept, keyword mapping). */
  keyword: string;
  /** Lead of the discipline page. */
  intro: string;
  /** H2 of the task list, hand-written per discipline (no template strings). */
  tasksTitle: string;
  tasks: string[];
  deliverables: string[];
  /** Typical starting points as running sentences in the Sie-form. */
  situations: string[];
  industries: IndustryId[];
  methods: string[];
  /** H2 of the FAQ section, hand-written per discipline. */
  faqTitle: string;
  /** Discipline-specific questions; the page puts the shared price question (`priceFaq`) first. */
  faq: FaqItem[];
  /** H2 of the closing call to action, hand-written per discipline. */
  ctaTitle: string;
  /** Label of the contextual call to action. */
  cta: string;
}

export interface Industry {
  id: IndustryId;
  name: string;
  /** experience = sector known from practice; target = market KOVALI is building. */
  kind: "experience" | "target";
  summary: string;
  points: string[];
  services: ServiceSlug[];
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
  /** <title> without the " | KOVALI" suffix, max. ~55 characters. */
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
