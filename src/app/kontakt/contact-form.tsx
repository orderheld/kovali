"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { requestTypes, serviceOptions, startOptions, workModes } from "@/lib/contact/options";
import { initialContactState, type ContactField, type ContactValues } from "@/lib/contact/state";
import { cn } from "@/lib/utils";
import { submitContact } from "./actions";

export interface ContactDefaults {
  requestType?: string;
  service?: string;
}

const FIELD_LABELS: Record<ContactField, string> = {
  name: "Name",
  company: "Unternehmen",
  email: "Geschäftliche E-Mail",
  phone: "Telefon",
  requestType: "Art der Anfrage",
  service: "Gewünschte Leistung",
  projectDescription: "Projektbeschreibung",
  start: "Gewünschter Start",
  workMode: "Arbeitsmodell",
  location: "Einsatzort",
  message: "Nachricht",
  consent: "Datenschutz",
};

const inputClass =
  "block w-full rounded-md border border-line bg-white px-3.5 py-3 text-base text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/60 hover:border-slate/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

export function ContactForm({ defaults = {}, fallbackEmail }: { defaults?: ContactDefaults; fallbackEmail: string }) {
  const [state, formAction, pending] = useActionState(submitContact, initialContactState);
  const startedRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.status === "invalid" || state.status === "error") summaryRef.current?.focus();
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-xl border border-line bg-mist p-8 md:p-10">
        <CheckCircle2 aria-hidden className="size-9 text-blue" strokeWidth={1.75} />
        <h2 ref={successRef} tabIndex={-1} className="mt-5 text-2xl font-semibold tracking-tight focus:outline-none">
          Vielen Dank für Ihre Anfrage
        </h2>
        <p className="mt-3 leading-relaxed text-slate">
          Ihre Nachricht ist angekommen. Sie erhalten eine persönliche Rückmeldung per E-Mail.
        </p>
        <p className="mt-6 font-mono text-sm text-ink">
          Referenz: <span className="font-semibold">{state.reference}</span>
        </p>
        <p className="mt-8">
          <Link href="/" className="font-medium text-blue hover:underline">
            Zur Startseite
          </Link>
        </p>
      </div>
    );
  }

  const values: ContactValues = state.status === "invalid" || state.status === "error" ? state.values : {};
  const errors = state.status === "invalid" ? state.errors : {};
  const errorEntries = Object.entries(errors) as [ContactField, string][];
  const v = (field: ContactField, fallback = "") => values[field] ?? fallback;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Dispatch manually so the browser keeps all entered values (no automatic form reset).
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-7" aria-describedby="form-hint">
      {state.status === "invalid" ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-600/30 bg-red-50 p-5 text-red-900 focus:outline-none"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle aria-hidden className="size-5" />
            Bitte prüfen Sie {errorEntries.length === 1 ? "eine Angabe" : `${errorEntries.length} Angaben`}.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-7 text-sm">
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`} className="underline underline-offset-2">
                  {FIELD_LABELS[field]}
                </a>
                : {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-600/30 bg-red-50 p-5 text-red-900 focus:outline-none"
        >
          <p className="flex items-start gap-2 font-semibold">
            <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
            {state.message}
          </p>
          {state.reference ? (
            <p className="mt-2 pl-7 font-mono text-sm">Referenz: {state.reference}</p>
          ) : null}
          <p className="mt-2 pl-7 text-sm">
            E-Mail:{" "}
            <a href={`mailto:${fallbackEmail}`} className="underline underline-offset-2">
              {fallbackEmail}
            </a>
          </p>
        </div>
      ) : null}

      <p id="form-hint" className="text-sm text-slate">
        Pflichtfelder sind mit <span aria-hidden className="text-blue">*</span>
        <span className="sr-only">Stern</span> markiert.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          {(p) => <input {...p} name="name" type="text" autoComplete="name" defaultValue={v("name")} className={inputClass} />}
        </Field>
        <Field id="company" label="Unternehmen" optional error={errors.company}>
          {(p) => (
            <input {...p} name="company" type="text" autoComplete="organization" defaultValue={v("company")} className={inputClass} />
          )}
        </Field>
        <Field id="email" label="Geschäftliche E-Mail" required error={errors.email}>
          {(p) => (
            <input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v("email")} className={inputClass} />
          )}
        </Field>
        <Field id="phone" label="Telefon" optional error={errors.phone}>
          {(p) => <input {...p} name="phone" type="tel" autoComplete="tel" defaultValue={v("phone")} className={inputClass} />}
        </Field>
        <Field id="requestType" label="Art der Anfrage" required error={errors.requestType}>
          {(p) => (
            <Select {...p} name="requestType" defaultValue={v("requestType", defaults.requestType)} options={requestTypes} />
          )}
        </Field>
        <Field id="service" label="Gewünschte Leistung" optional error={errors.service}>
          {(p) => (
            <Select {...p} name="service" defaultValue={v("service", defaults.service)} options={serviceOptions} placeholder="Keine Angabe" />
          )}
        </Field>
      </div>

      <Field
        id="projectDescription"
        label="Projektbeschreibung"
        required
        hint="Ausgangslage, Ziel, Umfang und gesuchte Rolle, soweit bekannt. Bei allgemeinen Anfragen genügen ein paar Sätze zu Ihrem Anliegen. Bitte keine vertraulichen Kundendaten."
        error={errors.projectDescription}
      >
        {(p) => (
          <textarea {...p} name="projectDescription" rows={6} defaultValue={v("projectDescription")} className={cn(inputClass, "resize-y")} />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field id="start" label="Gewünschter Start" optional error={errors.start}>
          {(p) => <Select {...p} name="start" defaultValue={v("start")} options={startOptions} placeholder="Keine Angabe" />}
        </Field>
        <Field id="workMode" label="Arbeitsmodell" optional error={errors.workMode}>
          {(p) => <Select {...p} name="workMode" defaultValue={v("workMode")} options={workModes} placeholder="Keine Angabe" />}
        </Field>
        <Field id="location" label="Einsatzort" optional error={errors.location}>
          {(p) => (
            <input {...p} name="location" type="text" placeholder="z. B. Bern" defaultValue={v("location")} className={inputClass} />
          )}
        </Field>
      </div>

      <Field id="message" label="Nachricht" optional hint="Weitere Fragen, Rahmenbedingungen oder Rückrufwunsch." error={errors.message}>
        {(p) => <textarea {...p} name="message" rows={4} defaultValue={v("message")} className={cn(inputClass, "resize-y")} />}
      </Field>

      {/* Honeypot: invisible for people, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website (bitte leer lassen)</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input ref={startedRef} type="hidden" name="startedAt" defaultValue="" />

      <div>
        <div className="flex gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            defaultChecked={v("consent") === "on"}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-1 size-5 shrink-0 rounded border-line accent-blue"
          />
          <label htmlFor="consent" className="leading-relaxed text-ink">
            Ich habe die{" "}
            <Link href="/datenschutz" className="text-blue underline underline-offset-[3px]">
              Datenschutzerklärung
            </Link>{" "}
            gelesen und bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage verwendet werden.
            <span aria-hidden className="text-blue"> *</span>
          </label>
        </div>
        {errors.consent ? (
          <p id="consent-error" className="mt-2 pl-8 text-sm text-red-700">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-blue px-7 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
        >
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {pending ? "Anfrage wird gesendet" : "Anfrage senden"}
        </button>
        <p className="text-sm text-slate">Die Übermittlung ist verschlüsselt. Es werden keine Cookies gesetzt.</p>
      </div>
      <p aria-live="polite" className="sr-only">
        {pending ? "Anfrage wird gesendet" : ""}
      </p>
    </form>
  );
}

interface ControlProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  required?: boolean;
}

function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
}: {
  id: ContactField;
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

function Select({
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
