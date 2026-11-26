import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

/** Inter for the public site only (the admin area keeps Geist from the root layout). */
const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Skip link, header, main and footer of the public site. Used by the site layout and the 404 page.
 * The `site` wrapper scopes site-only CSS (font, heading weight, labels) so the admin area keeps
 * its own look; `display: contents` keeps the body's flex column layout.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(inter.variable, "site contents")}>
      <a
        href="#inhalt"
        className="sr-only z-[60] rounded-full bg-blue px-4 py-3 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-3"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt" className="flex-1 bg-white">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
