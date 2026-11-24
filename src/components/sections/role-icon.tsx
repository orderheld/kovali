import { FlaskConical, ListChecks, type LucideIcon, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

/** One icon per team role, in the order of `about.team.roles`. */
const icons: LucideIcon[] = [Workflow, ListChecks, FlaskConical];

/** Thin line icon of a team role (decorative). */
export function RoleIcon({ index, className }: { index: number; className?: string }) {
  const Icon = icons[index % icons.length];
  return <Icon aria-hidden strokeWidth={1.25} className={cn("size-8 text-blue", className)} />;
}
