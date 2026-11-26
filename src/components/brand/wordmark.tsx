import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Header and footer wordmark on light surfaces: the K symbol of the logo, the brand name in
 * semibold and the descriptor in regular muted grey beside it. Name and descriptor come from
 * `site` (src/config/site.ts), so a new company name changes here without new artwork.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo variant="symbol" tone="light" className="h-6 w-auto shrink-0" />
      <span className="text-[1.0625rem] font-semibold leading-none tracking-[-0.015em] text-graphite">{site.brand}</span>
      {site.descriptor ? (
        <span className="text-[1.0625rem] font-normal leading-none tracking-[-0.015em] text-muted">
          {/* A space for screen readers and copy-paste: "KOVALI Consulting". */}
          <span className="sr-only"> </span>
          {site.descriptor}
        </span>
      ) : null}
    </span>
  );
}
