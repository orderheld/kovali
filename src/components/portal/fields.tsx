"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldShell, useFormState } from "@/components/admin/form";
import { cn } from "@/lib/utils";

/**
 * Fields of the candidate portal that the shared form kit does not have. They read their
 * error from the surrounding ActionForm by name, like the shared fields.
 */

export const controlClass =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none disabled:bg-mist disabled:text-slate aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

export function useFieldError(name: string): string | undefined {
  const { state } = useFormState();
  return state.status === "error" ? state.errors?.[name] : undefined;
}

function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

/** Password input with a button to show what was typed (helps on phones). */
export function PasswordField({
  name,
  label,
  hint,
  autoComplete,
  required = true,
  className,
}: {
  name: string;
  label: string;
  hint?: React.ReactNode;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  className?: string;
}) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(controlClass, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
}

/** A checkbox whose label is longer text (consent, privacy notice). Required by the server. */
export function ConsentCheckbox({ name, children, className }: { name: string; children: React.ReactNode; className?: string }) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-4 py-3 text-[0.9375rem] leading-relaxed text-ink transition-colors",
          error ? "border-red-600" : "border-line hover:border-slate/40",
        )}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 size-5 shrink-0 rounded border-line accent-blue"
        />
        <span>{children}</span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
