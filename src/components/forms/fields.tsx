import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Form controls of the contact form (design v3): white fields with rounded-xl corners on the
 * white or canvas form card, a 1 px border in the field colour (3.70:1 on white, 3.4:1 on canvas,
 * WCAG 1.4.11), a 2 px blue focus ring (border plus ring) and error texts in the fail colour.
 */

const controlBase =
  "block w-full rounded-xl border border-field bg-white px-4 text-base text-graphite transition-colors placeholder:text-hint hover:border-muted focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue aria-[invalid=true]:border-fail aria-[invalid=true]:focus:border-fail aria-[invalid=true]:focus:ring-fail";

/** Single-line inputs. */
export const inputClass = cn(controlBase, "h-12 py-0");

/** Multi-line inputs: the height comes from `rows`, the visitor can make them taller. */
export const textareaClass = cn(controlBase, "resize-y py-3 leading-relaxed");

const labelClass = "mb-2 block text-sm font-medium text-graphite";

/** " *" for required fields, " (optional)" for optional ones. */
function LabelSuffix({ required, optional }: { required?: boolean; optional?: boolean }) {
  return (
    <>
      {required ? <span aria-hidden className="text-blue"> *</span> : null}
      {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
    </>
  );
}

/** Hint and error below a control; the ids are referenced by aria-describedby. */
function HelpTexts({ hintId, hint, errorId, error }: { hintId?: string; hint?: string; errorId?: string; error?: string }) {
  return (
    <>
      {hint ? (
        <p id={hintId} className="mt-2 text-sm leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-fail">
          {error}
        </p>
      ) : null}
    </>
  );
}

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
      <label htmlFor={id} className={labelClass}>
        {label}
        <LabelSuffix required={required} optional={optional} />
      </label>
      {children({ id, required, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      <HelpTexts hintId={hintId} hint={hint} errorId={errorId} error={error} />
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

/** A numbered section of a form, so longer forms read as a few short steps. Separated by a hairline. */
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
    <div className="border-t border-hairline pt-10">
      <fieldset className="space-y-7">
        <legend className="mb-8">
          <span aria-hidden className="kicker block">
            Schritt {String(number).padStart(2, "0")}
          </span>
          <span className="mt-3 block text-h3 font-medium text-graphite">{title}</span>
        </legend>
        {children}
      </fieldset>
    </div>
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
      className="scroll-mt-4 focus:outline-none"
    >
      <legend className="mb-3 text-sm font-medium text-graphite">
        {legend}
        <LabelSuffix required={required} optional={optional} />
      </legend>
      {children}
      <HelpTexts hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </fieldset>
  );
}

/** Night focus ring of a label around a visually hidden or native radio/checkbox, as on the text fields. */
const focusWithin = "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue";

/** Single choice as bordered tiles with a short explanation each. Native radios, so it works without JavaScript. */
export function ChoiceTiles({ options, defaultValue, ...group }: ChoiceProps) {
  return (
    <ChoiceGroup {...group}>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors hover:border-muted",
              "has-checked:border-blue has-checked:shadow-[inset_0_0_0_1px_var(--color-blue)]",
              focusWithin,
              group.error ? "border-fail" : "border-field",
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
              <span className="block font-medium leading-snug text-graphite">{o.label}</span>
              {o.description ? <span className="mt-1 block text-sm leading-snug text-muted">{o.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </ChoiceGroup>
  );
}

/**
 * Pill-shaped option label around a visually hidden radio or checkbox; blue when checked. In
 * forced-colors mode (Windows high contrast) the fill is replaced, so a checked option takes
 * the system Highlight colours.
 */
const chipClass = cn(
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border bg-white px-5 py-2 text-left text-[0.9375rem] leading-snug text-graphite transition-colors hover:border-muted",
  "has-checked:border-blue has-checked:bg-blue has-checked:text-white",
  focusWithin,
  "forced-colors:has-checked:forced-color-adjust-none forced-colors:has-checked:border-[color:Highlight] forced-colors:has-checked:bg-[color:Highlight] forced-colors:has-checked:text-[color:HighlightText]",
);

/** Single choice as compact options in a row, for short option lists. */
export function ChoiceChips({ options, defaultValue, ...group }: ChoiceProps) {
  return (
    <ChoiceGroup {...group}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cn(chipClass, group.error ? "border-fail" : "border-field")}>
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

/** Multiple choice as compact options. Native checkboxes: each checked one is sent under the same name. */
export function MultiChoiceChips({
  options,
  defaultValues = [],
  ...group
}: Omit<ChoiceProps, "defaultValue"> & { defaultValues?: readonly string[] }) {
  return (
    <ChoiceGroup {...group}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cn(chipClass, group.error ? "border-fail" : "border-field")}>
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
    <p className="rounded-xl border border-open/30 bg-open-bg px-4 py-3 text-sm text-graphite">
      <strong className="font-semibold">Testmodus:</strong> Dieses Formular prüft Ihre Eingaben, versendet aber nichts.
    </p>
  );
}

const alertClass = "rounded-xl border border-fail/40 bg-fail-bg p-5 text-graphite focus:outline-none";

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
    <div ref={ref} tabIndex={-1} role="alert" className={alertClass}>
      <p className="flex items-center gap-2 font-semibold text-fail">
        <AlertCircle aria-hidden strokeWidth={1.75} className="size-5" />
        Bitte prüfen Sie {errors.length === 1 ? "eine Angabe" : `${errors.length} Angaben`}.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-7 text-sm">
        {errors.map(([id, label, message]) => (
          <li key={id}>
            <a href={`#${id}`} className="font-medium underline underline-offset-2">
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
    <div ref={ref} tabIndex={-1} role="alert" className={alertClass}>
      <p className="flex items-start gap-2 font-semibold text-fail">
        <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" />
        {message}
      </p>
      {reference ? <p className="mt-2 pl-7 text-sm tabular-nums">Referenz: {reference}</p> : null}
      <p className="mt-2 pl-7 text-sm">
        E-Mail:{" "}
        <a href={`mailto:${fallbackEmail}`} className="font-medium underline underline-offset-2">
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
    <div role="status" className="rounded-2xl border border-hairline bg-white p-8 md:p-10">
      <CheckCircle2 aria-hidden className="size-10 text-blue" strokeWidth={1.25} />
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-h3 text-graphite focus:outline-none">
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-muted">{text}</p>
      <p className="mt-6 text-sm text-graphite">
        Referenz: <span className="font-semibold tabular-nums">{reference}</span>
      </p>
      <p className="mt-8">
        <Link href="/" className={buttonClasses({ variant: "outline" })}>
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
          className="mt-0.5 size-5 shrink-0 accent-blue"
        />
        <label htmlFor="consent" className="text-[0.9375rem] leading-relaxed text-graphite">
          Ich habe die{" "}
          <Link href="/datenschutz" className="text-blue underline decoration-blue/40 underline-offset-[3px] hover:decoration-blue">
            Datenschutzerklärung
          </Link>{" "}
          gelesen und bin einverstanden, {text}
          <span aria-hidden className="text-blue"> *</span>
        </label>
      </div>
      {error ? (
        <p id="consent-error" className="mt-2 pl-8 text-sm text-fail">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitRow({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <>
      <div className="flex flex-col gap-5 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={pending} className={buttonClasses({ className: "w-full sm:w-auto" })}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {pending ? pendingLabel : label}
        </button>
        <p className="text-sm text-muted">Die Übermittlung ist verschlüsselt. Es werden keine Cookies gesetzt.</p>
      </div>
      <p aria-live="polite" className="sr-only">
        {pending ? pendingLabel : ""}
      </p>
    </>
  );
}
