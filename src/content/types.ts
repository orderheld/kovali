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
  /** Two-digit position along the chain from requirement to acceptance. */
  code: string;
  name: string;
  /** Short line for cards and navigation. */
  summary: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Main keyword this page is optimised for (see concept, keyword mapping). */
  keyword: string;
  intro: string;
  tasks: string[];
  deliverables: string[];
  benefits: TitledText[];
  scenarios: TitledText[];
  industries: IndustryId[];
  methods: string[];
  faq: FaqItem[];
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
  /** What transfers to a target market. Not used for experience entries (no CV details on the site). */
  basis?: string;
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
  readingMinutes: number;
  excerpt: string;
  relatedServices: ServiceSlug[];
  blocks: ArticleBlock[];
}
