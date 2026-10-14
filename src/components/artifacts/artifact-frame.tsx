import { cn } from "@/lib/utils";

/**
 * Window around an example artefact: a toolbar with three window dots, ID and kind in Geist
 * Mono and the tag "Beispiel", and a screen-reader caption "Fiktives Beispiel: …". Titles
 * inside an artefact are <p>, never headings. On dark sections the window gets a thin
 * electric ring and a blue glow.
 */
export function ArtifactFrame({
  id,
  kind,
  caption,
  tag = "Beispiel",
  className,
  children,
}: {
  /** Shown in mono blue, e.g. "US-112" or "Rückverfolgbarkeit". */
  id: string;
  /** Shown after " · ", e.g. "User Story". */
  kind?: string;
  /** Read by screen readers after "Fiktives Beispiel: ". */
  caption: string;
  /** Visible tag on the right of the toolbar. */
  tag?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      className={cn(
        "on-light overflow-hidden rounded-xl border border-line bg-white text-ink shadow-[0_1px_0_rgb(11_23_51/0.04),0_24px_48px_-24px_rgb(11_23_51/0.28)]",
        "in-[.on-dark]:border-white/10 in-[.on-dark]:shadow-[0_0_0_1px_rgb(53_169_255/0.18),0_30px_80px_-30px_rgb(20_91_206/0.75),0_12px_24px_-12px_rgb(0_0_0/0.6)]",
        className,
      )}
    >
      <figcaption className="sr-only">Fiktives Beispiel: {caption}</figcaption>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-cloud px-4 py-2.5 text-xs text-slate">
        <p className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex shrink-0 gap-1">
            <span className="size-2 rounded-full bg-line" />
            <span className="size-2 rounded-full bg-line" />
            <span className="size-2 rounded-full bg-line" />
          </span>
          <span className="min-w-0">
            <span className="font-mono font-medium text-blue">{id}</span>
            {kind ? <span className="font-mono"> · {kind}</span> : null}
          </span>
        </p>
        <span className="shrink-0 rounded-[4px] border border-line bg-white px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-slate">
          {tag}
        </span>
      </div>
      {children}
    </figure>
  );
}
