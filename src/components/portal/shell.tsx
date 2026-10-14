"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Briefcase, FileText, House, IdCard, LogOut, UserRound, UserRoundCog } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Frame of the candidate portal: a calm white header with the KOVALI logo, a horizontal
 * navigation from tablet width and a bottom tab bar on phones (where most candidates are).
 */

const items = [
  { href: "/portal", label: "Übersicht", short: "Übersicht", icon: House, exact: true },
  { href: "/portal/profil", label: "Profil", short: "Profil", icon: UserRound, also: ["/portal/stammdaten"] },
  { href: "/portal/stammdaten", label: "Stammdaten", short: "Stammdaten", icon: IdCard, desktopOnly: true },
  { href: "/portal/vakanzen", label: "Vakanzen", short: "Vakanzen", icon: Briefcase, count: "vacancies" as const },
  { href: "/portal/dokumente", label: "Dokumente", short: "Dokumente", icon: FileText },
  { href: "/portal/konto", label: "Konto", short: "Konto", icon: UserRoundCog },
];

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Logs out and then loads the login page fresh, so no previously visited portal page stays in
 * the browser's memory (Next.js keeps recent pages mounted for back navigation).
 */
export function PortalLogoutButton({ logout, className, label = "Abmelden", target = "/portal/login" }: { logout: () => Promise<void>; className?: string; label?: string; target?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout();
          window.location.replace(target);
        })
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-slate hover:bg-mist hover:text-ink disabled:opacity-60",
        className,
      )}
    >
      <LogOut aria-hidden className="size-4" />
      {label}
    </button>
  );
}

export function PortalShell({
  name,
  counts,
  logout,
  contact,
  children,
}: {
  name: string;
  counts: { vacancies: number };
  logout: () => Promise<void>;
  /** From the site config (server side), so the client bundle does not carry it. */
  contact: { entity: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // On phones Stammdaten has no tab of its own; it belongs to "Profil" there.
  const isActive = (item: (typeof items)[number]) => active(pathname, item.href, item.exact) || Boolean(item.also?.some((p) => active(pathname, p)));

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <a
        href="#portal-inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Zum Inhalt springen
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/portal" className="-m-1 flex shrink-0 items-center gap-2.5 rounded p-1" aria-label="KOVALI Kandidatenportal, Übersicht">
            <Logo className="h-6 w-auto sm:h-7" />
            <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
            <span className="hidden text-[0.8125rem] font-medium tracking-wide text-slate sm:block">Kandidatenportal</span>
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden max-w-48 truncate text-sm text-slate lg:block" title={name}>
              {name}
            </span>
            <PortalLogoutButton logout={logout} />
          </div>
        </div>
        <nav aria-label="Portal-Navigation" className="hidden border-t border-line/70 md:block">
          <ul className="mx-auto flex w-full max-w-5xl gap-1 px-4 sm:px-6">
            {items.map((item) => {
              const on = active(pathname, item.href, item.exact);
              const count = item.count ? counts[item.count] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                      on ? "border-blue text-blue" : "border-transparent text-slate hover:border-line hover:text-ink",
                    )}
                  >
                    <item.icon aria-hidden className="size-4" />
                    {item.label}
                    {count > 0 ? (
                      <span className="rounded-full bg-blue px-1.5 text-xs text-white tabular-nums">
                        {count}
                        <span className="sr-only"> neu</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="portal-inhalt" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-8 md:pb-12">
        {children}
      </main>

      <footer className="hidden border-t border-line bg-white md:block">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-5 text-[0.8125rem] text-slate">
          <span>KOVALI · {contact.entity}</span>
          <a href="/datenschutz" className="hover:text-blue hover:underline">
            Datenschutz
          </a>
          <a href="/impressum" className="hover:text-blue hover:underline">
            Impressum
          </a>
          <a href={`mailto:${contact.email}`} className="ml-auto hover:text-blue hover:underline">
            Fragen? {contact.email}
          </a>
        </div>
      </footer>

      <nav
        aria-label="Portal-Navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items
            .filter((item) => !item.desktopOnly)
            .map((item) => {
              const on = isActive(item);
              const count = item.count ? counts[item.count] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium",
                      on ? "text-blue" : "text-slate",
                    )}
                  >
                    <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", on && "bg-blue/10")}>
                      <item.icon aria-hidden className="size-5" strokeWidth={on ? 2.25 : 1.75} />
                    </span>
                    {item.short}
                    {count > 0 ? (
                      <span className="absolute top-2 left-1/2 ml-2 min-w-4 rounded-full bg-blue px-1 text-center text-[0.625rem] leading-4 text-white tabular-nums">
                        {count}
                        <span className="sr-only"> neu</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
