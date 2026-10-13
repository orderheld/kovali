"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, FileDown } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export interface DossierLink {
  label: string;
  description: string;
  href: string;
}

/**
 * "Dossier" button with the four exports (PDF/Word × anonymised/named). Follows the ARIA menu
 * button pattern: arrow keys move between entries, Escape closes and returns focus. The links
 * are plain downloads (the route sends Content-Disposition: attachment).
 */
export function DossierMenu({ links, label = "Dossier", note }: { links: DossierLink[]; label?: string; note?: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Next.js keeps the page mounted but hidden after leaving it; the menu must not reappear open.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
  const focusItem = (index: number) => {
    const list = items();
    list[(index + list.length) % list.length]?.focus();
  };
  const openAndFocus = (index: number) => {
    setOpen(true);
    // The menu renders on the next frame.
    requestAnimationFrame(() => focusItem(index));
  };
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAndFocus(0))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openAndFocus(0);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openAndFocus(-1);
          }
        }}
        className={buttonClass("secondary")}
      >
        <FileDown aria-hidden className="size-4" />
        {label}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Dossier herunterladen"
          aria-describedby={note ? `${menuId}-note` : undefined}
          onKeyDown={(e) => {
            const list = items();
            const index = list.indexOf(document.activeElement as HTMLAnchorElement);
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
              setOpen(false);
            }
          }}
          className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-white py-1 shadow-lg"
        >
          {links.map((link) => (
            <li key={link.href} role="none">
              <a
                role="menuitem"
                href={link.href}
                download
                tabIndex={-1}
                onClick={() => close()}
                className="block px-4 py-2 hover:bg-mist focus:bg-mist focus:outline-none"
              >
                <span className="block text-sm font-medium text-ink">{link.label}</span>
                <span className="block text-xs text-slate">{link.description}</span>
              </a>
            </li>
          ))}
          {note ? (
            <li role="none" className="mt-1 border-t border-line px-4 pt-2 pb-1.5">
              <p id={`${menuId}-note`} className="text-xs leading-snug text-slate">
                {note}
              </p>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
