import { Search } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";

/** GET search form for list pages; keeps other filters as hidden fields. */
export function SearchBox({
  action,
  defaultValue,
  placeholder = "Suchen",
  hidden = {},
  children,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  hidden?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} role="search" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="relative min-w-56 flex-1 sm:max-w-sm">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-md border border-line bg-white pr-3 pl-9 text-sm text-ink placeholder:text-slate/60 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
        />
      </div>
      {children}
      <button type="submit" className={buttonClass("secondary", "sm", "h-9")}>
        Suchen
      </button>
    </form>
  );
}
