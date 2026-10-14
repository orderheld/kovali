import { Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Serif for h1, h2, large numerals and the KO/VA/LI letters of the public site. Self-hosted
 * at build time by next/font (no request to Google from the browser; CSP font-src 'self').
 * Loaded here rather than in the root layout, which the admin area shares.
 */
const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

/**
 * Skip link, header, main and footer of the public site. Used by the site layout and the 404 page.
 * The `site` wrapper scopes site-only CSS (serif headings) and carries the font variable;
 * `display: contents` keeps the body's flex column layout.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site contents ${newsreader.variable}`}>
      <a
        href="#inhalt"
        className="sr-only z-[60] rounded-md bg-navy px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-3"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
