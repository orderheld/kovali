import { PriorityList } from "@/components/artifacts/priority-list";
import { ProcessStrip } from "@/components/artifacts/process-strip";
import { TraceMatrix } from "@/components/artifacts/trace-matrix";
import { Section, SectionHeader, type SectionTone } from "@/components/ui/section";
import { workSamples } from "@/content/work-samples";
import { cn } from "@/lib/utils";

const rules = ["bg-navy", "bg-blue", "bg-electric"] as const;

/**
 * "So sieht die Arbeit aus": KO · VA · LI, each step with a short text and an example
 * artefact (process strip, priority list, traceability table). The artefacts reveal on
 * scroll where supported; they are fully visible without the animation.
 */
export function WorkSamples({
  id = "arbeit",
  title = workSamples.title,
  text = workSamples.text,
  tone = "paper",
  traceDefectNote = "mobile",
}: {
  id?: string;
  title?: string;
  text?: React.ReactNode;
  tone?: SectionTone;
  /** Defect footnote of the traceability table; "mobile" when the hero test run shows it on lg. */
  traceDefectNote?: "always" | "mobile" | "never";
}) {
  const titleId = `${id}-title`;
  return (
    <Section id={id} tone={tone} space="loose" labelledBy={titleId}>
      <SectionHeader id={titleId} layout="split" title={title} text={text} />
      <ol className="mt-14 grid gap-14 lg:gap-20">
        {workSamples.steps.map((step, i) => (
          <li key={step.code} className="grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="lg:col-span-4">
              <span aria-hidden className={cn("block h-[3px] w-12", rules[i])} />
              <p aria-hidden className="mt-5 font-display text-[4rem] font-extralight leading-[0.9] tracking-[-0.04em] text-navy">
                {step.code}
              </p>
              <h3 className="mt-3.5 text-xl font-semibold">{step.name}</h3>
              <p className="mt-2 max-w-sm leading-relaxed text-slate">{step.text}</p>
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
