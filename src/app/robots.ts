import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/config/site";

/**
 * Only production on the site's own domain may be indexed (see isIndexable). Elsewhere the
 * pages carry a noindex tag, and crawlers must be allowed to fetch them to read it: a
 * robots.txt block would hide the tag, and linked URLs could still be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
