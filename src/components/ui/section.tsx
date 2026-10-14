import { DarkBackdrop } from "@/components/brand/motifs";
import { cn } from "@/lib/utils";
import { Container } from "./container";

/**
 * Section backgrounds of the public site: white and cool light grey (cloud) for content,
 * night (near-black ink) for dark bands. Night sets `.on-dark` (electric focus rings and
 * eyebrows), white text and the grid and glow behind the content.
 */
export type SectionTone = "white" | "cloud" | "night";
export type SectionSpace = "tight" | "default" | "loose";

const tones: Record<SectionTone, string> = {
  white: "bg-white",
  cloud: "bg-cloud",
  night: "on-dark relative isolate overflow-hidden bg-night text-white",
};

const spaces: Record<SectionSpace, string> = {
  tight: "py-16 md:py-20",
  default: "py-20 md:py-28",
  loose: "py-24 md:py-32",
};

/** Hairline at the top, for two consecutive sections with the same tone. */
const rules: Record<SectionTone, string> = {
  white: "border-t border-line",
  cloud: "border-t border-cloud-line",
  night: "border-t border-white/10",
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
  const dark = tone === "night";
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(spaces[space], tones[tone], rule && rules[tone], className)}
    >
      {dark ? <DarkBackdrop variant="band" arms={false} /> : null}
      <Container className={cn(dark && "relative", containerClassName)}>{children}</Container>
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
  /** Optional mono kicker above the heading. Use sparingly, only where it adds information. */
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
          "font-semibold text-ink in-[.on-dark]:text-white",
          Heading === "h1" ? "text-h1" : "text-h2",
          eyebrow ? "mt-5" : null,
          titleClassName,
        )}
      >
        {title}
      </Heading>
    </>
  );
  const body = text ? (
    <div className="max-w-2xl text-lg leading-relaxed text-slate md:text-xl md:leading-relaxed in-[.on-dark]:text-white/70">{text}</div>
  ) : null;

  if (layout === "split") {
    return (
      <div className={cn("grid gap-5 lg:grid-cols-12 lg:gap-8", className)}>
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
