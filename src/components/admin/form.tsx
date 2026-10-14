"use client";

import { createContext, startTransition, use, useActionState, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui";

/**
 * Forms of the admin area and the candidate portal. ActionForm wires a Server Action through
 * useActionState; fields read their error from context by name. Submitting does not reset the
 * form, so entries stay when the server reports a validation error.
 */

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormContext = createContext<{ state: ActionState; pending: boolean }>({ state: { status: "idle" }, pending: false });

export function useFormState() {
  return use(FormContext);
}

/** Calls `onReset` when the surrounding form is reset (form.reset(), e.g. after saving). */
function useFormReset(ref: React.RefObject<HTMLElement | null>, onReset: () => void) {
  const callback = useRef(onReset);
  useEffect(() => {
    callback.current = onReset;
  });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const handler = () => callback.current();
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, [ref]);
}

function useFieldError(name: string): string | undefined {
  const { state } = useFormState();
  return state.status === "error" ? state.errors?.[name] : undefined;
}

type ActionFormProps = {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  secondary?: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hideSubmit?: boolean;
  submitVariant?: "primary" | "secondary" | "danger";
  id?: string;
};

/**
 * Next.js keeps recently visited pages mounted but hidden (React Activity). A form that was
 * left must not come back with old entries or an old message, so it starts fresh each time
 * its page is shown again.
 */
export function ActionForm(props: ActionFormProps) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return <ActionFormInner key={generation} {...props} />;
}

function ActionFormInner({
  action,
  children,
  submitLabel = "Speichern",
  pendingLabel = "Wird gespeichert …",
  secondary,
  className,
  resetOnSuccess = false,
  hideSubmit = false,
  submitVariant = "primary",
  id,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      summaryRef.current?.focus();
    } else if (state.status === "success" && resetOnSuccess) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  return (
    <FormContext value={{ state, pending }}>
      <form
        id={id}
        ref={formRef}
        noValidate
        className={cn("space-y-6", className)}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {state.status === "error" && state.message ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 focus:outline-none"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{state.message}</p>
              {state.errors && Object.keys(state.errors).length > 1 ? (
                <ul className="mt-1 list-disc pl-4">
                  {Object.entries(state.errors).map(([field, msg]) => (
                    <li key={field}>{msg}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
        {children}
        {state.status === "success" && state.message ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 aria-hidden className="size-4" />
            {state.message}
          </p>
        ) : null}
        {hideSubmit ? null : (
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <button type="submit" disabled={pending} className={buttonClass(submitVariant)}>
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {pending ? pendingLabel : submitLabel}
            </button>
            {secondary}
          </div>
        )}
      </form>
    </FormContext>
  );
}

/** Submit button for forms that place it themselves (hideSubmit). */
export function SubmitButton({ children, variant = "primary", size = "md", className }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; size?: "md" | "sm"; className?: string }) {
  const { pending } = useFormState();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)}>
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none disabled:bg-mist disabled:text-slate aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required ? <span aria-hidden className="text-blue"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

interface BaseFieldProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TextField({
  name,
  label,
  required,
  hint,
  className,
  disabled,
  defaultValue,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  min,
  max,
  step,
  suffix,
}: BaseFieldProps & {
  defaultValue?: string | number | null;
  type?: "text" | "email" | "tel" | "url" | "date" | "number" | "password" | "month" | "search";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "decimal" | "numeric" | "email" | "tel" | "url";
  min?: string | number;
  max?: string | number;
  step?: string | number;
  suffix?: string;
}) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  const input = (
    <input
      id={id}
      name={name}
      type={type}
      defaultValue={defaultValue ?? ""}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cn(control, suffix && "pr-14")}
    />
  );
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      {suffix ? (
        <div className="relative">
          {input}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate">{suffix}</span>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  required,
  hint,
  className,
  disabled,
  defaultValue,
  rows = 4,
  placeholder,
  maxLength,
}: BaseFieldProps & { defaultValue?: string | null; rows?: number; placeholder?: string; maxLength?: number }) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "leading-relaxed")}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  required,
  hint,
  className,
  disabled,
  defaultValue,
  options,
  emptyLabel,
}: BaseFieldProps & {
  defaultValue?: string | number | null;
  options: readonly { value: string | number; label: string }[];
  /** Adds an empty first option with this label. */
  emptyLabel?: string;
}) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue === null || defaultValue === undefined ? "" : String(defaultValue)}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "pr-8")}
      >
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  className,
  disabled,
  defaultChecked,
}: Omit<BaseFieldProps, "required"> & { defaultChecked?: boolean }) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className="mt-0.5 size-4 shrink-0 rounded border-line accent-blue"
        />
        <span>
          <span className="font-medium">{label}</span>
          {hint ? (
            <span id={`${id}-hint`} className="mt-0.5 block text-[0.8125rem] text-slate">
              {hint}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Several values from a fixed list as toggle chips; submitted as a JSON array. */
export function MultiChoiceField({
  name,
  label,
  hint,
  className,
  options,
  defaultValue = [],
}: Omit<BaseFieldProps, "required" | "disabled"> & {
  options: readonly { value: string; label: string }[];
  defaultValue?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const error = useFieldError(name);
  const id = `${useId()}-${name}`;
  const ref = useRef<HTMLFieldSetElement>(null);
  useFormReset(ref, () => setSelected(defaultValue));
  return (
    <fieldset ref={ref} className={className} aria-describedby={describedBy(id, hint, error)}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected((s) => (on ? s.filter((v) => v !== o.value) : [...s, o.value]))}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.8125rem] transition-colors",
                on ? "border-blue bg-blue text-white" : "border-line bg-white text-ink hover:border-slate/40",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Free-form tags with suggestions; Enter or comma adds a tag. Submitted as a JSON array. */
export function TagInputField({
  name,
  label,
  hint,
  className,
  defaultValue = [],
  suggestions = [],
  placeholder = "Eingeben und Enter drücken",
}: Omit<BaseFieldProps, "required" | "disabled"> & {
  defaultValue?: string[];
  suggestions?: readonly string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const error = useFieldError(name);
  const id = `${useId()}-${name}`;
  const listId = `${id}-list`;
  const ref = useRef<HTMLInputElement>(null);
  useFormReset(ref, () => {
    setTags(defaultValue);
    setDraft("");
  });

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setTags((current) => {
      const next = [...current];
      for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
      return next;
    });
    setDraft("");
  };

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input ref={ref} type="hidden" name={name} value={JSON.stringify(tags)} />
      <div
        className={cn(
          control,
          "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20",
          error && "border-red-600",
        )}
      >
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-mist py-0.5 pr-1 pl-2 text-[0.8125rem] text-ink ring-1 ring-line">
            {t}
            <button
              type="button"
              onClick={() => setTags((c) => c.filter((x) => x !== t))}
              className="rounded p-0.5 text-slate hover:bg-white hover:text-red-700"
              aria-label={`${t} entfernen`}
            >
              <X aria-hidden className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          list={suggestions.length ? listId : undefined}
          value={draft}
          placeholder={tags.length ? "" : placeholder}
          aria-describedby={describedBy(id, hint, error)}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && draft === "" && tags.length) {
              setTags((c) => c.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1 text-[0.9375rem] outline-none focus:ring-0"
        />
      </div>
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </FieldShell>
  );
}

/** File input with a drop zone. */
export function FileField({
  name,
  label,
  hint,
  className,
  accept,
  required,
}: BaseFieldProps & { accept?: string }) {
  const id = `${useId()}-${name}`;
  const error = useFieldError(name);
  const [fileName, setFileName] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLLabelElement>(null);
  useFormReset(ref, () => setFileName(null));
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <label
        ref={ref}
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const input = document.getElementById(id) as HTMLInputElement | null;
          if (input && e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files;
            setFileName(e.dataTransfer.files[0]?.name ?? null);
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 text-sm transition-colors",
          over ? "border-blue bg-blue/[0.04]" : "border-line bg-mist/50 hover:border-slate/40",
          error && "border-red-600",
        )}
      >
        <Upload aria-hidden className="size-5 shrink-0 text-blue" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{fileName ?? "Datei wählen oder hierher ziehen"}</span>
        </span>
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
    </FieldShell>
  );
}

/** Groups fields under a heading inside a form. */
export function FormSection({
  title,
  description,
  children,
  columns = 2,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset className="rounded-lg border border-line bg-white p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4">
        <h2 className="text-[0.9375rem] font-semibold text-ink" aria-hidden>
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-slate">{description}</p> : null}
      </div>
      <div className={cn("grid gap-4", columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "")}>{children}</div>
    </fieldset>
  );
}

/**
 * A button that runs a Server Action without a form, optionally after a confirmation.
 * Shows the action's error or success message next to it.
 */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  size = "sm",
  className,
  icon,
}: {
  action: () => Promise<ActionState | void>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  className?: string;
  icon?: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionState | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={buttonClass(variant, size, className)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const result = await action();
            setMessage(result ?? null);
          });
        }}
      >
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : icon}
        {children}
      </button>
      {message && message.status !== "idle" && message.message ? (
        <span role="status" className={cn("text-[0.8125rem]", message.status === "error" ? "text-red-700" : "text-emerald-700")}>
          {message.message}
        </span>
      ) : null}
    </span>
  );
}
