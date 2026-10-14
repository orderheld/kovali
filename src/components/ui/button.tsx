import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "inverse" | "outline-inverse" | "text";
type Size = "md" | "sm";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-md text-center font-medium max-w-full whitespace-normal sm:whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-700",
  secondary: "border border-line bg-white text-ink hover:border-blue hover:text-blue",
  inverse: "bg-electric text-navy hover:bg-white",
  "outline-inverse": "border border-white/30 text-white hover:border-electric hover:text-electric",
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
