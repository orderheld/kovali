import Image from "next/image";
import { founder } from "@/content/company";
import { cn } from "@/lib/utils";

export type PortraitSize = "lg" | "md" | "avatar";

/** "Ferhat Demir, Geschäftsführer". No brand name, so it survives the coming name change. */
const PHOTO_ALT = `${founder.name}, ${founder.role}`;

/** Small avatar sizes with rounded corners. md: contact cards; avatar: bylines. */
const square: Record<Exclude<PortraitSize, "lg">, { box: string; sizes: string }> = {
  md: { box: "size-16 sm:size-[4.5rem]", sizes: "4.5rem" },
  avatar: { box: "size-11", sizes: "2.75rem" },
};

/**
 * Ferhat Demir's portrait: the cutout (white shirt, transparent background) on a calm light
 * grey tile with a soft vertical gradient, so the white shirt still stands out. No decoration.
 *
 * - lg: 4:5 tile with rounded-3xl corners (company page). Names the person in its alt text.
 * - md: round avatar of 4.5 rem (contact page).
 * - avatar: round avatar of 2.75 rem (bylines).
 *
 * md and avatar sit next to the visible name, so they are decorative (alt "").
 */
export function Portrait({
  size = "lg",
  caption = true,
  eager = false,
  className,
  sizes = "(min-width: 640px) 24rem, 90vw",
}: {
  size?: PortraitSize;
  /** lg only: name and title below the tile. Turn off where a heading next to it names him. */
  caption?: boolean;
  /** Load at once (above the fold). */
  eager?: boolean;
  className?: string;
  /** lg only: the `sizes` attribute for the responsive image. */
  sizes?: string;
}) {
  if (size !== "lg") {
    const r = square[size];
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full bg-[linear-gradient(180deg,#e9ecf0_0%,#cfd5dd_100%)]",
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
    <figure className={cn("w-full max-w-[24rem]", className)}>
      {/* Light behind the head, a little darker towards the bottom so the white shirt keeps its edge. */}
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#f1f2f5_0%,#e3e6eb_55%,#d3d8df_100%)]">
        <Image
          src={founder.portrait}
          alt={PHOTO_ALT}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-x-0 top-[5%] h-auto w-full max-w-none"
        />
        {/* The white shirt runs to the bottom edge: a soft grey fade keeps the tile's edge visible on white. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(to_top,rgb(196_202_211/0.85),rgb(196_202_211/0))]" />
      </div>
      {caption ? (
        <figcaption className="mt-4">
          <span className="block font-semibold text-graphite">{founder.name}</span>
          <span className="block text-[0.9375rem] text-muted">{founder.role}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
