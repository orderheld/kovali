import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SiteChrome } from "@/components/layout/site-chrome";
import { PageBanner } from "@/components/sections/page-banner";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { mainNav, primaryCta } from "@/content/navigation";

/** Tab title of the 404 page; the root layout's default title would show the logo tagline. */
export const metadata: Metadata = { title: "Seite nicht gefunden" };

const links = [...mainNav, primaryCta];

/**
 * Unknown addresses render outside the site layout, so the page brings its own chrome: the
 * light page header with the error label, the main pages as link cards and one button to the
 * start page.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <PageBanner
        kicker="Fehler 404"
        title="Diese Seite wurde nicht gefunden"
        lead="Die Adresse ist vielleicht veraltet oder falsch geschrieben."
      >
        <ButtonLink href="/">Zur Startseite</ButtonLink>
      </PageBanner>
      <Section tone="canvas" labelledBy="weiter-titel">
        <h2 id="weiter-titel" className="text-h2 text-graphite">
          Hier geht es weiter
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full items-center justify-between gap-6 rounded-3xl bg-white p-7 transition-colors duration-200 hover:text-blue"
              >
                <span className="text-h3 font-semibold text-graphite group-hover:text-blue">{item.label}</span>
                <ChevronRight aria-hidden strokeWidth={2} className="size-5 shrink-0 text-blue" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </SiteChrome>
  );
}
