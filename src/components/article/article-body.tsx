import { RichText } from "@/components/ui/rich-text";
import type { ArticleBlock } from "@/content/types";

type TableBlock = Extract<ArticleBlock, { type: "table" }>;

/** Small spaced capitals for table heads. */
const headLabel = "text-xs font-semibold uppercase tracking-[0.14em] text-navy";

/**
 * Comparison table: hairlines, small capitals in the head row. Below 640 px each row becomes
 * a short stacked block, so nothing has to scroll sideways.
 */
function ArticleTable({ block }: { block: TableBlock }) {
  return (
    <div className="mt-10">
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-left text-[0.9375rem] leading-relaxed">
          <caption className="mb-4 text-left text-sm text-slate">{block.caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {block.head.map((h) => (
                <th key={h} scope="col" className={`pb-3 pr-6 align-bottom ${headLabel}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("|")} className="border-b border-line align-top">
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="py-4 pr-6 font-medium text-navy">
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className="py-4 pr-6">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden">
        <p className="text-sm text-slate">{block.caption}</p>
        <div className="mt-4 border-b border-line">
          {block.rows.map((row) => (
            <div key={row.join("|")} className="border-t border-line py-5">
              <p className="font-medium text-navy">{row[0]}</p>
              <dl className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed">
                {row.slice(1).map((cell, c) => (
                  <div key={block.head[c + 1]}>
                    <dt className={headLabel}>{block.head[c + 1]}</dt>
                    <dd className="mt-1">{cell}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Article text in the prose style of the site (.prose-kovali in globals.css), which also draws
 * the short blue line of the list bullets. Callouts are a cloud panel with a blue rule on the left.
 */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="prose-kovali">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i}>
                <RichText text={block.text} />
              </p>
            );
          case "h2":
            return (
              <h2 key={i} id={block.id} className="scroll-mt-28 text-navy">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="font-medium text-navy">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i}>
                {block.items.map((item) => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {block.items.map((item) => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </ol>
            );
          case "callout":
            return (
              <div key={i} role="note" className="mt-10 border-l-2 border-blue bg-cloud px-6 py-5 sm:px-8 sm:py-6">
                <p className="font-medium text-navy">{block.title}</p>
                <p className="mt-2">
                  <RichText text={block.text} />
                </p>
              </div>
            );
          case "table":
            return <ArticleTable key={i} block={block} />;
        }
      })}
    </div>
  );
}
