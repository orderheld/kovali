import { cn } from "@/lib/utils";

/** The 48° tick of the logo's arms, used as list marker across the site. */
export function Tick({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("mt-[0.6em] h-0.5 w-2.5 shrink-0 -rotate-[48deg] bg-blue in-[.on-dark]:bg-electric", className)}
    />
  );
}

export function CheckList({ items, columns = 2, className }: { items: readonly string[]; columns?: 1 | 2; className?: string }) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-3.5", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-snug text-ink in-[.on-dark]:text-white/85">
          <Tick />
          {item}
        </li>
      ))}
    </ul>
  );
}
