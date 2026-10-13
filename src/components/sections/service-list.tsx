import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services, serviceHref } from "@/content/services";
import type { ServiceSlug } from "@/content/types";
import { cn } from "@/lib/utils";

/** Numbered index of services, ordered along the chain from requirement to acceptance. */
export function ServiceList({ only, className }: { only?: ServiceSlug[]; className?: string }) {
  const list = only ? services.filter((s) => only.includes(s.slug)) : services;
  return (
    <ul className={cn("border-t border-line", className)}>
      {list.map((s) => (
        <li key={s.slug} className="border-b border-line">
          <Link
            href={serviceHref(s.slug)}
            className="group grid grid-cols-[2.5rem_1fr_auto] items-start gap-x-4 py-6 transition-colors sm:grid-cols-[3.5rem_1fr_auto] sm:py-7"
          >
            <span className="pt-1 font-mono text-sm text-blue">{s.code}</span>
            <span>
              <span className="block text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-blue sm:text-[1.375rem]">
                {s.name}
              </span>
              <span className="mt-2 block max-w-xl leading-relaxed text-slate">{s.summary}</span>
            </span>
            <ArrowUpRight
              aria-hidden
              className="mt-1 size-5 text-slate/50 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
