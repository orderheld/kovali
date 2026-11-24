import type { Metadata } from "next";
import { absoluteUrl, site } from "@/config/site";
import { company } from "@/content/company-ref";
import type { Article, FaqItem, Service } from "@/content/types";

interface PageMetaInput {
  /** Title without the " | <site.brand>" suffix (the layout template adds it). */
  title: string;
  description: string;
  /** Open Graph and Twitter text when it must differ from the meta description. */
  shareDescription?: string;
  path: string;
  /** Use for the home page, where the template must not apply. */
  absoluteTitle?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

/**
 * Default share image (public/opengraph-image.png), set on every page: by pageMetadata and,
 * for pages without their own metadata (404, admin), by the root layout. It holds no text (a
 * night panorama and the K symbol), so a new brand name needs no new image; the alt text takes
 * the name from site.brand.
 */
export const shareImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: `${site.brand}: Alpenpanorama in Linien mit dem Logo-Symbol`,
};

/** Metadata for a page: canonical URL, Open Graph and Twitter. */
export function pageMetadata(input: PageMetaInput): Metadata {
  const url = input.path;
  const ogTitle = input.absoluteTitle ? input.title : `${input.title} | ${site.brand}`;
  const shareDescription = input.shareDescription ?? input.description;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: input.type ?? "website",
      url,
      siteName: site.brand,
      locale: "de_CH",
      title: ogTitle,
      description: shareDescription,
      images: [shareImage],
      ...(input.type === "article"
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime ?? input.publishedTime,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: shareDescription,
      images: [shareImage.url],
    },
    // Articles carry no personal byline until Ferhat Demir confirms authorship (spec 3.10):
    // replaces the root layout's author, matching the BlogPosting JSON-LD below.
    ...(input.type === "article" ? { authors: [{ name: site.brand, url: absoluteUrl("/") }] } : {}),
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* ---------- Structured data (schema.org). Only facts that are true today. ---------- */

const ORG_ID = `${absoluteUrl("/")}#organization`;
/** Ferhat Demir's person block on the company page (/unternehmen) carries the anchor #ferhat-demir. */
const PERSON_ID = `${absoluteUrl("/unternehmen")}#ferhat-demir`;
const WEBSITE_ID = `${absoluteUrl("/")}#website`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: site.brand,
    ...(site.legal.entityName.confirmed ? { legalName: site.legal.entityName.value } : {}),
    description: site.description,
    url: absoluteUrl("/"),
    // The symbol only: the full logo has the name drawn into it.
    logo: absoluteUrl("/brand/kovali-app-icon-512.png"),
    image: absoluteUrl("/opengraph-image.png"),
    email: site.contact.email.value,
    ...(site.contact.phone.value ? { telephone: site.contact.phone.value } : {}),
    // Only the country: the full address belongs in the imprint, not in marketing data.
    address: { "@type": "PostalAddress", addressCountry: site.contact.address.countryCode },
    areaServed: site.areaServed.map((name) => ({ "@type": "Country", name })),
    knowsLanguage: ["de", "fr", "en"],
    knowsAbout: company.knowsAbout,
    ...(site.social.linkedin ? { sameAs: [site.social.linkedin] } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.brand,
    url: absoluteUrl("/"),
    inLanguage: site.locale,
    publisher: { "@id": ORG_ID },
  };
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: company.founder.name,
    jobTitle: company.founder.role,
    worksFor: { "@id": ORG_ID },
    url: absoluteUrl("/unternehmen"),
    image: absoluteUrl(company.founder.portrait.src),
    knowsLanguage: ["de", "fr", "en"],
    hasCredential: company.certifications.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.credential,
      credentialCategory: "certification",
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serviceJsonLd(service: Service, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.metaDescription,
    url: absoluteUrl(path),
    provider: { "@id": ORG_ID },
    areaServed: site.areaServed.map((name) => ({ "@type": "Country", name })),
    availableLanguage: ["de", "fr", "en"],
  };
}

export function faqJsonLd(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: stripLinks(f.answer) },
    })),
  };
}

export function articleJsonLd(article: Article, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: site.locale,
    keywords: article.keyword,
    articleSection: article.category,
    // The organisation until Ferhat Demir approves a personal byline (spec 3.10 and 7.19).
    author: { "@type": "Organization", "@id": ORG_ID, name: site.brand, url: absoluteUrl("/") },
    publisher: { "@id": ORG_ID },
    image: absoluteUrl("/opengraph-image.png"),
  };
}

/** "[Label](/pfad)" → "Label" for plain-text contexts. */
export function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
