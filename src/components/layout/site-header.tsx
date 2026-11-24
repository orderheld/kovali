import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { primaryCta } from "@/content/navigation";
import { DesktopNav } from "./nav-links";
import { MobileNav } from "./mobile-nav";

/**
 * Sticky dark header: wordmark, main navigation and the contact button. Solid night, so it
 * reads the same over dark and light sections. Never give it a backdrop-filter: that makes the
 * header the containing block of the fixed mobile menu panel and collapses the panel to 1 px.
 */
export function SiteHeader() {
  return (
    <header className="on-dark sticky top-0 z-50 border-b border-white/[0.08] bg-night text-white">
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="-m-1 shrink-0 rounded p-1">
          <Wordmark />
          <span className="sr-only">, zur Startseite</span>
        </Link>
        <div className="flex items-center gap-3 lg:gap-8">
          <DesktopNav />
          <ButtonLink href={primaryCta.href} variant="light" size="sm" className="hidden sm:inline-flex">
            {primaryCta.label}
          </ButtonLink>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
