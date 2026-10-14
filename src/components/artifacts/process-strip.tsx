import Link from "next/link";
import { addressProcess, type ProcessNode, type ProcessSample } from "@/content/work-samples";
import { cn } from "@/lib/utils";
import { ArtifactFrame } from "./artifact-frame";

type Breakpoint = "sm" | "lg";

/**
 * Classes that switch the strip from vertical to horizontal, per breakpoint. Written out in
 * full (no string building) so Tailwind finds every class in the source.
 */
const horizontal = {
  sm: {
    ol: "sm:flex-row sm:items-center sm:px-5",
    olGateway: "sm:pt-9",
    li: "sm:flex-row sm:items-center",
    first: "sm:flex-none",
    rest: "sm:flex-auto",
    task: "sm:text-center",
    gateway: "sm:block",
    gatewayLabel: "sm:absolute sm:bottom-full sm:left-1/2 sm:mb-0.5 sm:-translate-x-1/2 sm:whitespace-nowrap",
    diamond: "sm:m-[6px]",
    line: "sm:ml-0 sm:h-0 sm:w-auto sm:min-w-4 sm:flex-1 sm:border-l-0 sm:border-t-[1.5px]",
    arrowDown: "sm:hidden",
    arrowRight: "sm:block",
    lineLabel: "sm:-top-[1.375rem] sm:left-1.5",
  },
  lg: {
    ol: "lg:flex-row lg:items-center lg:px-5",
    olGateway: "lg:pt-9",
    li: "lg:flex-row lg:items-center",
    first: "lg:flex-none",
    rest: "lg:flex-auto",
    task: "lg:text-center",
    gateway: "lg:block",
    gatewayLabel: "lg:absolute lg:bottom-full lg:left-1/2 lg:mb-0.5 lg:-translate-x-1/2 lg:whitespace-nowrap",
    diamond: "lg:m-[6px]",
    line: "lg:ml-0 lg:h-0 lg:w-auto lg:min-w-4 lg:flex-1 lg:border-l-0 lg:border-t-[1.5px]",
    arrowDown: "lg:hidden",
    arrowRight: "lg:block",
    lineLabel: "lg:-top-[1.375rem] lg:left-1.5",
  },
} satisfies Record<Breakpoint, Record<string, string>>;

type Classes = (typeof horizontal)[Breakpoint];

/**
 * A BPMN-style flow built in HTML: start and end events, tasks and an exclusive gateway,
 * joined by arrows. Vertical on small screens, horizontal from `horizontalFrom` (640 px by
 * default). Events and the gateway carry screen-reader text; connectors are decorative and
 * drawn with borders and SVG, so they stay visible in forced-colors mode.
 */
export function ProcessStrip({
  process = addressProcess,
  framed = true,
  horizontalFrom = "sm",
  className,
}: {
  process?: Pick<ProcessSample, "nodes"> & Partial<Omit<ProcessSample, "nodes">>;
  /** Wrap in an ArtifactFrame ("Beispiel"). Set false for a real, non-example flow (e.g. /leistungen). */
  framed?: boolean;
  /** Breakpoint from which the strip runs horizontally: "sm" (640 px) or "lg" (1024 px, for wide nodes). */
  horizontalFrom?: Breakpoint;
  className?: string;
}) {
  const c = horizontal[horizontalFrom];
  const hasGateway = process.nodes.some((n) => n.type === "gateway");
  const strip = (
    <ol
      className={cn(
        "flex flex-col items-start py-5 pl-6 pr-5",
        c.ol,
        // Room above the row for the gateway label.
        hasGateway && c.olGateway,
        !framed && className,
      )}
    >
      {process.nodes.map((node, i) => {
        const previous = i > 0 ? process.nodes[i - 1] : undefined;
        return (
          <li key={i} className={cn("flex flex-col items-start", c.li, i === 0 ? c.first : c.rest)}>
            {previous ? <Connector c={c} label={previous.type === "gateway" ? previous.yes : undefined} /> : null}
            <Node node={node} c={c} />
          </li>
        );
      })}
    </ol>
  );

  if (!framed) return strip;
  return (
    <ArtifactFrame
      id={process.id ?? "BPMN"}
      kind={process.kind}
      caption={process.caption ?? "Prozessablauf"}
      className={className}
    >
      {strip}
    </ArtifactFrame>
  );
}

function Node({ node, c }: { node: ProcessNode; c: Classes }) {
  switch (node.type) {
    case "start":
    case "end":
      return (
        <span
          className={cn(
            "block size-7 shrink-0 rounded-full border-navy bg-white",
            node.type === "start" ? "border-[1.5px]" : "border-[3.5px]",
          )}
        >
          <span className="sr-only">{node.label ?? (node.type === "start" ? "Start" : "Ende")}</span>
        </span>
      );
    case "task":
      return (
        <span
          className={cn(
            "block rounded-lg border-[1.5px] border-navy bg-white px-3 py-2.5 text-left text-[0.8125rem] leading-snug text-ink",
            c.task,
          )}
        >
          <span className={cn("block", node.links?.length && "font-medium")}>{node.label}</span>
          {node.links?.length ? (
            <span className="mt-1 block">
              {node.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block py-[3px] leading-[1.125rem] text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                >
                  {l.label}
                </Link>
              ))}
            </span>
          ) : null}
        </span>
      );
    case "gateway":
      // The node box is exactly the visible diamond: the label sits beside it (vertical) or
      // above it (horizontal) without widening the box, and the margin equals the overhang of
      // the rotated square, so connectors meet its vertices.
      return (
        <span className={cn("relative flex flex-row-reverse items-center gap-3", c.gateway)}>
          <span className={cn("text-[0.71875rem] leading-4 text-slate", c.gatewayLabel)}>
            <span className="sr-only">Entscheidung: </span>
            {node.label}
            {node.yes ? <span className="sr-only"> Weiter bei «{node.yes}».</span> : null}
          </span>
          <span
            aria-hidden
            className={cn(
              "my-[6px] -ml-px grid size-[1.875rem] shrink-0 rotate-45 place-items-center border-[1.5px] border-navy bg-white",
              c.diamond,
            )}
          >
            <span className="-rotate-45 text-[0.9375rem] font-semibold leading-none text-navy">×</span>
          </span>
        </span>
      );
  }
}

/**
 * Sequence flow: vertical with a downward arrow, horizontal with a right arrow from the
 * breakpoint. Line as a border and arrowheads as SVG in currentColor, both of which keep
 * their colour in forced-colors mode. `label` marks a gateway's outgoing flow (e.g. "ja").
 */
function Connector({ c, label }: { c: Classes; label?: string }) {
  return (
    <span aria-hidden className={cn("relative ml-[13px] block h-5 w-0 shrink-0 border-l-[1.5px] border-slate text-slate", c.line)}>
      <svg
        viewBox="0 0 9 7"
        width="9"
        height="7"
        className={cn("absolute -left-[5.25px] bottom-0", c.arrowDown)}
        focusable="false"
      >
        <path d="M0 0h9L4.5 7z" fill="currentColor" />
      </svg>
      <svg
        viewBox="0 0 7 9"
        width="7"
        height="9"
        className={cn("absolute -top-[5.25px] right-0 hidden", c.arrowRight)}
        focusable="false"
      >
        <path d="M0 0 7 4.5 0 9z" fill="currentColor" />
      </svg>
      {label ? (
        <span className={cn("absolute left-2.5 top-0 text-[0.6875rem] leading-4 text-slate", c.lineLabel)}>{label}</span>
      ) : null}
    </span>
  );
}
