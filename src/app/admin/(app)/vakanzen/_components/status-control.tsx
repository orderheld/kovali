"use client";

import { useId, useLayoutEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

/**
 * A status select with its own save button. Saving is an explicit step (no change-on-select),
 * so keyboard users can move through the options without triggering a change each time.
 * The button only appears once another value is chosen.
 */
export function StatusControl({
  label,
  options,
  value,
  action,
  hideLabel = true,
  size = "sm",
  className,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  action: (value: string) => Promise<ActionState>;
  hideLabel?: boolean;
  /** "md" matches the page header buttons. */
  size?: "sm" | "md";
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  // Next.js keeps visited pages mounted but hidden: an unsaved choice must not come back.
  useLayoutEffect(
    () => () => {
      setDraft(null);
      setMessage(null);
    },
    [],
  );
  const selected = draft ?? value;
  const dirty = draft !== null && draft !== value;

  return (
    <form
      className={cn("flex flex-wrap items-center gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!dirty) return;
        start(async () => {
          const result = await action(selected);
          setMessage(result);
          // After an error the select shows the saved status again, next to the reason.
          setDraft(null);
        });
      }}
    >
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-ink"}>
        {label}
      </label>
      <select
        id={id}
        value={selected}
        disabled={pending}
        onChange={(e) => {
          setDraft(e.target.value);
          setMessage(null);
        }}
        className={cn(
          "rounded-md border border-line bg-white pr-8 pl-2.5 text-ink hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none disabled:opacity-60",
          size === "md" ? "h-10 text-sm" : "h-8 text-[0.8125rem]",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {dirty ? (
        <button type="submit" disabled={pending} className={buttonClass("primary", size)}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Speichern
        </button>
      ) : null}
      {message && message.status === "error" && message.message ? (
        <span role="alert" className="basis-full text-[0.8125rem] text-red-700">
          {message.message}
        </span>
      ) : message && message.status === "success" && message.message ? (
        <span role="status" className="text-[0.8125rem] text-emerald-700">
          {message.message}
        </span>
      ) : null}
    </form>
  );
}
