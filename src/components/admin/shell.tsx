"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  Briefcase,
  Building2,
  Calculator,
  FileSignature,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Navigation of the admin area. Counts come from the layout (open items needing attention). */

export interface NavCounts {
  portal: number;
  privacy: number;
  mandates: number;
}

const nav = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/mandate", label: "Mandate & Vakanzen", icon: Briefcase, count: "mandates" as const },
  { href: "/admin/kandidaten", label: "Kandidaten", icon: Users },
  { href: "/admin/firmen", label: "Firmen & Kontakte", icon: Building2 },
  { href: "/admin/vertraege", label: "Verträge", icon: FileSignature },
  { href: "/admin/portal", label: "Kandidatenportal", icon: Inbox, count: "portal" as const, alert: true },
  { href: "/admin/rechner", label: "Rechner", icon: Calculator },
  { href: "/admin/datenschutz", label: "Datenschutz", icon: ShieldCheck, count: "privacy" as const, alert: true },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];

const quickCreate = [
  { href: "/admin/mandate/neu", label: "Mandat / Vakanz" },
  { href: "/admin/kandidaten/neu", label: "Kandidat" },
  { href: "/admin/firmen/neu", label: "Firma" },
  { href: "/admin/vertraege/neu", label: "Vertrag" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ counts, onNavigate }: { counts: NavCounts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const count = item.count ? counts[item.count] : 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-sky/80 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon aria-hidden className={cn("size-4 shrink-0", active ? "text-electric" : "text-sky/60")} />
              <span className="flex-1">{item.label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                    item.alert ? "bg-amber-400 text-navy" : "bg-white/10 text-sky",
                  )}
                >
                  {count}
                  <span className="sr-only"> offen</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Sidebar({ counts, onNavigate }: { counts: NavCounts; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-navy px-3 py-5">
      <Link href="/admin" onClick={onNavigate} className="mb-6 flex items-center gap-2 px-3" aria-label="KOVALI Admin, Übersicht">
        <Logo tone="dark" className="w-28" />
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-sky uppercase">Admin</span>
      </Link>
      <nav aria-label="Admin-Navigation" className="flex-1 overflow-y-auto">
        <NavList counts={counts} onNavigate={onNavigate} />
      </nav>
      <p className="mt-4 px-3 text-[0.6875rem] leading-relaxed text-sky/50">Vertrauliche Daten. Zugriffe werden protokolliert.</p>
    </div>
  );
}

function menuItems(menu: HTMLElement | null): HTMLAnchorElement[] {
  return Array.from(menu?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
}

/** Focuses an entry of a menu; -1 is the last one, and the index wraps around. */
function focusMenuItem(menu: HTMLElement | null, index: number) {
  const list = menuItems(menu);
  list[(index + list.length) % list.length]?.focus();
}

/**
 * "Neu" button with the forms to create records. Follows the ARIA menu button pattern (as the
 * dossier menu): arrow keys move between entries, Escape closes and returns focus to the button.
 */
function QuickCreate() {
  // Remembers on which page the menu was opened, so it closes by itself after navigating.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  // Entry to focus once the menu is rendered (0 = first, -1 = last).
  const focusOnOpen = useRef<number | null>(null);

  const focusItem = (index: number) => focusMenuItem(menuRef.current, index);
  const openAndFocus = (index: number) => {
    focusOnOpen.current = index;
    setOpenOn(pathname);
  };
  const close = (returnFocus = true) => {
    setOpenOn(null);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    const index = focusOnOpen.current;
    if (!open || index === null) return;
    focusOnOpen.current = null;
    focusMenuItem(menuRef.current, index);
  }, [open]);

  return (
    <div
      className="relative"
      // Closes when focus leaves the button and the menu (Tab, or a click elsewhere).
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenOn(null);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAndFocus(0))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openAndFocus(0);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openAndFocus(-1);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            close();
          }
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        <Plus aria-hidden className="size-4" />
        {/* Visible from sm on; below that only for screen readers and voice control. */}
        <span className="sr-only sm:not-sr-only">Neu</span>
      </button>
      {open ? (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => close(false)} />
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Neu erfassen"
            onKeyDown={(e) => {
              const index = menuItems(menuRef.current).indexOf(document.activeElement as HTMLAnchorElement);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                focusItem(index + 1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                focusItem(index - 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                focusItem(0);
              } else if (e.key === "End") {
                e.preventDefault();
                focusItem(-1);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "Tab") {
                setOpenOn(null);
              }
            }}
            className="absolute right-0 z-40 mt-2 w-52 rounded-lg border border-line bg-white py-1 shadow-lg"
          >
            {quickCreate.map((q) => (
              <li key={q.href} role="none">
                <Link
                  role="menuitem"
                  href={q.href}
                  tabIndex={-1}
                  onClick={() => close(false)}
                  className="block px-4 py-2 text-sm text-ink hover:bg-mist focus:bg-mist focus:outline-none"
                >
                  {q.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/**
 * Logs out and then loads the login page fresh, so no previously visited admin page stays
 * in the browser's memory (Next.js keeps recent pages mounted for back navigation).
 */
function LogoutButton({ logout }: { logout: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout();
          window.location.replace("/admin/login");
        })
      }
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-slate hover:bg-mist hover:text-ink disabled:opacity-60"
    >
      <LogOut aria-hidden className="size-4" />
      <span className="sr-only sm:not-sr-only">Abmelden</span>
    </button>
  );
}

export function AdminShell({
  counts,
  logout,
  children,
}: {
  counts: NavCounts;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOn, setDrawerOn] = useState<string | null>(null);
  const drawer = drawerOn === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Focus goes back to the menu button once the page behind is no longer inert (not after navigating).
  const restoreFocus = useRef(false);
  const openDrawer = () => setDrawerOn(pathname);
  const closeDrawer = (returnFocus = true) => {
    restoreFocus.current = returnFocus;
    setDrawerOn(null);
  };

  // A modal drawer: focus moves into it, Escape closes it, the page behind is inert (below).
  useEffect(() => {
    if (!drawer) {
      if (restoreFocus.current) menuButtonRef.current?.focus();
      restoreFocus.current = false;
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      restoreFocus.current = true;
      setDrawerOn(null);
    };
    // From lg on the drawer is hidden; the page must not stay inert behind it.
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => {
      if (wide.matches) setDrawerOn(null);
    };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [drawer]);

  return (
    <div className="flex min-h-dvh flex-1">
      <a
        href="#admin-inhalt"
        inert={drawer}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Zum Inhalt springen
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">
        <Sidebar counts={counts} />
      </aside>
      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          {/* Closes on a click beside the drawer; keyboard users have the close button and Escape. */}
          <button type="button" aria-hidden tabIndex={-1} className="absolute inset-0 cursor-default bg-navy/50" onClick={() => closeDrawer()} />
          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar counts={counts} onNavigate={() => closeDrawer(false)} />
            <button
              ref={closeRef}
              type="button"
              onClick={() => closeDrawer()}
              className="absolute top-4 right-3 rounded p-1.5 text-sky hover:bg-white/10"
              aria-label="Navigation schliessen"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
      <div inert={drawer} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            className="-ml-1 rounded p-1.5 text-slate hover:bg-mist lg:hidden"
            onClick={openDrawer}
            aria-label="Navigation öffnen"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <form action="/admin/suche" role="search" className="relative max-w-md flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
            <label htmlFor="admin-search" className="sr-only">
              Suchen
            </label>
            <input
              id="admin-search"
              name="q"
              type="search"
              placeholder="Kandidaten, Mandate, Firmen, Verträge suchen …"
              className="h-9 w-full rounded-md border border-line bg-mist/60 pr-3 pl-9 text-sm text-ink placeholder:text-slate/60 focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/20 focus:outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <QuickCreate />
            <LogoutButton logout={logout} />
          </div>
        </header>
        <main id="admin-inhalt" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
