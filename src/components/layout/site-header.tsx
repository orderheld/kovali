import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { primaryCta } from "@/content/navigation";
import { DesktopNav } from "./nav-links";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    // The blur sits on a pseudo-element: backdrop-filter on the header itself would
    // become the containing block of the fixed mobile menu panel.
    <header className="sticky top-0 z-50 border-b border-line/80 before:absolute before:inset-0 before:-z-10 before:bg-white/90 before:backdrop-blur-md supports-[backdrop-filter]:before:bg-white/80">
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="-m-1 shrink-0 rounded p-1" aria-label="KOVALI, zur Startseite">
          <Logo className="h-7 w-auto sm:h-[1.875rem]" />
        </Link>
        <div className="flex items-center gap-4">
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
