import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { primaryCta } from "@/content/navigation";
import { DesktopNav } from "./nav-links";
import { MobileNav } from "./mobile-nav";

/**
 * Sticky light header: wordmark, main navigation and the contact button, on translucent white
 * with a blur. The translucency and blur sit on a pseudo-element: a backdrop-filter on the
 * header itself would make it the containing block of the fixed mobile menu panel and collapse
 * that panel to 1 px.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline/60 before:absolute before:inset-0 before:-z-10 before:bg-white/95 supports-[backdrop-filter]:before:bg-white/80 supports-[backdrop-filter]:before:backdrop-blur-xl supports-[backdrop-filter]:before:backdrop-saturate-150">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="-m-1 flex shrink-0 items-center rounded p-1">
          <Wordmark />
          <span className="sr-only">, zur Startseite</span>
        </Link>
        <div className="flex items-center gap-3 lg:gap-6">
          <DesktopNav />
          <ButtonLink href={primaryCta.href} size="sm" className="hidden sm:inline-flex">
            {primaryCta.label}
          </ButtonLink>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
