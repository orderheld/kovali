import { certifications } from "@/content/company";
import { cn } from "@/lib/utils";

/**
 * Ferhat Demir's certificates as definition rows: short name and full credential on the
 * left, what it means for the client on the right. No cards, no badge icons.
 */
export function Certifications({ className }: { className?: string }) {
  return (
    <dl className={cn("divide-y divide-line border-y border-line", className)}>
      {certifications.map((c) => (
        <div key={c.id} className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
          <dt className="font-semibold text-ink">
            <span className="inline-flex items-center gap-2 rounded-md border border-blue/25 bg-blue/[0.05] px-2 py-1 font-mono text-[0.8125rem] font-medium tracking-[0.02em] text-blue">
              <span aria-hidden className="size-1.5 rounded-full bg-electric" />
              {c.short}
            </span>
            <span className="mt-2.5 block text-sm font-normal leading-snug text-slate">{c.credential}</span>
          </dt>
          <dd className="max-w-2xl leading-relaxed text-slate">{c.text}</dd>
        </div>
      ))}
    </dl>
  );
}
