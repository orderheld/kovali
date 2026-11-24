import Link from "next/link";

export interface Crumb {
  name: string;
  path: string;
}

/** Path navigation in Geist Mono, separated by slashes. Light or dark through `.on-dark`. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Pfadnavigation" className="font-mono text-[0.8125rem] text-slate in-[.on-dark]:text-white/60">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex min-w-0 items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-ink in-[.on-dark]:text-white">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} className="transition-colors hover:text-blue in-[.on-dark]:hover:text-electric">
                    {item.name}
                  </Link>
                  <span aria-hidden className="text-slate/60 in-[.on-dark]:text-white/30">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
