import { Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/admin/format";
import { dueState, dueTone, type Due } from "@/lib/admin/vacancy-rules";
import { cn } from "@/lib/utils";

/** "heute", "morgen" or "2 Tage überfällig" as a coloured badge; nothing when not pressing. */
export function DueBadge({ due, className }: { due: Due | null; className?: string }) {
  const tone = dueTone(due);
  if (!due || !tone) return null;
  return (
    <Badge tone={tone} className={className}>
      {due.label}
    </Badge>
  );
}

/** A date with its due badge. Closed vacancies (`active` false) show the date only. */
export function DueDate({ date, today, active = true, className }: { date: string | null; today: string; active?: boolean; className?: string }) {
  if (!date) return <span className="text-slate">–</span>;
  const due = dueState(date, today, active);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 whitespace-nowrap", className)}>
      <span className={cn(due?.level === "overdue" && "font-medium text-red-700")}>{formatDate(date)}</span>
      <DueBadge due={due} />
    </span>
  );
}
