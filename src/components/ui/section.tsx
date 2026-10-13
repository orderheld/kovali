import { cn } from "@/lib/utils";
import { Container } from "./container";

type Tone = "white" | "mist" | "navy";

const tones: Record<Tone, string> = {
  white: "bg-white",
  mist: "bg-mist",
  navy: "on-dark bg-navy text-white",
};

export function Section({
  id,
  tone = "white",
  className,
  containerClassName,
  labelledBy,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  containerClassName?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-20 md:py-28", tones[tone], className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  text,
  className,
  as: Heading = "h2",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  text?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading
        id={id}
        className={cn(
          "font-semibold",
          Heading === "h1" ? "text-h1" : "text-h2",
          eyebrow ? "mt-4" : null,
        )}
      >
        {title}
      </Heading>
      {text ? (
        <div className="mt-5 text-lead text-slate in-[.on-dark]:text-white/75">{text}</div>
      ) : null}
    </div>
  );
}
