import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * primary: Corporate Blue on light surfaces. secondary: outline on light surfaces.
 * inverse: Electric Blue with near-black text on dark surfaces (7.7:1). outline-inverse:
 * white outline on dark surfaces. text: a plain link with arrow.
 */
type Variant = "primary" | "secondary" | "inverse" | "outline-inverse" | "text";
type Size = "md" | "sm";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-lg text-center font-medium tracking-[-0.005em] max-w-full whitespace-normal sm:whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(11_23_51/0.2),0_8px_20px_-10px_rgb(20_91_206/0.7)] hover:bg-blue-700",
  secondary: "border border-ink/20 bg-white/60 text-ink hover:border-blue hover:text-blue",
  inverse:
    "bg-electric text-night shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_0_0_1px_rgb(53_169_255/0.4),0_10px_30px_-10px_rgb(53_169_255/0.65)] hover:bg-sky",
  "outline-inverse": "border border-white/25 bg-white/[0.03] text-white hover:border-electric hover:bg-white/[0.06] hover:text-electric",
  text: "px-0 text-blue hover:text-blue-700",
};

const sizes: Record<Size, string> = {
  // Minimum heights: a long label may wrap below 640 px instead of overflowing the screen.
  md: "min-h-12 px-6 py-2.5 text-[0.9375rem]",
  sm: "min-h-10 px-4 py-2 text-sm",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], variant === "text" ? "h-auto" : sizes[size], className);
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
