import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons of the public site: rectangular, small spaced capitals.
 *
 * primary: navy on light surfaces. accent: Electric Blue with navy text on dark surfaces and
 * images (7.4:1). outline: navy outline on light surfaces. outline-inverse: white outline on
 * dark surfaces. text: a plain link with arrow, in normal case.
 */
type Variant = "primary" | "accent" | "outline" | "outline-inverse" | "text";
type Size = "md" | "sm";

const base =
  "group inline-flex items-center justify-center gap-2.5 rounded-[2px] text-center font-semibold uppercase tracking-[0.14em] max-w-full whitespace-normal sm:whitespace-nowrap transition-[color,background-color,border-color] duration-200 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-blue",
  accent: "bg-electric text-navy hover:bg-sky",
  outline: "border border-navy/25 text-navy hover:border-navy hover:bg-navy hover:text-white",
  "outline-inverse": "border border-white/40 text-white hover:border-white hover:bg-white hover:text-navy",
  text: "normal-case tracking-normal font-medium text-blue hover:text-blue-700",
};

const sizes: Record<Size, string> = {
  // Minimum heights: a long label may wrap below 640 px instead of overflowing the screen.
  md: "min-h-12 px-7 py-3 text-xs",
  sm: "min-h-10 px-5 py-2.5 text-[0.6875rem]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], variant === "text" ? "h-auto px-0 text-base" : sizes[size], className);
}

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
}

export function ButtonLink({ href, children, variant, size, arrow, className }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
      {arrow ? (
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      ) : null}
    </Link>
  );
}
