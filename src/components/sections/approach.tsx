import { philosophy } from "@/content/company";
import { cn } from "@/lib/utils";

/** KO · VA · LI: the three steps behind the brand name. */
export function Approach() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
      {philosophy.map((step, i) => (
        <li key={step.code} className="relative bg-white p-8 md:p-10">
          <span
            aria-hidden
            className={cn("absolute inset-x-0 top-0 h-1", i === 0 ? "bg-navy" : i === 1 ? "bg-blue" : "bg-electric")}
          />
          <div className="flex items-baseline justify-between">
            <span className="text-5xl font-semibold tracking-tight text-navy">{step.code}</span>
            <span className="font-mono text-xs text-slate">0{i + 1}</span>
          </div>
          <h3 className="mt-6 text-h3 font-semibold text-ink">{step.name}</h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-blue">{step.verb}</p>
          <p className="mt-4 leading-relaxed text-slate">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
