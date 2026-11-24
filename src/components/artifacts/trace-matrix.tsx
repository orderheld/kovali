import { traceability, type TraceSample } from "@/content/work-samples";
import { ArtifactFrame } from "./artifact-frame";
import { StatusChip } from "./status-chip";

/**
 * Example traceability table: requirement → test case → result, as a real table with
 * caption and column headers, and the defect as a footnote.
 */
export function TraceMatrix({
  trace = traceability,
  defectNote = "always",
  className,
}: {
  trace?: TraceSample;
  /** "always" (default) or "never". */
  defectNote?: "always" | "never";
  className?: string;
}) {
  return (
    <ArtifactFrame id={trace.id} caption={trace.caption} className={className}>
      <div role="region" aria-label="Rückverfolgbarkeit (Beispiel)" tabIndex={0}
        className="overflow-x-auto focus-visible:rounded-b-[9px] focus-visible:outline-offset-[-2px]"
      >
        <table className="w-full border-collapse text-left text-[0.84rem]">
          <caption className="sr-only">{trace.caption} (fiktives Beispiel)</caption>
          <thead>
            <tr>
              <th scope="col" className="bg-cloud px-2.5 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-slate first:pl-4 sm:px-3.5">
                Anforderung
              </th>
              <th scope="col" className="bg-cloud px-2.5 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-slate first:pl-4 sm:px-3.5">
                Testfall
              </th>
              <th scope="col" className="bg-cloud px-2.5 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-slate first:pl-4 sm:px-3.5">
                Ergebnis
              </th>
            </tr>
          </thead>
          <tbody>
            {trace.rows.map((row) => (
              <tr key={row.requirement.id} className="border-t border-line align-top">
                <td className="hyphens-auto px-2.5 py-2.5 text-ink first:pl-4 sm:px-3.5">
                  <span className="block font-mono text-xs text-blue">{row.requirement.id}</span>
                  {row.requirement.title}
                </td>
                <td className="hyphens-auto px-2.5 py-2.5 text-ink first:pl-4 sm:px-3.5">
                  <span className="block font-mono text-xs text-blue">{row.test.id}</span>
                  {row.test.title}
                </td>
                <td className="py-2.5 pl-2.5 pr-4 sm:px-3.5">
                  <StatusChip status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {defectNote !== "never" ? (
        <p className="border-t border-line bg-cloud px-4 py-3 text-[0.8125rem] leading-snug text-slate">
          <span className="font-mono text-xs font-medium text-fail">{trace.defect.id}</span> {trace.defect.text}
        </p>
      ) : null}
    </ArtifactFrame>
  );
}
