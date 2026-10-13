import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { Tone } from "@/lib/admin/options";
import { cn } from "@/lib/utils";

/**
 * Building blocks of the admin area and the candidate portal. Server-compatible (no hooks);
 * interactive controls live in form.tsx.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:pointer-events-none disabled:opacity-55";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white shadow-sm hover:bg-blue-700",
  secondary: "border border-line bg-white text-ink shadow-[0_1px_0_rgb(11_23_51/0.04)] hover:border-slate/40 hover:bg-mist",
  ghost: "text-slate hover:bg-mist hover:text-ink",
  danger: "border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50",
};
const buttonSizes: Record<ButtonSize, string> = { md: "h-10 px-4 text-sm", sm: "h-8 px-3 text-[0.8125rem]" };

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  className,
  prefetch,
  download,
  target,
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  className?: string;
  prefetch?: boolean;
  download?: boolean;
  target?: string;
}) {
  const cls = buttonClass(variant, size, className);
  const content = (
    <>
      {Icon ? <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2} /> : null}
      {children}
    </>
  );
  // File downloads and API routes are plain links, not client-side navigations.
  if (download || href.includes("/api/") || target) {
    return (
      <a href={href} className={cls} download={download || undefined} target={target} rel={target ? "noopener" : undefined}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} prefetch={prefetch}>
      {content}
    </Link>
  );
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate/10 text-slate ring-slate/15",
  blue: "bg-blue/10 text-blue-700 ring-blue/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cn("rounded-lg border border-line bg-white shadow-[0_1px_2px_rgb(11_23_51/0.04)]", className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {crumbs?.length ? (
        <nav aria-label="Brotkrumen" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-[0.8125rem] text-slate">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3.5 text-slate/60" /> : null}
                {c.href ? (
                  <Link href={c.href} className="hover:text-blue hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-[0.9375rem] text-slate">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-mist text-blue">
          <Icon aria-hidden className="size-5" />
        </span>
      ) : null}
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 max-w-md text-sm text-slate">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-slate">{label}</span>
        {Icon ? <Icon aria-hidden className={cn("size-4", tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-blue")} /> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate">{hint}</div> : null}
    </>
  );
  const cls = "block rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)]";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-blue/40")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Label/value pairs, e.g. on detail pages. */
export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: React.ReactNode; wide?: boolean }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 1 ? "grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {items.map((item, i) => (
        <div key={i} className={item.wide ? "sm:col-span-full" : undefined}>
          <dt className="text-[0.8125rem] text-slate">{item.label}</dt>
          <dd className="mt-0.5 text-[0.9375rem] break-words text-ink">{item.value ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({
  tone = "blue",
  title,
  children,
  icon: Icon,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const cls: Record<Tone, string> = {
    neutral: "border-line bg-mist text-ink",
    blue: "border-blue/20 bg-blue/[0.05] text-ink",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-900",
    violet: "border-violet-200 bg-violet-50 text-violet-950",
  };
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", cls[tone], className)} role={tone === "red" ? "alert" : undefined}>
      {Icon ? <Icon aria-hidden className="mt-0.5 size-4 shrink-0" /> : null}
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Scrollable table wrapper with consistent cell styles. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-mist/70 px-4 py-2.5 text-[0.75rem] font-semibold tracking-wide whitespace-nowrap text-slate uppercase",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-top", align === "right" && "text-right tabular-nums", className)}>{children}</td>;
}

/** Link-based tabs; the active tab is decided by the page. */
export function Tabs({ items }: { items: { label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <nav aria-label="Bereiche" className="mb-6 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {items.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                t.active ? "border-blue text-blue" : "border-transparent text-slate hover:border-line hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", t.active ? "bg-blue/10" : "bg-mist")}>{t.count}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Seiten" className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-slate">
      <span>
        Seite {page} von {pageCount}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <LinkButton href={hrefFor(page - 1)} size="sm">
            Zurück
          </LinkButton>
        ) : null}
        {page < pageCount ? (
          <LinkButton href={hrefFor(page + 1)} size="sm">
            Weiter
          </LinkButton>
        ) : null}
      </span>
    </nav>
  );
}

/** Small grey caption text, e.g. display numbers next to names. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs text-slate", className)}>{children}</span>;
}

export function TagList({ items, max, tone = "neutral" }: { items: string[]; max?: number; tone?: Tone }) {
  if (!items.length) return <span className="text-slate">–</span>;
  const shown = max ? items.slice(0, max) : items;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <Badge key={t} tone={tone}>
          {t}
        </Badge>
      ))}
      {max && items.length > max ? <Badge>+{items.length - max}</Badge> : null}
    </span>
  );
}

/** Skeleton shown while a page streams in. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Wird geladen …</span>
      <div className="h-4 w-40 rounded bg-line/70" />
      <div className="mt-3 h-7 w-72 rounded bg-line/80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-lg bg-line/50" />
        <div className="h-24 rounded-lg bg-line/50" />
        <div className="h-24 rounded-lg bg-line/50" />
      </div>
      <div className="mt-6 h-64 rounded-lg bg-line/40" />
    </div>
  );
}
