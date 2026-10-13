import { BadgeCheck } from "lucide-react";
import { certifications } from "@/content/company";
import { cn } from "@/lib/utils";

export function Certifications({
  stacked = false,
  headingLevel: Heading = "h3",
}: {
  stacked?: boolean;
  /** Use h4 when the cards sit below an h3. */
  headingLevel?: "h3" | "h4";
}) {
  return (
    <ul className={cn("grid gap-5", !stacked && "md:grid-cols-2")}>
      {certifications.map((c) => (
        <li key={c.id} className="flex gap-5 rounded-xl border border-line bg-white p-7">
          <BadgeCheck aria-hidden className="size-8 shrink-0 text-blue" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-blue">{c.short}</p>
            <Heading className="mt-2 text-lg font-semibold leading-snug">{c.name}</Heading>
            <p className="mt-2 text-sm leading-relaxed text-slate">{c.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
