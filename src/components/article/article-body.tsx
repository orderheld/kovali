import { RichText } from "@/components/ui/rich-text";
import type { ArticleBlock } from "@/content/types";

type TableBlock = Extract<ArticleBlock, { type: "table" }>;

/** Mono labels for table heads, as the kickers of the site. */
const headLabel = "font-mono text-xs font-medium uppercase tracking-[0.08em] text-blue";

/**
 * Comparison table in a rounded panel with hairlines: caption on top, mono labels on mist in
 * the head row. Below 640 px each row becomes a short stacked block, so nothing has to scroll
 * sideways.
 */
function ArticleTable({ block }: { block: TableBlock }) {
  return (
    <div className="mt-10">
      <div className="hidden overflow-hidden rounded-2xl border border-line sm:block">
        <table className="w-full border-collapse text-left text-[0.9375rem] leading-relaxed">
          <caption className="border-b border-line px-5 py-4 text-left font-medium text-night">{block.caption}</caption>
          <thead className="bg-mist">
            <tr className="border-b border-line">
              {block.head.map((h) => (
                <th key={h} scope="col" className={`px-5 py-3 align-bottom ${headLabel}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("|")} className="border-b border-line align-top last:border-b-0">
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="px-5 py-4 font-medium text-night">
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className="px-5 py-4">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line sm:hidden">
        <p className="border-b border-line bg-mist px-5 py-4 font-medium text-night">{block.caption}</p>
        <div className="divide-y divide-line">
          {block.rows.map((row) => (
            <div key={row.join("|")} className="px-5 py-5">
              <p className="font-medium text-night">{row[0]}</p>
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
 * the short blue line of the list bullets. Callouts are a rounded mist panel. The h2 ids are the
 * anchors of the table of contents.
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
            // The page already keeps 6rem free for the sticky header (scroll-padding-top); 1rem more
            // puts a heading reached from the table of contents level with the top of that list.
            return (
              <h2 key={i} id={block.id} className="scroll-mt-4 text-night">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="font-medium text-night">
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
              <div key={i} role="note" className="mt-10 rounded-2xl border border-line bg-mist p-6 sm:p-8">
                <p className="font-medium text-night">{block.title}</p>
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
