import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons of the public site: rounded pills in normal case, medium weight.
 *
 * primary: night on light surfaces. light: white with night text on dark surfaces and images.
 * accent: Electric Blue with night text on dark surfaces (8:1). outline: hairline outline on
 * light surfaces. ghost: white hairline outline on dark surfaces. text: a plain link with arrow.
 */
type Variant = "primary" | "light" | "accent" | "outline" | "ghost" | "text";
type Size = "md" | "sm";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full text-center font-medium max-w-full whitespace-normal sm:whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-night text-white hover:bg-navy-700",
  light: "bg-white text-night hover:bg-sky",
  accent: "bg-electric text-night hover:bg-sky",
  outline: "border border-night/15 text-night hover:border-night/40 hover:bg-mist",
  ghost: "border border-white/20 text-white hover:border-white/50 hover:bg-white/10",
  text: "font-medium text-blue hover:text-blue-700",
};

const sizes: Record<Size, string> = {
  // Minimum heights: a long label may wrap below 640 px instead of overflowing the screen.
  md: "min-h-12 px-6 py-3 text-[0.9375rem]",
  sm: "min-h-10 px-5 py-2 text-sm",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], variant === "text" ? "h-auto rounded-none px-0 text-base" : sizes[size], className);
}

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  /** Arrow after the label; on by default for every variant. */
  arrow?: boolean;
  className?: string;
}

export function ButtonLink({ href, children, variant, size, arrow = true, className }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
      {arrow ? <ButtonArrow /> : null}
    </Link>
  );
}

/** The arrow of the buttons; moves a little on hover. */
export function ButtonArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      strokeWidth={2}
    />
  );
}
