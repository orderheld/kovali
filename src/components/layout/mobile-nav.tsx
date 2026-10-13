"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { mainNav, primaryCta } from "@/content/navigation";
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist"
      >
        <span className="sr-only">{open ? "Menü schliessen" : "Menü öffnen"}</span>
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto border-t border-line bg-white"
      >
        <nav aria-label="Hauptnavigation mobil" className="px-5 pb-10 pt-4 sm:px-8">
          <ul className="divide-y divide-line">
            {mainNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between py-4 text-lg font-medium",
                      active ? "text-blue" : "text-ink",
                    )}
                  >
                    {item.label}
                    <ArrowRight aria-hidden className="size-4 text-slate/60" />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/kontakt" onClick={close} className="flex items-center justify-between py-4 text-lg font-medium text-ink">
                Kontakt
                <ArrowRight aria-hidden className="size-4 text-slate/60" />
              </Link>
            </li>
          </ul>
          <Link
            href={primaryCta.href}
            onClick={close}
            className="mt-8 flex h-12 items-center justify-center rounded-md bg-blue font-medium text-white hover:bg-blue-700"
          >
            {primaryCta.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
