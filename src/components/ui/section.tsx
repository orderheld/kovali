import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section backgrounds of the public site: white and a neutral light grey (canvas). Sections
 * alternate between the two; there are no dark sections.
 */
export type SectionTone = "white" | "canvas";
export type SectionSpace = "tight" | "default" | "loose";

const tones: Record<SectionTone, string> = {
  white: "bg-white",
  canvas: "bg-canvas",
};

const spaces: Record<SectionSpace, string> = {
  tight: "py-16 md:py-20",
  default: "py-20 md:py-28",
  loose: "py-24 md:py-32",
};

/** Hairline at the top, for two consecutive sections with the same tone. */
const rules: Record<SectionTone, string> = {
  white: "border-t border-hairline/70",
  canvas: "border-t border-hairline/70",
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
  /** Vertical padding: tight `py-16 md:py-20`, default `py-20 md:py-28`, loose `py-24 md:py-32`. */
  space?: SectionSpace;
  /** Top hairline in the colour of the tone. */
  rule?: boolean;
  className?: string;
  containerClassName?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  // A section without a heading of its own (e.g. the list right below a page banner) is a
  // plain block: an unnamed <section> adds nothing for screen readers.
  const Tag = labelledBy ? "section" : "div";
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cn(spaces[space], tones[tone], rule && rules[tone], id && "-scroll-mt-6", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}

/**
 * Heading block of a section: optional short label (`.kicker`, e.g. "Requirements Engineering"),
 * H2 and lead text. Left-aligned by default; `align="center"` only for the few calm, centred
 * statements (home hero area, closing panel), never for a heading above a row of icon columns.
 */
export function SectionHeader({
  id,
  kicker,
  title,
  text,
  className,
  titleClassName,
  as: Heading = "h2",
  align = "start",
}: {
  id?: string;
  /** Short label above the heading, sentence case, e.g. "Werkzeuge". */
  kicker?: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  as?: "h1" | "h2";
  align?: "start" | "center";
}) {
  const center = align === "center";
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center", className)}>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <Heading
        id={id}
        className={cn("text-graphite", Heading === "h1" ? "text-h1" : "text-h2", kicker ? "mt-3" : null, titleClassName)}
      >
        {title}
      </Heading>
      {text ? <div className={cn("mt-5 text-lead text-muted", center && "mx-auto max-w-2xl")}>{text}</div> : null}
    </div>
  );
}
