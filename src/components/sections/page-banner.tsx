import Image from "next/image";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { scenes, type BannerScene } from "@/content/scenes";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** One step of the breadcrumb trail, from the home page to the current page. */
export interface Crumb {
  name: string;
  path: string;
}

/** Id of the page title (the H1 in the header); the header section is labelled by it. */
export const PAGE_TITLE_ID = "seitentitel";

/**
 * Dark page header of every subpage: a mono label, the page title and an optional lead,
 * left-aligned. On wide screens a 3D image fills the right side and fades into the dark
 * surface; on small screens it is a band at the top with the text below it. The image is
 * decorative. The breadcrumb trail goes to search engines as structured data (none on the
 * 404 page); the label shows the parent page unless a kicker is given.
 */
export function PageBanner({
  crumbs,
  scene,
  kicker,
  title,
  lead,
  size = "md",
}: {
  crumbs?: Crumb[];
  scene: BannerScene;
  /** Mono label above the title; defaults to the parent page of the breadcrumb trail. */
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** md: title only or short lead; lg: more height for a longer title and lead. */
  size?: "md" | "lg";
}) {
  const label = kicker ?? (crumbs && crumbs.length > 2 ? crumbs[crumbs.length - 2].name : undefined);
  return (
    <section aria-labelledby={PAGE_TITLE_ID} className="on-dark relative isolate overflow-hidden bg-night text-white">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-20 h-40 sm:h-48 md:inset-y-0 md:left-auto md:h-auto md:w-[68%]"
      >
        <Image
          src={scenes.banner[scene]}
          alt=""
          fill
          preload
          // object-cover draws these wide images at box height x aspect, wider than the box.
          sizes="(min-width: 768px) 1500px, 120vw"
          placeholder="blur"
          className="object-cover object-right"
        />
      </div>
      {/* Fades the image into the dark surface: below the band on small screens, from the left on
          wide ones, so the text always sits on dark. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(180deg,rgb(6_11_24/0)_0%,rgb(6_11_24/0.15)_45%,var(--color-night)_100%)] sm:h-48 md:inset-y-0 md:h-auto md:bg-[linear-gradient(90deg,var(--color-night)_0%,rgb(6_11_24/0.92)_46%,rgb(6_11_24/0.3)_74%,rgb(6_11_24/0)_100%)]"
      />
      <Container
        className={cn(
          "flex flex-col justify-end",
          size === "lg"
            ? "pb-16 pt-40 sm:pt-48 md:min-h-[30rem] md:pb-20 md:pt-24"
            : "pb-14 pt-40 sm:pt-48 md:min-h-[26rem] md:pb-[4.5rem] md:pt-20",
        )}
      >
        {label ? <p className="kicker kv-rise">{label}</p> : null}
        <h1
          id={PAGE_TITLE_ID}
          className={cn("kv-rise max-w-3xl text-h1 text-white [--kv-delay:0.04s]", label && "mt-5")}
        >
          {title}
        </h1>
        {lead ? <div className="kv-rise mt-6 max-w-2xl text-lead text-white/75 [--kv-delay:0.08s]">{lead}</div> : null}
      </Container>
      {crumbs ? <JsonLd data={breadcrumbJsonLd(crumbs)} /> : null}
    </section>
  );
}
