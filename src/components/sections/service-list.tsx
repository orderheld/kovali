import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services, serviceHref } from "@/content/services";
import type { ServiceSlug } from "@/content/types";
import { cn } from "@/lib/utils";

/**
 * The disciplines of IT Consulting as a list of linked rows (mono index, name as h3, summary,
 * arrow). Use it below an h2.
 * `umbrella` hangs the rows on a vertical line in the two blues with a node per discipline,
 * so they visibly sit under the heading "IT Consulting"; `detailed` adds the first four tasks.
 */
export function ServiceList({
  only,
  umbrella = false,
  detailed = false,
  layout = "rows",
  className,
}: {
  /** Show only these services, in the order of `services`. */
  only?: readonly ServiceSlug[];
  umbrella?: boolean;
  detailed?: boolean;
  /** rows: full-width linked rows; cards: a grid of linked cards (for two or three related disciplines). */
  layout?: "rows" | "cards";
  className?: string;
}) {
  const list = only ? services.filter((s) => only.includes(s.slug)) : services;

  if (layout === "cards") {
    return (
      <ul className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
        {list.map((s) => (
          <li
            key={s.slug}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white p-7 transition-[border-color,box-shadow] duration-200 hover:border-blue/40 hover:shadow-[0_24px_48px_-28px_rgb(20_91_206/0.45)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-blue"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-blue to-electric transition-transform duration-300 group-hover:scale-x-100"
            />
            <p aria-hidden className="font-mono text-xs text-blue">
              {String(services.indexOf(s) + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-3 hyphens-auto text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-ink transition-colors group-hover:text-blue">
              <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
                {s.name}
              </Link>
            </h3>
            <p className="mb-6 mt-3 leading-relaxed text-slate">{s.summary}</p>
            <span
              aria-hidden
              className="mt-auto flex size-10 items-center justify-center rounded-lg border border-line bg-white text-slate transition-colors group-hover:border-blue group-hover:bg-blue group-hover:text-white"
            >
              <ArrowUpRight className="size-[1.125rem]" />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  const rows = (
    <ul className={cn("border-t border-line in-[.bg-cloud]:border-cloud-line", !umbrella && className)}>
      {list.map((s) => {
        const index = services.indexOf(s) + 1;
        return (
          // The name is an h3 with a short link; the link's ::after covers the whole row, so the
          // row stays one click target while the accessible name is just the discipline.
          <li
            key={s.slug}
            className="group relative grid grid-cols-[1fr_auto] gap-x-4 border-b border-line py-7 in-[.bg-cloud]:border-cloud-line has-[a:focus-visible]:rounded-[2px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-blue sm:py-8"
          >
            {umbrella ? (
              <span
                aria-hidden
                className="absolute -left-[calc(1.25rem+3.5px)] top-8 size-2 rounded-full bg-white ring-2 ring-blue transition-colors group-hover:bg-electric sm:-left-[calc(2rem+3.5px)] sm:top-9"
              />
            ) : null}
            <div className="min-w-0">
              <p aria-hidden className="font-mono text-xs text-blue">
                {String(index).padStart(2, "0")}
              </p>
              <h3 className="mt-2 hyphens-auto text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-ink transition-colors group-hover:text-blue sm:text-[1.625rem]">
                <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {s.name}
                </Link>
              </h3>
              <p className="mt-2.5 max-w-xl leading-relaxed text-slate">{s.summary}</p>
              {detailed ? (
                <p className="mt-3 font-mono text-[0.75rem] leading-relaxed text-slate">{s.tasks.slice(0, 4).join(" · ")}</p>
              ) : null}
            </div>
            <span
              aria-hidden
              className="mt-6 flex size-10 items-center justify-center rounded-lg border border-line bg-white text-slate transition-colors group-hover:border-blue group-hover:bg-blue group-hover:text-white"
            >
              <ArrowUpRight className="size-[1.125rem] transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
            </span>
          </li>
        );
      })}
    </ul>
  );

  if (!umbrella) return rows;
  return (
    <div className={cn("relative pl-5 sm:pl-8", className)}>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-px bg-linear-to-b from-blue via-azure to-electric/30"
      />
      {rows}
    </div>
  );
}
