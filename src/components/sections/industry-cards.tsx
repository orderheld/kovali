import Link from "next/link";
import { industries } from "@/content/industries";
import { getService, serviceHref } from "@/content/services";
import type { Industry, ServiceSlug } from "@/content/types";
import { Tick } from "./check-list";

function ServiceLinks({ slugs }: { slugs: readonly ServiceSlug[] }) {
  return (
    <>
      {slugs.map((slug, idx) => {
        const s = getService(slug);
        return s ? (
          <span key={slug}>
            {/* No-break space before the dot, so a wrapped line never starts with it. */}
            {idx > 0 ? <span className="text-slate">{"\u00a0· "}</span> : null}
            <Link href={serviceHref(slug)} className="text-blue hover:underline">
              {s.name}
            </Link>
          </span>
        ) : null;
      })}
    </>
  );
}

/**
 * Industries of one kind, each with an anchor id (/branchen#<id>). `variant="cards"` (default)
 * draws white cards with points and discipline links, the single card grid of /branchen
 * (experience). `variant="list"` is a plain three-column list without cards, for the target
 * markets.
 */
export function IndustryCards({
  kind,
  variant = "cards",
  headingLevel: Heading = "h3",
  labelledBy,
}: {
  kind: Industry["kind"];
  variant?: "cards" | "list";
  /** Use h4 when the list sits below a group heading (h3). */
  headingLevel?: "h3" | "h4";
  /** Id of the heading that names this group. */
  labelledBy?: string;
}) {
  const list = industries.filter((i) => i.kind === kind);

  if (variant === "list") {
    return (
      <ul aria-labelledby={labelledBy} className="grid gap-x-8 gap-y-10 lg:grid-cols-3">
        {list.map((industry) => (
          <li
            key={industry.id}
            id={industry.id}
            className="min-w-0 scroll-mt-28 border-t border-line pt-6 in-[.bg-paper]:border-paper-line"
          >
            <Heading className="hyphens-auto break-words text-h3 font-semibold">{industry.name}</Heading>
            <p className="mt-3 hyphens-auto break-words leading-relaxed text-slate">{industry.summary}</p>
            <p className="mt-4 text-sm leading-7">
              <ServiceLinks slugs={industry.services} />
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-labelledby={labelledBy} className="grid gap-5 lg:grid-cols-3">
      {list.map((industry) => (
        <li
          key={industry.id}
          id={industry.id}
          className="flex min-w-0 scroll-mt-28 flex-col rounded-xl border border-line bg-white p-7"
        >
          <Heading className="hyphens-auto break-words text-h3 font-semibold">{industry.name}</Heading>
          <p className="mt-3 hyphens-auto break-words leading-relaxed text-slate">{industry.summary}</p>
          <ul className="mt-5 space-y-2 text-[0.9375rem] text-ink">
            {industry.points.map((p) => (
              <li key={p} className="flex gap-3">
                <Tick />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-6 text-sm leading-7">
            <ServiceLinks slugs={industry.services} />
          </p>
        </li>
      ))}
    </ul>
  );
}
