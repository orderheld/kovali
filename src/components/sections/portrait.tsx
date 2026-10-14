import Image from "next/image";
import { founder } from "@/content/company";
import { cn } from "@/lib/utils";

export type PortraitSize = "lg" | "sm" | "avatar";

const PHOTO_ALT = `${founder.name}, ${founder.role} von KOVALI`;

/**
 * Ferhat Demir's portrait. Reads `founder.portrait` (company.ts): with a photo it renders
 * next/image, without one a designed "FD" monogram, a final state rather than a placeholder
 * (no silhouette, no camera icon, no "Foto folgt").
 *
 * - lg: 4:5 figure with caption (person block)
 * - sm: 5.5 × 6.875 rem tile (CTA signature, contact cards, mobile person block)
 * - avatar: 3 rem circle (hero byline)
 *
 * sm and avatar are decorative next to the visible name (alt ""); lg names the person.
 */
export function Portrait({
  size = "lg",
  caption = true,
  className,
}: {
  size?: PortraitSize;
  /** lg only: show name and title (inside the tile without photo, below the photo with one). */
  caption?: boolean;
  className?: string;
}) {
  const photo = founder.portrait;

  if (size === "avatar") {
    return photo ? (
      <Image
        src={photo}
        alt=""
        sizes="3rem"
        loading="eager"
        placeholder="blur"
        className={cn("size-12 shrink-0 rounded-full object-cover", className)}
      />
    ) : (
      <span
        aria-hidden
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full bg-navy text-[0.9375rem] font-medium text-white",
          className,
        )}
      >
        FD
      </span>
    );
  }

  if (size === "sm") {
    return (
      <span
        aria-hidden={photo ? undefined : true}
        className={cn(
          "relative grid h-[6.875rem] w-[5.5rem] shrink-0 place-items-center overflow-hidden rounded-[4px] bg-paper-2",
          className,
        )}
      >
        {photo ? (
          <Image src={photo} alt="" fill sizes="5.5rem" placeholder="blur" className="object-cover" />
        ) : (
          <span className="font-display text-[2.75rem] font-extralight leading-none tracking-[-0.05em] text-navy">FD</span>
        )}
      </span>
    );
  }

  const nameplate = caption ? (
    <>
      <span className="block text-base font-semibold text-ink">{founder.name}</span>
      {founder.role}
    </>
  ) : null;

  if (photo) {
    return (
      <figure className={cn("w-full max-w-[26rem]", className)}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-paper-2">
          <Image
            src={photo}
            alt={PHOTO_ALT}
            fill
            sizes="(min-width: 1024px) 26rem, 100vw"
            placeholder="blur"
            className="object-cover"
          />
        </div>
        {nameplate ? <figcaption className="mt-4 text-sm text-slate">{nameplate}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure
      className={cn("relative aspect-[4/5] w-full max-w-[26rem] overflow-hidden rounded-[4px] bg-paper-2", className)}
    >
      <span
        aria-hidden
        className="absolute left-7 top-5 font-display text-[clamp(6rem,4rem+6vw,10rem)] font-extralight leading-none tracking-[-0.05em] text-navy"
      >
        FD
      </span>
      {/* Two hairlines at 48°, the angle of the logo's arms. */}
      <svg
        aria-hidden
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        fill="none"
      >
        <path d="M120 500 L420 160" stroke="#145bce" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M200 500 L420 255" stroke="#35a9ff" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {nameplate ? <figcaption className="absolute bottom-6 left-7 text-sm text-slate">{nameplate}</figcaption> : null}
    </figure>
  );
}
