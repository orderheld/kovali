import type { Priority, TestStatus } from "@/content/work-samples";
import { cn } from "@/lib/utils";

const chip =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium leading-4";

const statuses: Record<TestStatus, { glyph: string; word: string; className: string }> = {
  pass: { glyph: "✓", word: "bestanden", className: "bg-pass-bg text-pass" },
  fail: { glyph: "✕", word: "Fehler", className: "bg-fail-bg text-fail" },
  open: { glyph: "○", word: "offen", className: "bg-open-bg text-open" },
};

/** Test result with glyph and word (colour is never the only signal). */
export function StatusChip({ status, className }: { status: TestStatus; className?: string }) {
  const s = statuses[status];
  return (
    <span className={cn(chip, s.className, className)}>
      <span aria-hidden>{s.glyph}</span>
      {s.word}
    </span>
  );
}

const priorities: Record<Priority, string> = {
  Muss: "bg-navy text-white",
  Soll: "bg-blue/10 text-blue",
  Kann: "border border-field text-slate",
};

/** Priority of a requirement: Muss, Soll or Kann. */
export function PriorityChip({ priority, className }: { priority: Priority; className?: string }) {
  return <span className={cn(chip, priorities[priority], className)}>{priority}</span>;
}
