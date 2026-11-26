import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { isIndexable, site } from "@/config/site";
import { shareImage } from "@/lib/seo";
import "./globals.css";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

/**
 * Geist for the admin area and the monospaced example artefacts, defined like the geist package
 * does but without preload: the public site uses Inter (site-chrome.tsx), so preloading Geist
 * would load about 140 KB on every public page for nothing. Without preload, the files load
 * only where a page uses them.
 */
const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  preload: false,
});
const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Roboto Mono", "Menlo", "Monaco", "Liberation Mono", "DejaVu Sans Mono", "Courier New", "monospace"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url.value),
  title: {
    default: `${site.brand} – ${site.tagline}`,
    template: `%s | ${site.brand}`,
  },
  description: site.description,
  applicationName: site.brand,
  authors: [{ name: site.contact.person }],
  creator: site.brand,
  publisher: site.brand,
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: site.brand,
    locale: "de_CH",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [shareImage.url],
  },
  robots: isIndexable ? { index: true, follow: true } : { index: false, follow: false },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

/**
 * Shared document shell for the public site (`(site)/layout.tsx`, prerendered) and the
 * admin area (`admin/`, rendered per request). Page chrome lives in those layouts.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
