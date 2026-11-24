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

/** Id of the page title (the H1 in the banner); the banner section is labelled by it. */
export const PAGE_TITLE_ID = "seitentitel";

/**
 * Opening banner of every subpage: a wide alpine panorama (decorative) with the page title
 * centred on it in white. An optional kicker sits above the title and an optional lead below.
 * The breadcrumb trail goes to search engines as structured data only (none on the 404 page).
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
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** md: title only or short lead; lg: more height for a longer title and lead. */
  size?: "md" | "lg";
}) {
  return (
    <section aria-labelledby={PAGE_TITLE_ID} className="on-dark relative isolate overflow-hidden bg-night text-white">
      <Image
        src={scenes.banner[scene]}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-[50%_60%]"
      />
      {/* Darker towards the edges, so the white title reads on every crop. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_90%_at_50%_55%,rgb(6_11_24/0.25),rgb(6_11_24/0.6))]" />
      <Container
        className={cn(
          "flex flex-col items-center justify-center text-center",
          size === "lg" ? "min-h-[22rem] py-20 md:min-h-[26rem]" : "min-h-[16rem] py-16 md:min-h-[19rem]",
        )}
      >
        {kicker ? <p className="kicker kv-rise">{kicker}</p> : null}
        <h1 id={PAGE_TITLE_ID} className={cn("kv-rise max-w-4xl text-h1 text-white [--kv-delay:0.04s]", kicker && "mt-4")}>{title}</h1>
        {lead ? <div className="kv-rise mt-5 max-w-2xl text-lead text-white/80 [--kv-delay:0.08s]">{lead}</div> : null}
      </Container>
      {crumbs ? <JsonLd data={breadcrumbJsonLd(crumbs)} /> : null}
    </section>
  );
}
