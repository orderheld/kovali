import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { footerNav, legalNav } from "@/content/navigation";

/** Year of the build, injected in next.config.ts, so pages stay static. */
const year = process.env.NEXT_PUBLIC_BUILD_YEAR;

/** Column headings are h2 for the outline. */
const headingClass = "text-base font-medium text-white";

export function SiteFooter() {
  const { email } = site.contact;
  return (
    <footer className="on-dark bg-navy text-white">
      <Container className="pb-10 pt-16 md:pt-20">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-12">
          <div className="md:col-span-12 lg:col-span-4">
            <Link href="/" className="inline-block rounded">
              <Wordmark tone="dark" />
              <span className="sr-only">, zur Startseite</span>
            </Link>
            <p className="mt-7 max-w-xs leading-relaxed text-white/70">
              IT Consulting für Business Analysis, Requirements Engineering und Softwaretest in der ganzen Schweiz.
            </p>
          </div>

          {footerNav.map((group) => (
            <div key={group.title} className="md:col-span-5 lg:col-span-3">
              <h2 className={headingClass}>{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-[0.9375rem] text-white/70 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-2 lg:col-span-2">
            <h2 className={headingClass}>Kontakt</h2>
            <p className="mt-5 text-[0.9375rem]">
              <a
                href={`mailto:${email.value}`}
                className="text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              >
                {email.value}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.brand}. Ein Angebot von {site.legal.entityName.value}.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
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
