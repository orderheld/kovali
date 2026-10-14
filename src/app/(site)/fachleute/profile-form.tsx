"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FileDrop } from "@/components/forms/file-drop";
import {
  ChoiceChips,
  Consent,
  ErrorSummary,
  Field,
  FormStep,
  Honeypot,
  SubmitError,
  SubmitRow,
  SuccessPanel,
  TestModeNotice,
  inputClass,
} from "@/components/forms/fields";
import {
  CV_MAX_BYTES,
  CV_MAX_LABEL,
  ENGAGEMENT_LABEL,
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
  engagement: ENGAGEMENT_LABEL,
  profileUrl: "Profil-Link",
  cv: "Lebenslauf",
  message: "Nachricht",
  consent: "Datenschutz",
};

/** Quick check in the browser, so an unsuitable file fails before it is uploaded. */
function cvProblem(file: File | undefined): string | undefined {
  if (!file) return undefined;
  if (file.size > CV_MAX_BYTES) return `Die Datei ist grösser als ${CV_MAX_LABEL}. Bitte laden Sie eine kleinere PDF-Datei hoch.`;
  if (!/\.pdf$/i.test(file.name)) return "Bitte laden Sie Ihren Lebenslauf als PDF-Datei hoch.";
  return undefined;
}

export function ProfileForm({ fallbackEmail, testMode = false }: { fallbackEmail: string; testMode?: boolean }) {
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
      <SuccessPanel
        headingRef={successRef}
        title="Vielen Dank für Ihr Profil"
        text="Ihr Profil ist angekommen. Ferhat Demir liest es und meldet sich, wenn ein passendes Mandat ansteht."
        reference={state.reference}
      />
    );
  }

  const values: ProfileValues = state.status === "invalid" || state.status === "error" ? state.values : {};
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors = fileError ? { ...serverErrors, cv: fileError } : serverErrors;
  const errorEntries = (Object.entries(errors) as [ProfileField, string][]).map(
    ([field, message]): [string, string, string] => [field, FIELD_LABELS[field], message],
  );
  const v = (field: keyof ProfileValues, fallback = "") => values[field] ?? fallback;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Dispatch manually so the browser keeps all entered values and the chosen file.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("cv");
    const problem = cvProblem(file instanceof File && file.size > 0 ? file : undefined);
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
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-10" aria-describedby="profile-hint">
      <div className="space-y-4">
        {testMode ? <TestModeNotice /> : null}
        {errorEntries.length > 0 ? <ErrorSummary ref={summaryRef} errors={errorEntries} /> : null}
        {state.status === "error" ? (
          <SubmitError ref={summaryRef} message={state.message} reference={state.reference} fallbackEmail={fallbackEmail} />
        ) : null}
        <p id="profile-hint" className="text-sm text-slate">
          Pflichtfelder sind mit <span aria-hidden className="text-blue">*</span>
          <span className="sr-only">Stern</span> markiert. Ein Anschreiben braucht es nicht.
        </p>
      </div>

      <FormStep number={1} title="Ihr Lebenslauf">
        <FileDrop
          id="cv"
          label="Lebenslauf"
          required
          accept="application/pdf,.pdf"
          formats={`PDF, höchstens ${CV_MAX_LABEL}`}
          error={errors.cv}
          onSelect={(file) => setFileError(cvProblem(file))}
        />
        <Field id="profileUrl" label="Profil-Link" optional hint="Zum Beispiel Ihr LinkedIn-Profil." error={errors.profileUrl}>
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
      </FormStep>

      <FormStep number={2} title="Ihr Schwerpunkt">
        <ChoiceChips name="focus" legend="Schwerpunkt" required options={focusOptions} defaultValue={v("focus")} error={errors.focus} />
        <ChoiceChips
          name="availability"
          legend="Verfügbar ab"
          optional
          options={availabilityOptions}
          defaultValue={v("availability")}
          error={errors.availability}
        />
        <ChoiceChips
          name="engagement"
          legend={ENGAGEMENT_LABEL}
          required
          hint="KOVALI vergibt Mandate nur an Firmen: Ihre GmbH oder AG arbeitet als Subunternehmen von KOVALI."
          options={engagementOptions}
          defaultValue={v("engagement")}
          error={errors.engagement}
        />
        <Field id="message" label="Nachricht" optional hint="Branchen, Sprachen, Pensum oder Einsatzregion." error={errors.message}>
          {(p) => <textarea {...p} name="message" rows={3} defaultValue={v("message")} className={cn(inputClass, "resize-y")} />}
        </Field>
      </FormStep>

      <FormStep number={3} title="Ihre Kontaktdaten">
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
        </div>
      </FormStep>

      <Honeypot />

      <div className="space-y-7">
        <Consent
          text="dass mein Profil zur Prüfung einer Zusammenarbeit verwendet und höchstens sechs Monate aufbewahrt wird. In einer Offerte von KOVALI für ein konkretes Mandat, in dem KOVALI Auftragnehmer ist, wird es nur mit meiner Zustimmung verwendet."
          defaultChecked={v("consent") === "on"}
          error={errors.consent}
        />
        <SubmitRow pending={pending} label="Profil senden" pendingLabel="Profil wird gesendet" />
      </div>
    </form>
  );
}
