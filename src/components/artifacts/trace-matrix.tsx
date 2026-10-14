import { traceability, type TraceSample } from "@/content/work-samples";
import { cn } from "@/lib/utils";
import { ArtifactFrame } from "./artifact-frame";
import { StatusChip } from "./status-chip";

/**
 * Example traceability table: requirement → test case → result, as a real table with
 * caption and column headers. The defect footnote can be limited to small screens where
 * the hero test run (lg only) already shows it.
 */
export function TraceMatrix({
  trace = traceability,
  defectNote = "always",
  className,
}: {
  trace?: TraceSample;
  /** "always" (default), "mobile" (hidden from lg, used on home) or "never". */
  defectNote?: "always" | "mobile" | "never";
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
              <th scope="col" className="bg-mist px-2.5 py-2 text-xs font-medium text-slate first:pl-4 sm:px-3.5">
                Anforderung
              </th>
              <th scope="col" className="bg-mist px-2.5 py-2 text-xs font-medium text-slate first:pl-4 sm:px-3.5">
                Testfall
              </th>
              <th scope="col" className="bg-mist px-2.5 py-2 text-xs font-medium text-slate first:pl-4 sm:px-3.5">
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
        <p
          className={cn(
            "border-t border-line bg-[#fffdfa] px-4 py-3 text-[0.8125rem] leading-snug text-slate",
            defectNote === "mobile" && "lg:hidden",
          )}
        >
          <span className="font-mono text-xs font-medium text-fail">{trace.defect.id}</span> {trace.defect.text}
        </p>
      ) : null}
    </ArtifactFrame>
  );
}
