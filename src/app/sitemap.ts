import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { articleHref, articles } from "@/content/insights";
import { serviceHref, services } from "@/content/services";

/**
 * Fixed modification date of the static pages. Update it when page content changes
 * (a fixed value keeps the sitemap static and the dates honest).
 */
const SITE_UPDATED = "2026-10-13";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, lastModified = SITE_UPDATED) => ({
    url: absoluteUrl(path),
    lastModified,
    priority,
  });

  return [
    page("/", 1),
    page("/leistungen", 0.9),
    ...services.map((s) => page(serviceHref(s.slug), 0.9)),
    page("/branchen", 0.7),
    page("/partner", 0.8),
    page("/ueber-uns", 0.7),
    page("/kontakt", 0.8),
    page("/insights", 0.6),
    ...articles.map((a) => page(articleHref(a.slug), 0.6, a.updatedAt ?? a.publishedAt)),
    page("/impressum", 0.2),
    page("/datenschutz", 0.2),
  ];
}
