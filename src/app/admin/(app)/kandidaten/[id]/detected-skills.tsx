"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

/**
 * Keywords found in the CV that are not yet part of the profile. All are pre-selected; Ferhat
 * deselects what does not fit and adopts the rest with one click.
 */
export function DetectedSkills({ skills, adopt }: { skills: string[]; adopt: (skills: string[]) => Promise<ActionState> }) {
  const [selected, setSelected] = useState<string[]>(skills);
  const [message, setMessage] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();

  // Fresh state when the page is shown again (Next.js keeps visited pages mounted but hidden).
  useLayoutEffect(
    () => () => {
      setSelected(skills);
      setMessage(null);
    },
    [skills],
  );

  const toggle = (s: string) => setSelected((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  const run = (list: string[]) =>
    start(async () => {
      setMessage(await adopt(list));
    });

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2" aria-label="Erkannte Stichworte">
        {skills.map((s) => {
          const on = selected.includes(s);
          return (
            <li key={s}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.8125rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
                  on ? "border-blue bg-blue/10 text-blue-700" : "border-line bg-white text-slate hover:border-slate/40",
                )}
              >
                {on ? <Check aria-hidden className="size-3.5" /> : null}
                {s}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !selected.length} onClick={() => run(selected)} className={buttonClass("primary", "sm")}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Ins Profil übernehmen ({selected.length})
        </button>
        {selected.length < skills.length ? (
          <button type="button" onClick={() => setSelected(skills)} className={buttonClass("ghost", "sm")}>
            Alle auswählen
          </button>
        ) : (
          <button type="button" onClick={() => setSelected([])} className={buttonClass("ghost", "sm")}>
            Keine auswählen
          </button>
        )}
        {message && message.status !== "idle" && message.message ? (
          <span role="status" className={cn("text-[0.8125rem]", message.status === "error" ? "text-red-700" : "text-emerald-700")}>
            {message.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
