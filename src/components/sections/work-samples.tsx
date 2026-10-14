import { PriorityList } from "@/components/artifacts/priority-list";
import { ProcessStrip } from "@/components/artifacts/process-strip";
import { TraceMatrix } from "@/components/artifacts/trace-matrix";
import { Section, SectionHeader } from "@/components/ui/section";
import { workSamples } from "@/content/work-samples";
import { cn } from "@/lib/utils";

/** The three parts of the logo on dark: white stem, electric and azure arms. */
const rules = ["bg-white", "bg-electric", "bg-azure"] as const;
const letters = ["text-white", "text-electric", "text-azure"] as const;

/**
 * "So sieht die Arbeit aus": KO · VA · LI, each step with a short text and an example
 * artefact (process strip, priority list, traceability table), on a dark band.
 * The artefacts rise on scroll where supported; they are fully visible without the animation.
 */
export function WorkSamples({
  id = "arbeit",
  title = workSamples.title,
  text = workSamples.text,
  traceDefectNote = "always",
}: {
  id?: string;
  title?: string;
  text?: React.ReactNode;
  /** Defect footnote of the traceability table. */
  traceDefectNote?: "always" | "never";
}) {
  const titleId = `${id}-title`;
  return (
    <Section id={id} tone="night" space="loose" labelledBy={titleId}>
      <SectionHeader id={titleId} layout="split" title={title} text={text} />
      <ol className="relative mt-16 grid gap-16 lg:mt-20 lg:gap-24">
        {workSamples.steps.map((step, i) => (
          <li key={step.code} className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className={cn("block h-0.5 w-10", rules[i])} />
                <span aria-hidden className="font-mono text-xs text-white/60">
                  {String(i + 1).padStart(2, "0")} / 03
                </span>
              </div>
              <p
                aria-hidden
                className={cn("mt-5 text-[4.5rem] font-semibold leading-[0.9] tracking-[-0.05em]", letters[i])}
              >
                {step.code}
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.015em]">{step.name}</h3>
              <p className="mt-2 max-w-sm leading-relaxed text-white/70">{step.text}</p>
            </div>
            <div className="kv-reveal min-w-0 lg:col-span-7 lg:col-start-6">
              {step.artifact === "process" ? (
                <ProcessStrip />
              ) : step.artifact === "priority" ? (
                <PriorityList />
              ) : (
                <TraceMatrix defectNote={traceDefectNote} />
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
