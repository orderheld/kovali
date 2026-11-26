import Image from "next/image";
import { methods, toolGroups, toolLogos, toolsNotice, type ToolGroup } from "@/content/tools";
import { cn } from "@/lib/utils";

/**
 * The tools we work in, as canvas cards per task. A tool shows its official logo where the
 * owner allows it (unmodified, full colour on white) and its name in text everywhere else.
 * The trademark notice always sits below the grid.
 */
export function ToolsGrid({
  groups = toolGroups,
  showMethods = true,
  tone = "canvas",
  className,
}: {
  groups?: ToolGroup[];
  showMethods?: boolean;
  /** Card colour: canvas on white sections, white on canvas sections. */
  tone?: "canvas" | "white";
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={cn("grid gap-4", groups.length > 1 && "md:grid-cols-2")}>
        {groups.map((group) => (
          <section
            key={group.title}
            aria-label={group.title}
            className={cn("rounded-3xl p-7 sm:p-8", tone === "canvas" ? "bg-canvas" : "bg-white")}
          >
            <h3 className="text-[0.9375rem] font-semibold text-graphite">{group.title}</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {group.tools.map((tool) => {
                const logo = tool.logo ? toolLogos[tool.logo] : undefined;
                return (
                  <li
                    key={tool.name}
                    className={cn(
                      "flex min-h-[5.5rem] flex-col justify-center rounded-2xl px-5 py-4",
                      tone === "canvas" ? "bg-white" : "bg-canvas",
                    )}
                  >
                    {logo ? (
                      // Official artwork, unmodified, at a fixed height of 24 px; the alt text is the product name.
                      <Image
                        src={logo.src}
                        alt={tool.name}
                        width={logo.width}
                        height={logo.height}
                        unoptimized
                        className="h-6 w-auto self-start"
                      />
                    ) : (
                      <p className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em] text-graphite">{tool.name}</p>
                    )}
                    <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">
                      {tool.vendor ? `${tool.vendor} · ` : null}
                      {tool.use}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {showMethods ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <p className="text-[0.9375rem] font-semibold text-graphite">Methoden</p>
          <ul className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <li key={m} className="rounded-full border border-hairline px-3.5 py-1 text-[0.875rem] text-graphite">
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-8 max-w-3xl text-[0.8125rem] text-muted">{toolsNotice}</p>
    </div>
  );
}
