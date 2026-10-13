import { cn } from "@/lib/utils";

/** Form controls shared by the contact form and the profile form. */

export const inputClass =
  "block w-full rounded-md border border-line bg-white px-3.5 py-3 text-base text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/60 hover:border-slate/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

export interface ControlProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  required?: boolean;
}

export function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.9375rem] font-medium text-ink">
        {label}
        {required ? <span aria-hidden className="text-blue"> *</span> : null}
        {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
      </label>
      {children({ id, required, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  options,
  placeholder = "Bitte wählen",
  ...props
}: ControlProps & {
  name: string;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        {...props}
        defaultValue={props.defaultValue ?? ""}
        className={cn(inputClass, "appearance-none pr-10")}
      >
        <option value="" disabled={props.required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Invisible for people, bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="website">Website (bitte leer lassen)</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
