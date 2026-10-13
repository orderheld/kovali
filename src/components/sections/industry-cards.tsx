import Link from "next/link";
import { industries } from "@/content/industries";
import { getService, serviceHref } from "@/content/services";
import type { Industry } from "@/content/types";
import { cn } from "@/lib/utils";

export function IndustryCards({
  kind,
  detailed = false,
  label = true,
  headingLevel: Heading = "h3",
  labelledBy,
}: {
  kind: Industry["kind"];
  detailed?: boolean;
  /** Show the kind label inside each card. */
  label?: boolean;
  /** Use h4 when the cards sit below a group heading (h3). */
  headingLevel?: "h3" | "h4";
  /** Id of the heading that names this group of cards. */
  labelledBy?: string;
}) {
  const list = industries.filter((i) => i.kind === kind);
  const experience = kind === "experience";
  return (
    <ul aria-labelledby={labelledBy} className="grid gap-5 lg:grid-cols-3">
      {list.map((industry) => (
        <li
          key={industry.id}
          id={detailed ? industry.id : undefined}
          className={cn(
            "flex min-w-0 scroll-mt-28 flex-col rounded-xl border p-7",
            experience ? "border-line bg-white" : "border-dashed border-slate/35 bg-mist/60",
          )}
        >
          {label ? (
            <p className={cn("mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em]", experience ? "text-blue" : "text-slate")}>
              {experience ? "Erfahrung" : "Zielmarkt"}
            </p>
          ) : null}
          <Heading className="hyphens-auto break-words text-h3 font-semibold">{industry.name}</Heading>
          <p className="mt-3 hyphens-auto break-words leading-relaxed text-slate">{industry.summary}</p>
          {detailed ? (
            <>
              <ul className="mt-5 space-y-2 text-[0.9375rem] text-ink">
                {industry.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden className="mt-[0.6em] h-0.5 w-2.5 shrink-0 -rotate-[48deg] bg-blue" />
                    {p}
                  </li>
                ))}
              </ul>
              {industry.basis ? (
                <p className="mt-6 text-sm text-slate">
                  <span className="font-medium text-ink">Übertragbar: </span>
                  {industry.basis.replace(/^Übertragbare Kompetenzen aus /, "Kompetenzen aus ")}
                </p>
              ) : null}
              <p className="mt-auto pt-6 text-sm">
                {industry.services.map((slug, idx) => {
                  const s = getService(slug);
                  return s ? (
                    <span key={slug}>
                      {idx > 0 ? <span className="text-slate"> · </span> : null}
                      <Link href={serviceHref(slug)} className="text-blue hover:underline">
                        {s.name}
                      </Link>
                    </span>
                  ) : null;
                })}
              </p>
            </>
          ) : (
            <p className="mt-auto pt-5 text-sm text-slate">
              {industry.basis ??
                industry.services
                  .map((slug) => getService(slug)?.name)
                  .filter(Boolean)
                  .join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
