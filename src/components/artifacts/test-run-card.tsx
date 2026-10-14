import { testRun, type TestRunSample } from "@/content/work-samples";
import { ArtifactFrame } from "./artifact-frame";
import { StatusChip } from "./status-chip";

/** Example regression run: one row per test case and the defect it found. No totals or bars. */
export function TestRunCard({ run = testRun, className }: { run?: TestRunSample; className?: string }) {
  return (
    <ArtifactFrame id={run.id} kind={run.kind} caption="Testlauf mit Ergebnis je Testfall und gefundenem Fehler" className={className}>
      <ul>
        {run.cases.map((c) => (
          <li
            key={c.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-t border-line px-4 py-2.5 text-[0.84rem] text-ink first:border-t-0"
          >
            <span className="font-mono text-xs text-slate">{c.id}</span>
            <span className="min-w-0">{c.title}</span>
            <StatusChip status={c.status} />
          </li>
        ))}
      </ul>
      <p className="border-t border-line bg-cloud px-4 py-3 text-[0.8125rem] leading-snug text-slate">
        <span className="font-mono text-xs font-medium text-fail">{run.defect.id}</span> {run.defect.text}
      </p>
    </ArtifactFrame>
  );
}
