import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { primaryCta } from "@/content/navigation";
import { DesktopNav } from "./nav-links";
import { MobileNav } from "./mobile-nav";

/** Sticky white header: wordmark, main navigation and the contact button. */
export function SiteHeader() {
  return (
    // Solid white on purpose: a backdrop-filter here would make the header the containing block
    // of the fixed mobile menu panel and collapse it to the header's height.
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white text-navy">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Link href="/" className="-m-1 shrink-0 rounded p-1">
          <Wordmark />
          <span className="sr-only">, zur Startseite</span>
        </Link>
        <div className="flex items-center gap-4 lg:gap-10">
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
