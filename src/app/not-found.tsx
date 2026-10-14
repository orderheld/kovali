import type { Metadata } from "next";
import Link from "next/link";
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
      <section className="bg-paper">
        <Container className="py-24 md:py-32">
          <p className="text-sm font-medium text-blue">Fehler 404</p>
          <h1 className="mt-4 max-w-2xl text-h1 font-medium">Diese Seite wurde nicht gefunden</h1>
          <p className="mt-6 max-w-xl text-lead text-slate">
            Die Adresse ist möglicherweise veraltet oder falsch geschrieben. Diese Seiten helfen weiter:
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-medium text-blue hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/" arrow className="mt-10">
            Zur Startseite
          </ButtonLink>
        </Container>
      </section>
    </SiteChrome>
  );
}
