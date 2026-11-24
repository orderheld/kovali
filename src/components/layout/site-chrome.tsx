import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * Skip link, header, main and footer of the public site. Used by the site layout and the 404 page.
 * The `site` wrapper scopes site-only CSS (heading weight, mono eyebrows) so the admin area keeps
 * its own look; `display: contents` keeps the body's flex column layout. Type is Geist Sans and
 * Geist Mono, loaded once in the root layout.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="site contents">
      <a
        href="#inhalt"
        className="sr-only z-[60] rounded-md bg-electric px-4 py-3 font-medium text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-3"
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
