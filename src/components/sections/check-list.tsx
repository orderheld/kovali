import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckList({ items, columns = 2, className }: { items: readonly string[]; columns?: 1 | 2; className?: string }) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-3.5", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-snug text-ink">
          <Check aria-hidden className="mt-0.5 size-[1.1rem] shrink-0 text-blue" strokeWidth={2.25} />
          {item}
        </li>
      ))}
    </ul>
  );
}
