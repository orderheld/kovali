import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section backgrounds of the public site: white and cool light grey (cloud) for content,
 * navy for the dark bands. Navy sets `.on-dark` (electric focus rings and kickers) and white text.
 */
export type SectionTone = "white" | "cloud" | "navy";
export type SectionSpace = "tight" | "default" | "loose";

const tones: Record<SectionTone, string> = {
  white: "bg-white",
  cloud: "bg-cloud",
  navy: "on-dark bg-navy text-white",
};

const spaces: Record<SectionSpace, string> = {
  tight: "py-16 md:py-20",
  default: "py-20 md:py-28",
  loose: "py-24 md:py-36",
};

/** Hairline at the top, for two consecutive sections with the same tone. */
const rules: Record<SectionTone, string> = {
  white: "border-t border-line",
  cloud: "border-t border-cloud-line",
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
  /** Vertical padding: tight `py-16 md:py-20`, default `py-20 md:py-28`, loose `py-24 md:py-36`. */
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
      className={cn(spaces[space], tones[tone], rule && rules[tone], id && "scroll-mt-24", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}

/**
 * Heading block of a section: optional kicker (small spaced capitals), H2 and text.
 * `align="center"` centres the block, as for the service and article overviews.
 */
export function SectionHeader({
  id,
  kicker,
  title,
  text,
  align = "start",
  className,
  titleClassName,
  as: Heading = "h2",
}: {
  id?: string;
  /** Small spaced capitals above the heading, e.g. "Leistungen". Only where it helps orientation. */
  kicker?: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
  titleClassName?: string;
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <div className={cn(center ? "mx-auto max-w-3xl text-center" : "max-w-3xl", className)}>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <Heading
        id={id}
        className={cn(
          "text-navy in-[.on-dark]:text-white",
          Heading === "h1" ? "text-h1" : "text-h2",
          kicker ? "mt-4" : null,
          titleClassName,
        )}
      >
        {title}
      </Heading>
      {text ? (
        <div className={cn("mt-5 text-lead text-slate in-[.on-dark]:text-white/75", center && "mx-auto max-w-2xl")}>
          {text}
        </div>
      ) : null}
    </div>
  );
}
