import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Buttons of the public site: calm rounded pills in normal case, plus a text link with a chevron.
 *
 * primary: Corporate Blue with white text, the one main action of a section.
 * secondary: light grey fill with blue text, for a second action next to primary.
 * outline: hairline outline with near-black text, on white or canvas.
 * link: a blue text link with a chevron ("Mehr erfahren ›").
 */
type Variant = "primary" | "secondary" | "outline" | "link";
type Size = "md" | "sm";

const base =
  "group inline-flex items-center justify-center gap-1.5 rounded-full text-center font-medium max-w-full whitespace-normal sm:whitespace-nowrap transition-[color,background-color,border-color] duration-200 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-700",
  secondary: "bg-canvas text-blue hover:bg-[#e8e8ed]",
  outline: "border border-hairline text-graphite hover:border-graphite/40",
  link: "text-blue hover:text-blue-700 hover:underline hover:underline-offset-4",
};

const sizes: Record<Size, string> = {
  // Minimum heights: a long label may wrap below 640 px instead of overflowing the screen.
  md: "min-h-12 px-6 py-3 text-[1.0625rem]",
  sm: "min-h-10 px-4 py-2 text-[0.9375rem]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    base,
    variants[variant],
    variant === "link" ? "min-h-10 rounded-none px-0 text-[1.0625rem]" : sizes[size],
    className,
  );
}

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  /** Chevron after the label; on by default for the link variant only. */
  chevron?: boolean;
  className?: string;
}

export function ButtonLink({ href, children, variant = "primary", size, chevron, className }: ButtonLinkProps) {
  const showChevron = chevron ?? variant === "link";
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
      {showChevron ? <ButtonChevron /> : null}
    </Link>
  );
}

/** The chevron of text links; moves a little on hover. */
export function ButtonChevron() {
  return (
    <ChevronRight
      aria-hidden
      className="size-[1.1em] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      strokeWidth={2}
    />
  );
}
