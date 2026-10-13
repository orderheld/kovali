import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";

/** Header block for subpages: breadcrumbs, eyebrow, H1 and lead on a fine grid. */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  children,
}: {
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-mist">
      <div
        aria-hidden
        className="grid-lines pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)] opacity-70"
      />
      <DiagonalAccent className="absolute -right-10 -top-6 hidden h-[130%] md:block" />
      <Container className="relative pb-16 pt-10 md:pb-20 md:pt-12">
        <Breadcrumbs items={crumbs} />
        <JsonLd data={breadcrumbJsonLd(crumbs)} />
        <div className="mt-12 max-w-3xl md:mt-16">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-4 text-h1 font-semibold">{title}</h1>
          {lead ? <div className="mt-6 text-lead text-slate">{lead}</div> : null}
          {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </Container>
    </section>
  );
}

/** The 48° diagonal motif taken from the logo's arms. Purely decorative. */
export function DiagonalAccent({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const strong = tone === "light" ? "#145BCE" : "#35A9FF";
  const soft = tone === "light" ? "#35A9FF" : "#8FC9FF";
  return (
    <svg aria-hidden viewBox="0 0 320 360" className={className} fill="none" preserveAspectRatio="xMaxYMid meet">
      <path d="M40 360 L360 4" stroke={strong} strokeOpacity="0.18" strokeWidth="1" />
      <path d="M110 360 L430 4" stroke={soft} strokeOpacity="0.28" strokeWidth="1" />
      <path d="M180 360 L500 4" stroke={strong} strokeOpacity="0.1" strokeWidth="1" />
      <rect x="214" y="132" width="10" height="10" fill={soft} opacity="0.7" transform="rotate(-42 219 137)" />
    </svg>
  );
}
