import { SiteChrome } from "@/components/layout/site-chrome";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/** The whole public site is prerendered at build time; request-time rendering fails the build. */
export const ensureStatic = "navigation";

/** Public website: header, footer and structured data around every page. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteChrome>{children}</SiteChrome>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
    </>
  );
}
