import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { footerNav, legalNav } from "@/content/navigation";

/** Year of the build, injected in next.config.ts, so pages stay static. */
const year = process.env.NEXT_PUBLIC_BUILD_YEAR;

/** Column headings are h2 for the outline. */
const headingClass = "text-[0.8125rem] font-semibold text-graphite";
const linkClass = "inline-flex min-h-10 items-center text-[0.875rem] text-muted transition-colors hover:text-graphite";

/** Calm light-grey footer: wordmark, link columns, contact, legal line. */
export function SiteFooter() {
  const { email } = site.contact;
  return (
    <footer className="border-t border-hairline/70 bg-canvas">
      <Container className="pb-10 pt-14 md:pt-16">
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-12">
          <div className="md:col-span-12 lg:col-span-4">
            <Link href="/" className="-my-1 inline-block rounded py-1">
              <Wordmark />
              <span className="sr-only">, zur Startseite</span>
            </Link>
            <p className="mt-5 max-w-xs text-[0.875rem] leading-relaxed text-muted">
              IT Consulting für Requirements Engineering, Business Analysis und Softwaretest in der ganzen Schweiz.
            </p>
          </div>

          {footerNav.map((group) => (
            <div key={group.title} className="md:col-span-4 lg:col-span-3">
              <h2 className={headingClass}>{group.title}</h2>
              <ul className="mt-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-4 lg:col-span-2">
            <h2 className={headingClass}>Kontakt</h2>
            <p className="mt-3">
              <a href={`mailto:${email.value}`} className={linkClass}>
                {email.value}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 text-[0.8125rem] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.brand}. Ein Angebot von {site.legal.entityName.value}.
          </p>
          <ul className="-my-2 flex flex-wrap gap-x-6">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-10 items-center transition-colors hover:text-graphite">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
