import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/config/site";

/** Only production on the site's own domain may be indexed (see isIndexable). */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
