import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { footerNav, legalNav } from "@/content/navigation";
import { cn } from "@/lib/utils";

/** Year of the build, injected in next.config.ts, so pages stay static. */
const year = process.env.NEXT_PUBLIC_BUILD_YEAR;

/** Column headings are h2 for the outline but read as small mono labels. */
const headingClass = "font-mono text-xs font-medium uppercase tracking-[0.08em] text-sky";

/** Large-screen width of each link group: IT Consulting has the long service names. */
const groupSpans = ["lg:col-span-3", "lg:col-span-2"];

export function SiteFooter() {
  const { email } = site.contact;
  return (
    <footer className="on-dark relative isolate overflow-hidden border-t border-white/10 bg-night text-white">
      <div
        aria-hidden
        className="tech-grid pointer-events-none absolute inset-0 -z-10 [--grid-color:rgb(143_201_255/0.05)] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
      />
      <Container className="py-16 md:py-20">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-12">
          <div className="md:col-span-12 lg:col-span-4">
            <Link href="/" aria-label="KOVALI, zur Startseite" className="inline-block rounded">
              <Logo tone="dark" className="h-8 w-auto" />
            </Link>
            <p className="mt-6 max-w-sm leading-relaxed text-white/70">
              {site.brand} – IT Consulting für Business Analysis und Testmanagement in der ganzen Schweiz.{" "}
              {site.contact.title}: {site.contact.person}.
            </p>
            <p lang="en" className="mt-6 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.08em] text-electric">
              <span aria-hidden className="h-px w-6 bg-electric" />
              {site.claim}
            </p>
          </div>

          {footerNav.map((group, i) => (
            <div key={group.title} className={cn("md:col-span-4", groupSpans[i] ?? "lg:col-span-2")}>
              <h2 className={headingClass}>{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-[0.9375rem] text-white/75 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-4 lg:col-span-3">
            <h2 className={headingClass}>Kontakt</h2>
            <address className="mt-5 space-y-3 text-[0.9375rem] not-italic text-white/75">
              <p>
                <a href={`mailto:${email.value}`} className="text-white underline decoration-white/30 underline-offset-4 transition-colors hover:text-electric hover:decoration-electric">
                  {email.value}
                </a>
              </p>
              <p>Vor Ort, remote oder hybrid in der ganzen Schweiz</p>
            </address>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 font-mono text-xs text-white/60 md:flex-row md:items-center md:justify-between">
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
