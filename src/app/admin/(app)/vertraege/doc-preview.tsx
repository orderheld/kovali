import { Fragment } from "react";
import { site } from "@/config/site";
import type { Block, DocModel, Inline, Rich } from "@/lib/admin/render/model";
import { cn } from "@/lib/utils";

/**
 * HTML preview of a DocModel, styled like the PDF (same blocks, same order), so Ferhat can
 * read a contract on its page without downloading it. Server component.
 */

function RichText({ value }: { value: Rich }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((part: Inline, i) =>
        typeof part === "string" ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <span key={i} className={cn(part.bold && "font-semibold", part.italic && "italic")}>
            {part.text}
          </span>
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "title":
      return (
        <div className="mb-5">
          <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight text-navy">{block.text}</h2>
          {block.subtitle ? <p className="mt-1.5 text-slate">{block.subtitle}</p> : null}
        </div>
      );
    case "heading":
      return block.level === 2 ? (
        <h4 className="mt-4 mb-1 font-semibold text-navy">
          {block.number ? <span className="mr-2 font-mono text-[0.8em] text-slate">{block.number}</span> : null}
          {block.text}
        </h4>
      ) : (
        <h3 className="mt-6 mb-2 text-[1.05rem] font-semibold text-navy">
          {block.number ? <span className="mr-2.5 font-mono text-[0.85em] text-blue">{block.number}</span> : null}
          {block.text}
        </h3>
      );
    case "paragraph": {
      const cls = cn("whitespace-pre-line", block.muted && "text-slate", block.small && "text-[0.8125rem] text-slate");
      return block.number ? (
        <div className="mb-2 flex gap-3">
          <span className="w-9 shrink-0 pt-px font-mono text-[0.75rem] text-slate">{block.number}</span>
          <p className={cn("min-w-0 flex-1", cls)}>
            <RichText value={block.text} />
          </p>
        </div>
      ) : (
        <p className={cn("mb-2", cls)}>
          <RichText value={block.text} />
        </p>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="mb-2 space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-4 shrink-0 text-blue">{block.ordered ? `${i + 1}.` : "–"}</span>
              <span className="min-w-0 flex-1">
                <RichText value={item} />
              </span>
            </li>
          ))}
        </Tag>
      );
    }
    case "facts":
      return (
        <dl className="my-3 border-t border-line">
          {block.rows.map((row, i) => (
            <div key={i} className="grid gap-x-4 border-b border-line py-1.5 sm:grid-cols-[34%_1fr]">
              <dt className="text-slate">{row.label}</dt>
              <dd className="min-w-0 break-words whitespace-pre-line">
                <RichText value={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="my-3 overflow-x-auto">
          <table className="w-full border-collapse border border-line text-[0.8125rem]">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i} className={cn("border-b border-line bg-mist px-2 py-1.5 text-left font-semibold text-navy", c.align === "right" && "text-right")}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className={cn("border-b border-line px-2 py-1.5 align-top", block.columns[i]?.align === "right" && "text-right tabular-nums")}>
                      <RichText value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "parties":
      return (
        <div className="my-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {block.parties.map((p, i) => (
              <div key={i} className="rounded bg-mist px-4 py-3">
                <p className="mb-1.5 font-mono text-[0.6875rem] tracking-widest text-blue uppercase">{p.role}</p>
                {p.lines.map((line, j) => (
                  <p key={j} className={j === 0 ? "font-semibold text-navy" : undefined}>
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
          {block.between ? <p className="my-2 text-center text-slate">{block.between}</p> : null}
        </div>
      );
    case "signatures":
      return (
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {block.parties.map((p, i) => (
            <div key={i}>
              <p className="mb-6 font-semibold text-navy">{p.party}</p>
              <div className="h-7 border-b border-ink" />
              <p className="mt-1 mb-4 text-xs text-slate">Ort, Datum</p>
              {(p.signers.length ? p.signers : [{ name: undefined, role: undefined }]).map((signer, j) => (
                <div key={j}>
                  <div className="h-8 border-b border-ink" />
                  <p className="mt-1 mb-4 text-xs text-slate">{[signer.name, signer.role].filter(Boolean).join(", ") || "Name, Funktion"}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case "tags":
      return (
        <p className="my-2 flex flex-wrap gap-1">
          {block.items.map((t, i) => (
            <span key={i} className="rounded border border-line px-1.5 py-0.5 text-xs">
              {t}
            </span>
          ))}
        </p>
      );
    case "box":
      return (
        <div className="my-3 border-l-2 border-blue bg-mist px-4 py-3">
          {block.title ? <p className="mb-1 font-semibold text-navy">{block.title}</p> : null}
          <p className="whitespace-pre-line">
            <RichText value={block.text} />
          </p>
        </div>
      );
    case "timeline":
      return (
        <div className="mb-3 grid gap-x-4 sm:grid-cols-[7rem_1fr]">
          <p className="font-mono text-xs text-slate">{block.period}</p>
          <div>
            <p className="font-semibold text-navy">{block.title}</p>
            {block.subtitle ? <p className="text-slate">{block.subtitle}</p> : null}
            {block.text ? <p className="mt-1">{block.text}</p> : null}
          </div>
        </div>
      );
    case "spacer":
      return <div className={block.size === "lg" ? "h-6" : block.size === "sm" ? "h-1.5" : "h-3"} />;
    case "pageBreak":
      return <hr className="my-6 border-dashed border-line" />;
  }
}

export function DocPreview({ doc }: { doc: DocModel }) {
  return (
    <article aria-label={`Vorschau ${doc.title}`} className="text-[0.875rem] leading-relaxed text-ink">
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-line pb-3">
        <span className="text-sm font-semibold tracking-tight text-navy">{site.brand}</span>
        <span className="text-right">
          <span className="block text-[0.6875rem] tracking-wider text-slate uppercase">{doc.docType}</span>
          {doc.reference ? <span className="block font-mono text-[0.6875rem] text-slate">{doc.reference}</span> : null}
        </span>
      </header>
      {doc.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
      <footer className="mt-10 border-t border-line pt-2 text-[0.6875rem] text-slate">{doc.footer}</footer>
    </article>
  );
}
