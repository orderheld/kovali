import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteChrome } from "@/components/layout/site-chrome";
import { PageBanner } from "@/components/sections/page-banner";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { mainNav, primaryCta } from "@/content/navigation";

/** Tab title of the 404 page; the root layout's default title would show the logo tagline. */
export const metadata: Metadata = { title: "Seite nicht gefunden" };

const links = [...mainNav, primaryCta];

/** "01", "02", … for the mono numbering of the link cards. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Unknown addresses render outside the site layout, so the page brings its own chrome: the
 * dark page header with the error label, the main pages as link cards and one button to the
 * start page.
 */
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
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 id="weiter-titel" className="text-h2 text-night">
              Hier geht es weiter
            </h2>
            <ButtonLink href="/" className="mt-8">
              Zur Startseite
            </ButtonLink>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {links.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-white p-6 transition-colors hover:border-blue/40 hover:bg-mist sm:min-h-32 sm:gap-8"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span aria-hidden className="font-mono text-xs text-blue">
                      {nr(i)}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      strokeWidth={1.5}
                      className="size-5 text-slate transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue"
                    />
                  </span>
                  <span className="text-h3 font-medium text-night">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </SiteChrome>
  );
}
