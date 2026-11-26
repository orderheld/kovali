import { cn } from "@/lib/utils";

/**
 * The site's imagery: small, calm examples of real project artefacts (a user story, a process
 * model, a test run), drawn in HTML and SVG instead of photos or renders. They show what the
 * work looks like, without any product's interface or logo.
 *
 * ExampleCard is one white panel with a hairline, a soft shadow and a header line.
 * ExampleFigure wraps one or more of them with a visible "Beispiel" caption; the drawn content
 * is hidden from screen readers, the caption says what it shows.
 */
export function ExampleCard({
  label,
  meta,
  children,
  className,
}: {
  /** Header line, e.g. "User Story · ANF-142". */
  label: React.ReactNode;
  /** Right side of the header, e.g. a status pill. */
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline/80 bg-white text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_48px_-20px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-hairline/70 px-5 py-3.5">
        <p className="truncate text-[0.8125rem] font-medium text-muted">{label}</p>
        {meta}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

const pillTones = {
  blue: "bg-blue/[0.08] text-blue",
  green: "bg-pass-bg text-pass",
  grey: "bg-canvas text-muted",
} as const;

export function Pill({ tone = "grey", children }: { tone?: keyof typeof pillTones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium", pillTones[tone])}>
      {children}
    </span>
  );
}

export function ExampleFigure({
  caption,
  children,
  className,
  captionClassName,
}: {
  caption: string;
  children: React.ReactNode;
  className?: string;
  captionClassName?: string;
}) {
  return (
    <figure className={className}>
      <div aria-hidden="true">{children}</div>
      <figcaption className={cn("mt-5 text-[0.875rem] text-muted", captionClassName)}>{caption}</figcaption>
    </figure>
  );
}
