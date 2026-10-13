import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { isIndexable, site } from "@/config/site";
import "./globals.css";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

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
    <html lang="de-CH" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
