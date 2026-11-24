import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section backgrounds of the public site: white and a cool light grey (mist) for reading
 * content, night for the dark bands. Night sets `.on-dark` (electric focus rings, sky labels)
 * and white text. "cloud" and "navy" are the older names of mist and night.
 */
export type SectionTone = "white" | "mist" | "night" | "cloud" | "navy";
export type SectionSpace = "tight" | "default" | "loose";

const tones: Record<SectionTone, string> = {
  white: "bg-white",
  mist: "bg-mist",
  night: "on-dark bg-night text-white",
  cloud: "bg-mist",
  navy: "on-dark bg-night text-white",
};

const spaces: Record<SectionSpace, string> = {
  tight: "py-16 md:py-20",
  default: "py-20 md:py-28",
  loose: "py-24 md:py-36",
};

/** Hairline at the top, for two consecutive sections with the same tone. */
const rules: Record<SectionTone, string> = {
  white: "border-t border-line",
  mist: "border-t border-line",
  night: "border-t border-white/[0.08]",
  cloud: "border-t border-line",
  navy: "border-t border-white/[0.08]",
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
 * Heading block of a section: optional mono label (`.kicker`, e.g. "02 / Leistungen"), H2 and text,
 * always left-aligned.
 */
export function SectionHeader({
  id,
  kicker,
  title,
  text,
  className,
  titleClassName,
  as: Heading = "h2",
}: {
  id?: string;
  /** Mono label above the heading, e.g. "02 / Leistungen". */
  kicker?: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <Heading
        id={id}
        className={cn(
          "text-night in-[.on-dark]:text-white",
          Heading === "h1" ? "text-h1" : "text-h2",
          kicker ? "mt-4" : null,
          titleClassName,
        )}
      >
        {title}
      </Heading>
      {text ? (
        <div className="mt-5 text-lead text-slate in-[.on-dark]:text-white/75">
          {text}
        </div>
      ) : null}
    </div>
  );
}
