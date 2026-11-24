import { RichText } from "@/components/ui/rich-text";
import type { ArticleBlock } from "@/content/types";

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
              <h2 key={i} id={block.id} className="scroll-mt-28">
                {block.text}
              </h2>
            );
          case "h3":
            return <h3 key={i}>{block.text}</h3>;
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List key={i}>
                {block.items.map((item) => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "callout":
            return (
              <div
                key={i}
                role="note"
                className="relative !mt-10 overflow-hidden rounded-xl border border-cloud-line bg-cloud px-6 py-5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-linear-to-b before:from-blue before:to-electric"
              >
                <p className="font-semibold text-ink">{block.title}</p>
                <p className="mt-2">
                  <RichText text={block.text} />
                </p>
              </div>
            );
          case "table":
            return (
              // Focusable so keyboard users can scroll the table on narrow screens.
              <div
                key={i}
                role="region"
                aria-label={block.caption}
                tabIndex={0}
                className="!mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
              >
                <table className="w-full min-w-[36rem] border-collapse text-left text-[0.9375rem] leading-relaxed">
                  <caption className="mb-3 text-left font-mono text-xs text-slate">{block.caption}</caption>
                  <thead>
                    <tr className="border-b-2 border-navy">
                      {block.head.map((h) => (
                        <th key={h} scope="col" className="py-3 pr-4 font-mono text-xs font-medium uppercase tracking-[0.06em] text-ink">
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
                            <th key={c} scope="row" className="py-3 pr-4 font-medium text-ink">
                              {cell}
                            </th>
                          ) : (
                            <td key={c} className="py-3 pr-4">
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
