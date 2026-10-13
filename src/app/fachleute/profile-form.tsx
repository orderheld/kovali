"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Field, Honeypot, Select, inputClass } from "@/components/forms/fields";
import {
  CV_MAX_BYTES,
  CV_MAX_LABEL,
  availabilityOptions,
  engagementOptions,
  focusOptions,
} from "@/lib/profile/options";
import { initialProfileState, type ProfileField, type ProfileValues } from "@/lib/profile/state";
import { cn } from "@/lib/utils";
import { submitProfile } from "./actions";

const FIELD_LABELS: Record<ProfileField, string> = {
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  focus: "Schwerpunkt",
  availability: "Verfügbar ab",
  engagement: "Bevorzugte Zusammenarbeit",
  profileUrl: "Profil-Link",
  cv: "Lebenslauf",
  message: "Nachricht",
  consent: "Datenschutz",
};

const fileClass =
  "block w-full cursor-pointer rounded-md border border-line bg-white text-base text-slate file:mr-4 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-mist file:px-4 file:py-3 file:font-medium file:text-ink hover:border-slate/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 aria-[invalid=true]:border-red-600";

/** Client-side size check, so a too large file fails before it is uploaded. */
function fileProblem(file: File | undefined): string | undefined {
  if (!file) return undefined;
  if (file.size > CV_MAX_BYTES) return `Die Datei ist grösser als ${CV_MAX_LABEL}. Bitte laden Sie eine kleinere PDF-Datei hoch.`;
  return undefined;
}

export function ProfileForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [state, formAction, pending] = useActionState(submitProfile, initialProfileState);
  const [fileError, setFileError] = useState<string>();
  const mountedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    mountedAt.current = performance.now();
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
          Vielen Dank für Ihr Profil
        </h2>
        <p className="mt-3 leading-relaxed text-slate">
          Ihr Profil ist angekommen. Wir prüfen es persönlich und melden uns, wenn ein passendes Mandat ansteht.
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

  const values: ProfileValues = state.status === "invalid" || state.status === "error" ? state.values : {};
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors = fileError ? { ...serverErrors, cv: fileError } : serverErrors;
  const errorEntries = Object.entries(errors) as [ProfileField, string][];
  const v = (field: keyof ProfileValues, fallback = "") => values[field] ?? fallback;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Dispatch manually so the browser keeps all entered values and the chosen file.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("cv");
    const problem = fileProblem(file instanceof File && file.size > 0 ? file : undefined);
    if (problem) {
      setFileError(problem);
      document.getElementById("cv")?.focus();
      return;
    }
    // Fill time on the visitor's own clock, so a wrong system time cannot block the request.
    if (mountedAt.current > 0) data.set("elapsedMs", String(Math.round(performance.now() - mountedAt.current)));
    startTransition(() => formAction(data));
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-7"
      aria-describedby="profile-hint"
    >
      {state.status === "invalid" || fileError ? (
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
          {state.reference ? <p className="mt-2 pl-7 font-mono text-sm">Referenz: {state.reference}</p> : null}
          <p className="mt-2 pl-7 text-sm">
            E-Mail:{" "}
            <a href={`mailto:${fallbackEmail}`} className="underline underline-offset-2">
              {fallbackEmail}
            </a>
          </p>
        </div>
      ) : null}

      <p id="profile-hint" className="text-sm text-slate">
        Pflichtfelder sind mit <span aria-hidden className="text-blue">*</span>
        <span className="sr-only">Stern</span> markiert.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          {(p) => <input {...p} name="name" type="text" autoComplete="name" defaultValue={v("name")} className={inputClass} />}
        </Field>
        <Field id="email" label="E-Mail" required error={errors.email}>
          {(p) => (
            <input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v("email")} className={inputClass} />
          )}
        </Field>
        <Field id="phone" label="Telefon" optional error={errors.phone}>
          {(p) => <input {...p} name="phone" type="tel" autoComplete="tel" defaultValue={v("phone")} className={inputClass} />}
        </Field>
        <Field id="focus" label="Schwerpunkt" required error={errors.focus}>
          {(p) => <Select {...p} name="focus" defaultValue={v("focus")} options={focusOptions} />}
        </Field>
        <Field id="availability" label="Verfügbar ab" optional error={errors.availability}>
          {(p) => (
            <Select {...p} name="availability" defaultValue={v("availability")} options={availabilityOptions} placeholder="Keine Angabe" />
          )}
        </Field>
        <Field id="engagement" label="Bevorzugte Zusammenarbeit" optional error={errors.engagement}>
          {(p) => (
            <Select {...p} name="engagement" defaultValue={v("engagement")} options={engagementOptions} placeholder="Keine Angabe" />
          )}
        </Field>
      </div>

      <Field
        id="cv"
        label="Lebenslauf"
        required
        hint={`Eine PDF-Datei, höchstens ${CV_MAX_LABEL}.`}
        error={errors.cv}
      >
        {(p) => (
          <input
            {...p}
            name="cv"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFileError(fileProblem(e.currentTarget.files?.[0]))}
            className={fileClass}
          />
        )}
      </Field>

      <Field
        id="profileUrl"
        label="Profil-Link"
        optional
        hint="Zum Beispiel Ihr LinkedIn-Profil."
        error={errors.profileUrl}
      >
        {(p) => (
          <input
            {...p}
            name="profileUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={v("profileUrl")}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        id="message"
        label="Nachricht"
        optional
        hint="Schwerpunkte, Branchen, Sprachen, Pensum oder Einsatzregion."
        error={errors.message}
      >
        {(p) => <textarea {...p} name="message" rows={4} defaultValue={v("message")} className={cn(inputClass, "resize-y")} />}
      </Field>

      <Honeypot />

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
            gelesen und bin einverstanden, dass mein Profil zur Prüfung einer Zusammenarbeit verwendet und höchstens
            sechs Monate aufbewahrt wird. Eine Weitergabe an Auftraggeber erfolgt nur mit meiner Zustimmung.
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
          {pending ? "Profil wird gesendet" : "Profil senden"}
        </button>
        <p className="text-sm text-slate">Die Übermittlung ist verschlüsselt. Es werden keine Cookies gesetzt.</p>
      </div>
      <p aria-live="polite" className="sr-only">
        {pending ? "Profil wird gesendet" : ""}
      </p>
    </form>
  );
}
