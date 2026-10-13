import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

/** Only the production deployment may be indexed (Vercel sets VERCEL_ENV). */
const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
