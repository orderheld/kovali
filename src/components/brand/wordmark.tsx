import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Header and footer wordmark: the K symbol of the logo, the brand name in semibold and the
 * descriptor as a small mono label beside it. Name and descriptor come from `site`
 * (src/config/site.ts), so a new company name changes here without new artwork.
 */
export function Wordmark({ tone = "dark", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo variant="symbol" tone={tone} className="h-7 w-auto shrink-0" />
      <span
        className={cn(
          "text-[1.1875rem] font-semibold leading-none tracking-[-0.01em]",
          tone === "dark" ? "text-white" : "text-night",
        )}
      >
        {site.brand}
      </span>
      {site.descriptor ? (
        <span
          className={cn(
            "mt-0.5 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.08em]",
            tone === "dark" ? "text-sky" : "text-blue",
          )}
        >
          {/* A space for screen readers and copy-paste: "KOVALI Consulting". */}
          <span className="sr-only"> </span>
          {site.descriptor}
        </span>
      ) : null}
    </span>
  );
}
