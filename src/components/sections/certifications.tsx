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
        <div key={c.id} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
          <dt className="font-semibold text-ink">
            {c.short}
            <span className="mt-1 block text-sm font-normal leading-snug text-slate">{c.credential}</span>
          </dt>
          <dd className="max-w-2xl leading-relaxed text-slate">{c.text}</dd>
        </div>
      ))}
    </dl>
  );
}
