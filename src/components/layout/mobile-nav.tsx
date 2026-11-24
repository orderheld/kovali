"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/config/site";
import { mobileNav } from "@/content/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The panel covers the page: take main content and footer out of the tab order and the
    // accessibility tree while it is open, so focus never lands on something hidden behind it.
    const behind = Array.from(document.querySelectorAll<HTMLElement>("#inhalt, #inhalt ~ footer"));
    behind.forEach((el) => el.setAttribute("inert", ""));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // From the lg breakpoint the desktop navigation takes over: close the panel, so the page is
    // not left inert and unscrollable after the window grows.
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      behind.forEach((el) => el.removeAttribute("inert"));
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const close = () => setOpen(false);
  const email = site.contact.email.value;

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <span className="sr-only">{open ? "Menü schliessen" : "Menü öffnen"}</span>
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="on-dark fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto border-t border-white/10 bg-night text-white"
      >
        <nav aria-label="Hauptnavigation mobil" className="px-5 pb-12 pt-6 sm:px-8">
          <ul className="border-b border-white/10">
            {mobileNav.map((item, i) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="border-t border-white/10">
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-baseline gap-4 py-5 text-2xl font-medium tracking-[-0.02em]", active ? "text-electric" : "text-white")}
                  >
                    <span aria-hidden className="font-mono text-xs text-sky/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-10 kicker">E-Mail</p>
          <p className="mt-2">
            <a href={`mailto:${email}`} className="text-lg text-white underline decoration-white/30 underline-offset-4">
              {email}
            </a>
          </p>
        </nav>
      </div>
    </div>
  );
}
