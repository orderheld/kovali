/**
 * Summary of an audit entry with the affected record below it, unless the summary already
 * names it ("Kandidat K-0042 anonymisiert").
 */
export function AuditText({ summary, object }: { summary: string | null; object: string | null }) {
  const main = summary || object || "–";
  const extra = summary && object && !summary.includes(object) ? object : null;
  return (
    <span className="min-w-0 flex-1 text-sm">
      <span className="text-ink">{main}</span>
      {extra ? <span className="block text-[0.8125rem] text-slate">{extra}</span> : null}
    </span>
  );
}
