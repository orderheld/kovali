import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page title of the candidate portal, with an optional back link above it. */
export function PortalHeading({
  title,
  description,
  back,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {back ? (
        <div className="mb-3">
          <Link href={back.href} className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 py-1 text-sm font-medium text-slate hover:text-blue">
            <ArrowLeft aria-hidden className="size-4" />
            {back.label}
          </Link>
        </div>
      ) : null}
      {/* .eyebrow is inline-flex; the wrapper keeps it on its own line. */}
      {eyebrow ? (
        <div className="mb-2">
          <p className="eyebrow">{eyebrow}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-slate">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Label/value rows that stack on phones. */
export function Facts({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.8125rem] text-slate">{item.label}</dt>
          <dd className="mt-0.5 text-[0.9375rem] break-words text-ink">{item.value || "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips({ items, tone = "neutral" }: { items: readonly string[]; tone?: "neutral" | "blue" }) {
  if (!items.length) return <span className="text-slate">–</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[0.8125rem] ring-1 ring-inset",
            tone === "blue" ? "bg-blue/[0.07] text-blue-700 ring-blue/20" : "bg-mist text-ink ring-line",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
