import Image from "next/image";
import { ArmLines, CornerMarks } from "@/components/brand/motifs";
import { founder } from "@/content/company";
import { cn } from "@/lib/utils";

export type PortraitSize = "lg" | "md" | "avatar";

const PHOTO_ALT = `${founder.name}, ${founder.role} von KOVALI`;

/** Round avatar sizes. md: CTA signature and contact cards; avatar: hero byline. */
const round: Record<Exclude<PortraitSize, "lg">, { box: string; sizes: string }> = {
  md: { box: "size-16 sm:size-[4.5rem]", sizes: "4.5rem" },
  avatar: { box: "size-11", sizes: "2.75rem" },
};

/**
 * Ferhat Demir's portrait: a cutout with transparent background on a composed dark frame
 * (ink base, corporate-to-electric glow behind head and shoulders, faint grid, the logo's
 * 48-degree arms, a mono name label).
 *
 * - lg: 4:5 frame (person block, contact card). Names the person in its alt text.
 * - md: round avatar of 4.5 rem (CTA signature, contact page).
 * - avatar: round avatar of 2.75 rem (hero byline).
 *
 * md and avatar sit next to the visible name, so they are decorative (alt "").
 */
export function Portrait({
  size = "lg",
  caption = true,
  eager = false,
  className,
  sizes = "(min-width: 1024px) 28rem, (min-width: 640px) 24rem, 90vw",
}: {
  size?: PortraitSize;
  /** lg only: mono label with name and title at the bottom of the frame. */
  caption?: boolean;
  /** Load at once (above the fold). */
  eager?: boolean;
  className?: string;
  /** lg only: the `sizes` attribute for the responsive image. */
  sizes?: string;
}) {
  if (size !== "lg") {
    const r = round[size];
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full bg-night ring-1 ring-electric/35 ring-offset-0",
          "bg-[radial-gradient(circle_at_50%_38%,#1f7bea_0%,#145bce_28%,#0b1733_62%,#060b18_100%)]",
          r.box,
          className,
        )}
      >
        <Image
          src={founder.avatar}
          alt=""
          fill
          sizes={r.sizes}
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <figure className={cn("relative w-full max-w-[28rem]", className)}>
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-2xl bg-night shadow-[0_30px_80px_-30px_rgb(6_11_24/0.55)] ring-1 ring-night/10">
        {/* Base: ink at the top, near-black at the bottom. */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#0b1733_0%,#081026_55%,#060b18_100%)]" />
        <div
          aria-hidden
          className="tech-grid absolute inset-0 [--grid-color:rgb(143_201_255/0.09)] [--grid-size:36px] [mask-image:radial-gradient(ellipse_80%_65%_at_50%_30%,black_30%,transparent_80%)]"
        />
        {/* Glow behind head and shoulders: corporate blue into electric. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[34%] aspect-square w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(53_169_255/0.55)_0%,rgb(31_123_234/0.42)_24%,rgb(20_91_206/0.2)_44%,transparent_66%)]"
        />
        <ArmLines className="absolute bottom-[18%] left-[-6%] h-[70%] w-full opacity-90" />
        <Image
          src={founder.portrait}
          alt={PHOTO_ALT}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-x-0 top-[6%] h-auto w-full max-w-none drop-shadow-[0_0_1px_rgb(143_201_255/0.5)]"
        />
        {/* Fade into the frame at the bottom, so the label sits on a dark surface. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(to_top,#060b18_0%,rgb(6_11_24/0.92)_30%,rgb(6_11_24/0.55)_62%,transparent_100%)]"
        />
        <CornerMarks className="inset-4" />
      </div>
      {caption ? (
        <figcaption className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 font-mono text-[0.75rem] uppercase leading-5 tracking-[0.08em]">
          <span>
            <span className="block font-medium text-white">{founder.name}</span>
            <span className="block text-sky">{founder.role}</span>
          </span>
          <span aria-hidden className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] text-white/60">
            <span className="size-1.5 rounded-full bg-electric shadow-[0_0_8px_rgb(53_169_255/0.9)]" />
            KOVALI
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
