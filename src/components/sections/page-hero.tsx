import { DarkBackdrop, SymbolBlueprint } from "@/components/brand/motifs";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * Dark header block for subpages: grid, blue glow and, from lg, the K as a technical drawing
 * behind breadcrumbs, optional mono eyebrow, H1, lead and buttons (children, use the inverse
 * variants; full width below sm).
 */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  compact = false,
  children,
}: {
  crumbs: Crumb[];
  /** Only where it adds information (discipline pages "IT Consulting", Für Unternehmen). */
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Less vertical space, e.g. for the contact page. */
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-night text-white">
      <DarkBackdrop arms={false} />
      <Container className={cn("relative pt-8 md:pt-10", compact ? "pb-14 md:pb-16" : "pb-16 md:pb-24")}>
        {compact ? null : (
          <SymbolBlueprint className="absolute right-8 top-1/2 hidden w-[20rem] -translate-y-[46%] lg:block xl:w-[25rem]" />
        )}
        <Breadcrumbs items={crumbs} />
        <JsonLd data={breadcrumbJsonLd(crumbs)} />
        <div className={cn("grid gap-10 lg:grid-cols-12 lg:gap-8", compact ? "mt-10 md:mt-12" : "mt-12 md:mt-16")}>
          <div className="lg:col-span-8">
            {eyebrow ? <p className="eyebrow kv-rise">{eyebrow}</p> : null}
            <h1 className={cn("kv-rise text-h1 font-semibold text-white [--kv-delay:0.04s]", eyebrow && "mt-5")}>{title}</h1>
            {lead ? <div className="kv-rise mt-6 max-w-2xl text-lead text-white/70 [--kv-delay:0.08s]">{lead}</div> : null}
            {children ? <div className="kv-rise mt-9 grid gap-3 sm:flex sm:flex-wrap [--kv-delay:0.12s]">{children}</div> : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
