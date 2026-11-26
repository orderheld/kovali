import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
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
 * Light page header of every subpage: a blue eyebrow, the page title and an optional lead,
 * left-aligned on white, with generous space and no image. An optional `aside` (an example
 * artefact, a portrait) sits to the right from lg; `children` (buttons, meta lines) go below
 * the lead. The breadcrumb trail goes to search engines as structured data (none on the 404
 * page); the eyebrow shows the parent page unless a kicker is given.
 */
export function PageBanner({
  crumbs,
  kicker,
  title,
  lead,
  aside,
  size = "h1",
  children,
  className,
}: {
  crumbs?: Crumb[];
  /** Eyebrow above the title; defaults to the parent page of the breadcrumb trail. */
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Right column from lg, vertically centred next to the text. */
  aside?: React.ReactNode;
  /** Title size: h1, or the smaller title size for long titles next to an aside. */
  size?: "h1" | "title";
  children?: React.ReactNode;
  className?: string;
}) {
  const label = kicker ?? (crumbs && crumbs.length > 2 ? crumbs[crumbs.length - 2].name : undefined);
  const text = (
    <div className={cn(aside ? "lg:col-span-7" : undefined)}>
      {label ? <p className="kicker kv-rise">{label}</p> : null}
      <h1
        id={PAGE_TITLE_ID}
        className={cn(
          "kv-rise max-w-4xl text-graphite [--kv-delay:0.04s]",
          size === "title" ? "text-title" : "text-h1",
          label && "mt-4",
        )}
      >
        {title}
      </h1>
      {lead ? <div className="kv-rise mt-6 max-w-2xl text-lead text-muted [--kv-delay:0.08s]">{lead}</div> : null}
      {children ? <div className="kv-rise mt-9 [--kv-delay:0.12s]">{children}</div> : null}
    </div>
  );
  return (
    <section aria-labelledby={PAGE_TITLE_ID} className={cn("bg-white", className)}>
      <Container className="pb-16 pt-14 md:pb-24 md:pt-24">
        {aside ? (
          <div className="grid items-center gap-x-12 gap-y-14 lg:grid-cols-12">
            {text}
            <div className="kv-rise lg:col-span-5 [--kv-delay:0.12s]">{aside}</div>
          </div>
        ) : (
          text
        )}
      </Container>
      {crumbs ? <JsonLd data={breadcrumbJsonLd(crumbs)} /> : null}
    </section>
  );
}
