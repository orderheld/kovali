import { FlaskConical, ListChecks, type LucideIcon, RefreshCcw, Workflow } from "lucide-react";
import type { ServiceSlug } from "@/content/types";
import { cn } from "@/lib/utils";

const icons: Record<ServiceSlug, LucideIcon> = {
  "business-analysis": Workflow,
  "test-management": ListChecks,
  "test-engineering": FlaskConical,
  "application-management": RefreshCcw,
};

/** Thin line icon of a discipline (decorative). */
export function ServiceIcon({ slug, className }: { slug: ServiceSlug; className?: string }) {
  const Icon = icons[slug];
  return <Icon aria-hidden strokeWidth={1.25} className={cn("size-10 text-blue", className)} />;
}
