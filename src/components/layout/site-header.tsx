import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { primaryCta } from "@/content/navigation";
import { DesktopNav } from "./nav-links";
import { MobileNav } from "./mobile-nav";

/**
 * Sticky dark-glass header. Every page opens with a dark hero, so the header reads as part of
 * it; over light content further down it stays a dark bar with the white logo.
 */
export function SiteHeader() {
  return (
    // The blur sits on a pseudo-element: backdrop-filter on the header itself would
    // become the containing block of the fixed mobile menu panel.
    <header className="on-dark sticky top-0 z-50 border-b border-white/[0.08] text-white before:absolute before:inset-0 before:-z-10 before:bg-night/95 before:backdrop-blur-xl supports-[backdrop-filter]:before:bg-night/80">
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="-m-1 shrink-0 rounded p-1" aria-label="KOVALI, zur Startseite">
          <Logo tone="dark" className="h-7 w-auto sm:h-[1.875rem]" />
        </Link>
        <div className="flex items-center gap-3 lg:gap-5">
          <DesktopNav />
          <ButtonLink href={primaryCta.href} size="sm" variant="inverse" className="hidden sm:inline-flex">
            {primaryCta.label}
          </ButtonLink>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
