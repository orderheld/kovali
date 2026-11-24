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
 * Ferhat Demir's portrait: the cutout (white shirt, transparent background) on a calm
 * night-navy tile with a subtle vertical gradient. Rounded corners as the cards, no decoration.
 *
 * - lg: 4:5 tile with rounded-3xl corners (company page). Names the person in its alt text.
 * - md: navy avatar of 4.5 rem with rounded-xl corners (contact page).
 * - avatar: navy avatar of 2.75 rem with rounded-xl corners (bylines).
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
          "relative inline-block shrink-0 overflow-hidden rounded-xl bg-navy bg-[linear-gradient(180deg,#1c3a78_0%,#0b1733_100%)]",
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
      {/* Lighter navy behind the head, so dark hair stays visible; full navy behind the white shirt. */}
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-3xl bg-navy bg-[linear-gradient(180deg,#1c3a78_0%,#13224a_48%,#0b1733_100%)]">
        <Image
          src={founder.portrait}
          alt={PHOTO_ALT}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-x-0 top-[5%] h-auto w-full max-w-none"
        />
        {/* The white shirt runs to the bottom edge: a soft navy fade keeps the tile's edge visible on white. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4 bg-[linear-gradient(to_top,rgb(11_23_51/0.9),rgb(11_23_51/0))]" />
      </div>
      {caption ? (
        <figcaption className="mt-4">
          <span className="block font-medium text-night">{founder.name}</span>
          <span className="block text-[0.9375rem] text-slate">{founder.role}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
