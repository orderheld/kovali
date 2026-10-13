import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { footerNav, legalNav } from "@/content/navigation";

/** Year of the build, injected in next.config.ts, so pages stay static. */
const year = process.env.NEXT_PUBLIC_BUILD_YEAR;

export function SiteFooter() {
  const { address, email } = site.contact;
  return (
    <footer className="on-dark bg-navy text-white">
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" aria-label="KOVALI, zur Startseite" className="inline-block rounded">
              <Logo tone="dark" className="h-8 w-auto" />
            </Link>
            <p className="mt-6 max-w-sm leading-relaxed text-white/70">
              {site.tagline}. Business Analysis, Requirements Engineering, Application Management und Test
              Management für IT-Projekte in der Schweiz.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-electric">{site.claim}</p>
          </div>

          {footerNav.map((group) => (
            <div key={group.title} className="md:col-span-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-white/50">{group.title}</h2>
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

          <div className="md:col-span-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-white/50">Kontakt</h2>
            <address className="mt-5 space-y-3 text-[0.9375rem] not-italic text-white/80">
              <p>
                {site.brand}
                <br />
                {address.street}
                <br />
                {address.postalCode} {address.city}, {address.country}
              </p>
              <p>
                <a href={`mailto:${email.value}`} className="hover:text-electric">
                  {email.value}
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.brand}. Ein Angebot von {site.legal.entityName.value}.
          </p>
          <ul className="flex gap-6">
            {legalNav.map((item) => (
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
