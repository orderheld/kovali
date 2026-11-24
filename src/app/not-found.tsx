import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DarkBackdrop } from "@/components/brand/motifs";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mainNav } from "@/content/navigation";

/** Tab title of the 404 page; the root layout's default title would show the logo tagline. */
export const metadata: Metadata = { title: "Seite nicht gefunden" };

/** Unknown addresses render outside the site layout, so the page brings its own chrome. */
export default function NotFound() {
  return (
    <SiteChrome>
      <section className="on-dark relative isolate overflow-hidden bg-night text-white">
        <DarkBackdrop />
        <Container className="relative py-24 md:py-32">
          <p className="eyebrow">Fehler 404</p>
          <h1 className="mt-5 max-w-2xl text-h1 font-semibold text-white">Diese Seite wurde nicht gefunden</h1>
          <p className="mt-6 max-w-xl text-lead text-white/70">
            Die Adresse ist möglicherweise veraltet oder falsch geschrieben. Diese Seiten helfen weiter:
          </p>
          <ul className="mt-9 grid max-w-2xl border-b border-white/10 sm:grid-cols-3 sm:gap-x-6">
            {mainNav.map((item, i) => (
              <li key={item.href} className="border-t border-white/10">
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 py-3.5 font-medium text-white/90 transition-colors hover:text-electric"
                >
                  <span aria-hidden className="font-mono text-[0.6875rem] text-sky/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ArrowUpRight aria-hidden className="size-4 text-white/35 group-hover:text-electric" />
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/" variant="inverse" arrow className="mt-10">
            Zur Startseite
          </ButtonLink>
        </Container>
      </section>
    </SiteChrome>
  );
}
