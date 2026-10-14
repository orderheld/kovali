import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section backgrounds. `mist` is a deprecated alias of `paper`, kept until every page has
 * moved to `paper`; mist itself is reserved for artefact toolbars and file drop zones.
 */
export type SectionTone = "white" | "paper" | "navy" | "mist";
export type SectionSpace = "tight" | "default" | "loose";

const tones: Record<SectionTone, string> = {
  white: "bg-white",
  paper: "bg-paper",
  mist: "bg-paper",
  navy: "on-dark bg-navy text-white",
};

const spaces: Record<SectionSpace, string> = {
  tight: "py-14 md:py-20",
  default: "py-20 md:py-28",
  loose: "py-24 md:py-36",
};

/** Hairline at the top, for two consecutive sections with the same tone. */
const rules: Record<SectionTone, string> = {
  white: "border-t border-line",
  paper: "border-t border-paper-line",
  mist: "border-t border-paper-line",
  navy: "border-t border-white/10",
};

export function Section({
  id,
  tone = "white",
  space = "default",
  rule = false,
  className,
  containerClassName,
  labelledBy,
  children,
}: {
  id?: string;
  tone?: SectionTone;
  /** Vertical padding: tight `py-14 md:py-20`, default `py-20 md:py-28`, loose `py-24 md:py-36`. */
  space?: SectionSpace;
  /** Top hairline, `border-line` (or `border-paper-line` on paper). */
  rule?: boolean;
  className?: string;
  containerClassName?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(spaces[space], tones[tone], rule && rules[tone], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

/**
 * Heading block of a section. `layout="split"` puts the text in the right half on large
 * screens (H2 in columns 1–6, text in 8–12, aligned to the bottom); stacked below lg.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  text,
  layout = "stack",
  className,
  titleClassName,
  as: Heading = "h2",
}: {
  id?: string;
  /** Optional kicker above the heading. Use sparingly (spec 3: only where it adds information). */
  eyebrow?: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  layout?: "stack" | "split";
  className?: string;
  titleClassName?: string;
  as?: "h1" | "h2";
}) {
  const heading = (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading
        id={id}
        className={cn(
          "font-medium",
          Heading === "h1" ? "text-h1" : "text-h2",
          eyebrow ? "mt-4" : null,
          titleClassName,
        )}
      >
        {title}
      </Heading>
    </>
  );
  const body = text ? (
    <div className="max-w-2xl text-lg leading-relaxed text-slate md:text-xl in-[.on-dark]:text-white/75">{text}</div>
  ) : null;

  if (layout === "split") {
    return (
      <div className={cn("grid gap-4 lg:grid-cols-12 lg:gap-8", className)}>
        <div className="lg:col-span-6">{heading}</div>
        {body ? <div className="lg:col-span-5 lg:col-start-8 lg:self-end">{body}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("max-w-3xl", className)}>
      {heading}
      {body ? <div className="mt-5">{body}</div> : null}
    </div>
  );
}
