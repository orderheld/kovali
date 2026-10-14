import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services, serviceHref } from "@/content/services";
import type { ServiceSlug } from "@/content/types";
import { cn } from "@/lib/utils";

/**
 * The disciplines of IT Consulting as a list of linked rows (name as h3, summary, arrow).
 * Use it below an h2.
 * `umbrella` draws a navy bracket on the left, so the disciplines visibly sit under the
 * heading "IT Consulting"; `detailed` adds the first four tasks as a plain line.
 */
export function ServiceList({
  only,
  umbrella = false,
  detailed = false,
  className,
}: {
  /** Show only these services, in the order of `services`. */
  only?: readonly ServiceSlug[];
  umbrella?: boolean;
  detailed?: boolean;
  className?: string;
}) {
  const list = only ? services.filter((s) => only.includes(s.slug)) : services;
  const rows = (
    <ul className={cn("border-t border-line", !umbrella && className)}>
      {list.map((s) => (
        // The name is an h3 with a short link; the link's ::after covers the whole row, so the
        // row stays one click target while the accessible name is just the discipline.
        <li
          key={s.slug}
          className="group relative grid grid-cols-[1fr_auto] gap-x-4 border-b border-line py-7 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:rounded-[2px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-blue sm:py-8"
        >
          <div className="min-w-0">
            <h3 className="hyphens-auto text-[1.375rem] font-semibold leading-tight tracking-tight text-ink transition-colors group-hover:text-blue sm:text-[1.625rem]">
              <Link href={serviceHref(s.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
                {s.name}
              </Link>
            </h3>
            <p className="mt-2 max-w-xl leading-relaxed text-slate">{s.summary}</p>
            {detailed ? <p className="mt-3 text-sm text-slate">{s.tasks.slice(0, 4).join(" · ")}</p> : null}
          </div>
          <ArrowUpRight
            aria-hidden
            className="mt-1.5 size-5 text-slate transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue"
          />
        </li>
      ))}
    </ul>
  );

  if (!umbrella) return rows;
  return <div className={cn("border-l-2 border-navy pl-5 sm:pl-8", className)}>{rows}</div>;
}
