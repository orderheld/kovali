import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/** Skip link, header, main and footer of the public site. Used by the site layout and the 404 page. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#inhalt"
        className="sr-only z-[60] rounded-md bg-navy px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
