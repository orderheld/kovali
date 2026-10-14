"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** How long "Kopiert" stays visible. */
const CONFIRM_MS = 2000;

/**
 * Fallback for browsers without the Clipboard API or outside a secure context: copies through
 * a hidden textarea. Returns false when the browser refuses.
 */
function copyWithTextarea(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  area.style.opacity = "0";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, value.length);
  let done = false;
  try {
    done = document.execCommand("copy");
  } catch {
    done = false;
  }
  area.remove();
  active?.focus();
  return done;
}

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission refused or document not focused: try the old way.
    }
  }
  return copyWithTextarea(value);
}

/**
 * Copies a text to the clipboard with one click and shows "Kopiert" for two seconds. The
 * result is also announced to screen readers. With `iconOnly`, pass a `label` that names what
 * is copied, e.g. "Bewerbungstext kopieren": it becomes the accessible name.
 */
export function CopyButton({
  value,
  label = "Kopieren",
  iconOnly = false,
  variant = "secondary",
  size = "sm",
  className,
  disabled,
}: {
  value: string;
  /** Button text (or accessible name with `iconOnly`). */
  label?: string;
  iconOnly?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = async () => {
    const ok = await copyText(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? CONFIRM_MS : CONFIRM_MS * 2);
  };

  const Icon = state === "copied" ? Check : Copy;
  const text = state === "copied" ? "Kopiert" : state === "failed" ? "Nicht kopiert" : label;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !value}
        aria-label={iconOnly ? (state === "idle" ? label : text) : undefined}
        title={iconOnly ? label : undefined}
        className={buttonClass(variant, size, cn(iconOnly && (size === "sm" ? "w-8 px-0" : "w-10 px-0"), className))}
      >
        <Icon aria-hidden className={cn("size-4 shrink-0", state === "copied" && "text-emerald-600")} />
        {iconOnly ? null : <span>{text}</span>}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "In die Zwischenablage kopiert" : state === "failed" ? "Kopieren nicht möglich. Bitte den Text markieren und von Hand kopieren." : ""}
      </span>
    </>
  );
}
