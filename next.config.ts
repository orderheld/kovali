import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy without nonces, so every page can stay static.
 * No third-party scripts, fonts or trackers are loaded.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

/** Admin area: never cached, never indexed. */
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  env: {
    // Copyright year in the footer, fixed at build time so pages stay static.
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  experimental: {
    serverActions: {
      // The admin uploads files of up to 4 MB (DOCUMENT_MAX_BYTES) and the profile form on
      // the website accepts a CV of the same size. 4.5 MB is also the request body limit of
      // Vercel Functions, so a larger value would not help.
      bodySizeLimit: "4.5mb",
    },
  },
  async redirects() {
    return [
      // "Für Partner" became "Für Unternehmen" (two entries: companies and specialists).
      { source: "/partner", destination: "/unternehmen", permanent: true },
      // Requirements Engineering is part of the combined service Business Analysis & Requirements Engineering.
      { source: "/leistungen/requirements-engineering", destination: "/leistungen/business-analysis", permanent: true },
      // "Über uns" became "Warum KOVALI"; "warum-wir" is Ferhat Demir's own word for the page.
      { source: "/ueber-uns", destination: "/warum-kovali", permanent: true },
      { source: "/warum-wir", destination: "/warum-kovali", permanent: true },
      // /leistungen is the IT Consulting page: a short URL for cards and LinkedIn, and the
      // reserved slug below it, so it never reaches the [slug] route as a 404.
      { source: "/it-consulting", destination: "/leistungen", permanent: true },
      { source: "/leistungen/it-consulting", destination: "/leistungen", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
