import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * Header block for subpages on paper: breadcrumbs, optional eyebrow, H1, lead, buttons
 * (children), an optional note under the buttons (e.g. the price line) and an optional
 * aside in the right third on large screens.
 */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  note,
  aside,
  children,
}: {
  crumbs: Crumb[];
  /** Only where it adds information (spec 3: discipline pages "IT Consulting", Für Unternehmen). */
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Small line below the buttons, `text-sm text-slate`, e.g. the price teaser. */
  note?: React.ReactNode;
  /** Right column from lg (columns 9–12, bottom aligned); below the text on smaller screens. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-paper-line bg-paper">
      <Container className="pb-14 pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={crumbs} />
        <JsonLd data={breadcrumbJsonLd(crumbs)} />
        <div className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1 className={cn("text-h1 font-medium text-ink", eyebrow && "mt-4")}>{title}</h1>
            {lead ? <div className="mt-6 max-w-2xl text-lead text-slate">{lead}</div> : null}
            {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
            {note ? <div className="mt-4 text-sm text-slate">{note}</div> : null}
          </div>
          {aside ? <div className="lg:col-span-4 lg:col-start-9 lg:self-end">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
