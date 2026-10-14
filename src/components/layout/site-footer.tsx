import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { footerNav, legalNav, portalLogin } from "@/content/navigation";
import { isAdminConfigured } from "@/lib/admin/env";

/** Year of the build, injected in next.config.ts, so pages stay static. */
const year = process.env.NEXT_PUBLIC_BUILD_YEAR;

/** Read at build time like the year: the portal link appears with the deploy that has the portal settings. */
const bottomNav = isAdminConfigured() ? [portalLogin, ...legalNav] : legalNav;

/** Column headings are h2 for the outline but stay small and sans (the site serif is for content headings). */
const headingClass = "font-sans text-sm font-medium text-white/60";

export function SiteFooter() {
  const { email } = site.contact;
  return (
    <footer className="on-dark bg-navy text-white">
      <Container className="py-16 md:py-20">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-12">
          <div className="md:col-span-12 lg:col-span-5">
            <Link href="/" aria-label="KOVALI, zur Startseite" className="inline-block rounded">
              <Logo tone="dark" className="h-8 w-auto" />
            </Link>
            <p className="mt-6 max-w-sm leading-relaxed text-white/70">
              {site.brand} – IT Consulting für Business Analysis und Testmanagement in der ganzen Schweiz.{" "}
              {site.contact.title}: {site.contact.person}.
            </p>
            <p lang="en" className="mt-6 text-sm text-sky">
              {site.claim}
            </p>
          </div>

          {footerNav.map((group) => (
            <div key={group.title} className="md:col-span-4 lg:col-span-2">
              <h2 className={headingClass}>{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-[0.9375rem] text-white/80 hover:text-electric">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-4 lg:col-span-3">
            <h2 className={headingClass}>Kontakt</h2>
            <address className="mt-5 space-y-3 text-[0.9375rem] not-italic text-white/80">
              <p>
                <a href={`mailto:${email.value}`} className="hover:text-electric">
                  {email.value}
                </a>
              </p>
              <p>Vor Ort, remote oder hybrid in der ganzen Schweiz</p>
            </address>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.brand}. Ein Angebot von {site.legal.entityName.value}.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {bottomNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-electric">
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
