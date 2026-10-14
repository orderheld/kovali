import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Form controls of the contact form. */

export const inputClass =
  "block w-full rounded-lg border border-field bg-white px-3.5 py-3 text-base text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-hint hover:border-slate focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

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

/** Invisible for people, bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="website">Website (bitte leer lassen)</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

/** A numbered section of a form, so longer forms read as a few short steps. */
export function FormStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="mb-6 flex items-center gap-3 text-lg font-semibold tracking-[-0.015em] text-ink">
        <span
          aria-hidden
          className="flex h-7 shrink-0 items-center justify-center rounded-md bg-night px-2 font-mono text-xs font-medium tabular-nums text-electric"
        >
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

interface ChoiceProps {
  /** Field name; also the id the error summary links to. */
  name: string;
  legend: string;
  options: readonly ChoiceOption[];
  defaultValue?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
}

function ChoiceGroup({
  name,
  legend,
  required,
  optional,
  hint,
  error,
  children,
}: Omit<ChoiceProps, "options" | "defaultValue"> & { children: React.ReactNode }) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset
      id={name}
      tabIndex={-1}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      className="scroll-mt-28 focus:outline-none"
    >
      <legend className="mb-3 text-[0.9375rem] font-medium text-ink">
        {legend}
        {required ? <span aria-hidden className="text-blue"> *</span> : null}
        {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
      </legend>
      {children}
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
    </fieldset>
  );
}

/** Single choice as cards with a short explanation each. Native radios, so it works without JavaScript. */
export function ChoiceTiles({ options, defaultValue, ...group }: ChoiceProps) {
  return (
    <ChoiceGroup {...group}>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border bg-white p-4 transition-colors hover:border-slate",
              "has-checked:border-blue has-checked:bg-blue/[0.04] has-checked:shadow-[inset_0_0_0_1px_var(--color-blue)]",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue",
              group.error ? "border-red-600/60" : "border-field",
            )}
          >
            <input
              type="radio"
              name={group.name}
              value={o.value}
              required={group.required}
              defaultChecked={defaultValue === o.value}
              className="mt-0.5 size-4 shrink-0 accent-blue focus:outline-none"
            />
            <span>
              <span className="block font-medium leading-snug text-ink">{o.label}</span>
              {o.description ? <span className="mt-1 block text-sm leading-snug text-slate">{o.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </ChoiceGroup>
  );
}

/**
 * Pill label around a visually hidden radio or checkbox. In forced-colors mode (Windows high
 * contrast) the blue fill is replaced, so a checked chip takes the system Highlight colours.
 */
const chipClass = cn(
  "cursor-pointer rounded-[1.25rem] border bg-white px-4 py-2 text-left text-[0.9375rem] text-ink transition-colors hover:border-slate",
  "has-checked:border-blue has-checked:bg-blue has-checked:text-white",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue",
  "forced-colors:has-checked:forced-color-adjust-none forced-colors:has-checked:border-[color:Highlight] forced-colors:has-checked:bg-[color:Highlight] forced-colors:has-checked:text-[color:HighlightText]",
);

/** Single choice as compact pills, for short option lists. */
export function ChoiceChips({ options, defaultValue, ...group }: ChoiceProps) {
  return (
    <ChoiceGroup {...group}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              chipClass,
              group.error ? "border-red-600/60" : "border-field",
            )}
          >
            <input
              type="radio"
              name={group.name}
              value={o.value}
              required={group.required}
              defaultChecked={defaultValue === o.value}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </ChoiceGroup>
  );
}

/** Multiple choice as compact pills. Native checkboxes: each checked one is sent under the same name. */
export function MultiChoiceChips({
  options,
  defaultValues = [],
  ...group
}: Omit<ChoiceProps, "defaultValue"> & { defaultValues?: readonly string[] }) {
  return (
    <ChoiceGroup {...group}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              chipClass,
              group.error ? "border-red-600/60" : "border-field",
            )}
          >
            <input
              type="checkbox"
              name={group.name}
              value={o.value}
              defaultChecked={defaultValues.includes(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </ChoiceGroup>
  );
}

/** Shown above a form whose submissions are only checked, not sent (dry run, previews). */
export function TestModeNotice() {
  return (
    <p className="rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <strong className="font-semibold">Testmodus:</strong> Dieses Formular prüft Ihre Eingaben, versendet aber nichts.
    </p>
  );
}

/** Lists every invalid field with a link to it. Receives focus after a failed submit. */
export function ErrorSummary({
  ref,
  errors,
}: {
  ref: React.Ref<HTMLDivElement>;
  /** [field id, field label, message] */
  errors: [string, string, string][];
}) {
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-red-600/30 bg-red-50 p-5 text-red-900 focus:outline-none">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle aria-hidden className="size-5" />
        Bitte prüfen Sie {errors.length === 1 ? "eine Angabe" : `${errors.length} Angaben`}.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-7 text-sm">
        {errors.map(([id, label, message]) => (
          <li key={id}>
            <a href={`#${id}`} className="underline underline-offset-2">
              {label}
            </a>
            : {message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Delivery or spam-check error, with the e-mail address as a way out. */
export function SubmitError({
  ref,
  message,
  reference,
  fallbackEmail,
}: {
  ref: React.Ref<HTMLDivElement>;
  message: string;
  reference?: string;
  fallbackEmail: string;
}) {
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-red-600/30 bg-red-50 p-5 text-red-900 focus:outline-none">
      <p className="flex items-start gap-2 font-semibold">
        <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
        {message}
      </p>
      {reference ? <p className="mt-2 pl-7 text-sm tabular-nums">Referenz: {reference}</p> : null}
      <p className="mt-2 pl-7 text-sm">
        E-Mail:{" "}
        <a href={`mailto:${fallbackEmail}`} className="underline underline-offset-2">
          {fallbackEmail}
        </a>
      </p>
    </div>
  );
}

export function SuccessPanel({
  headingRef,
  title,
  text,
  reference,
}: {
  headingRef: React.Ref<HTMLHeadingElement>;
  title: string;
  text: string;
  reference: string;
}) {
  return (
    <div role="status" className="rounded-xl border border-cloud-line bg-cloud p-8 md:p-10">
      <CheckCircle2 aria-hidden className="size-9 text-blue" strokeWidth={1.75} />
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-semibold tracking-[-0.02em] focus:outline-none">
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-slate">{text}</p>
      <p className="mt-6 text-sm tabular-nums text-ink">
        Referenz: <span className="font-mono font-semibold">{reference}</span>
      </p>
      <p className="mt-8">
        <Link href="/" className="font-medium text-blue hover:underline">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}

/** Consent checkbox with the privacy policy link. */
export function Consent({ text, defaultChecked, error }: { text: string; defaultChecked: boolean; error?: string }) {
  return (
    <div>
      <div className="flex gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "consent-error" : undefined}
          className="mt-1 size-5 shrink-0 rounded border-field accent-blue"
        />
        <label htmlFor="consent" className="leading-relaxed text-ink">
          Ich habe die{" "}
          <Link href="/datenschutz" className="text-blue underline underline-offset-[3px]">
            Datenschutzerklärung
          </Link>{" "}
          gelesen und bin einverstanden, {text}
          <span aria-hidden className="text-blue"> *</span>
        </label>
      </div>
      {error ? (
        <p id="consent-error" className="mt-2 pl-8 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitRow({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <>
      <div className="flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue px-7 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(11_23_51/0.2),0_8px_20px_-10px_rgb(20_91_206/0.7)] transition-colors hover:bg-blue-700 disabled:opacity-70"
        >
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {pending ? pendingLabel : label}
        </button>
        <p className="text-sm text-slate">Die Übermittlung ist verschlüsselt. Es werden keine Cookies gesetzt.</p>
      </div>
      <p aria-live="polite" className="sr-only">
        {pending ? pendingLabel : ""}
      </p>
    </>
  );
}
