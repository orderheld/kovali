import { cn } from "@/lib/utils";

/**
 * Window around an example artefact: a toolbar with ID, kind and the tag "Beispiel", and a
 * screen-reader caption "Fiktives Beispiel: …". Titles inside an artefact are <p>, never headings.
 * Geist Mono is used only inside artefacts.
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
        "overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_1px_0_rgb(11_23_51/0.04),0_18px_40px_-18px_rgb(11_23_51/0.22)]",
        className,
      )}
    >
      <figcaption className="sr-only">Fiktives Beispiel: {caption}</figcaption>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-mist px-4 py-2.5 text-xs text-slate">
        <p className="min-w-0">
          <span className="font-mono font-medium text-blue">{id}</span>
          {kind ? ` · ${kind}` : null}
        </p>
        <span className="shrink-0 rounded-full border border-line bg-white px-2 py-0.5 text-[0.6875rem]">{tag}</span>
      </div>
      {children}
    </figure>
  );
}
