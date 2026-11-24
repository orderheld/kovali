import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Header and footer wordmark: the K symbol of the logo, the brand name in spaced capitals
 * and the descriptor below it. Name and descriptor come from `site` (src/config/site.ts),
 * so a new company name changes here without new artwork.
 */
export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Logo variant="symbol" tone={tone} className="h-8 w-auto shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[1.0625rem] font-semibold tracking-[0.32em] [margin-right:-0.32em]",
            tone === "dark" ? "text-white" : "text-navy",
          )}
        >
          {site.brand}
        </span>
        {site.descriptor ? (
          <span
            className={cn(
              "mt-1.5 text-[0.625rem] font-medium uppercase tracking-[0.42em]",
              tone === "dark" ? "text-sky" : "text-blue",
            )}
          >
            {site.descriptor}
          </span>
        ) : null}
      </span>
    </span>
  );
}
