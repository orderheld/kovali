import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteChrome } from "@/components/layout/site-chrome";
import { PageBanner } from "@/components/sections/page-banner";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { mainNav, primaryCta } from "@/content/navigation";

/** Tab title of the 404 page; the root layout's default title would show the logo tagline. */
export const metadata: Metadata = { title: "Seite nicht gefunden" };

const links = [...mainNav, primaryCta];

/** Unknown addresses render outside the site layout, so the page brings its own chrome. */
export default function NotFound() {
  return (
    <SiteChrome>
      <PageBanner
        scene="rechtliches"
        kicker="Fehler 404"
        title="Diese Seite wurde nicht gefunden"
        lead="Die Adresse ist vielleicht veraltet oder falsch geschrieben."
      />
      <Section tone="white" labelledBy="weiter-titel">
        <div className="mx-auto max-w-2xl">
          <h2 id="weiter-titel" className="text-h3 text-navy">
            Hier geht es weiter
          </h2>
          <ul className="mt-8 border-b border-line">
            {links.map((item) => (
              <li key={item.href} className="border-t border-line">
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-6 py-5 text-lg text-navy transition-colors hover:text-blue"
                >
                  {item.label}
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.5}
                    className="size-5 shrink-0 text-blue transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/" className="mt-12">
            Zur Startseite
          </ButtonLink>
        </div>
      </Section>
    </SiteChrome>
  );
}
