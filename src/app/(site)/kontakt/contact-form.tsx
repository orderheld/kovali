"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FileDrop } from "@/components/forms/file-drop";
import {
  ChoiceChips,
  ChoiceTiles,
  Consent,
  ErrorSummary,
  Field,
  FormStep,
  Honeypot,
  MultiChoiceChips,
  SubmitError,
  SubmitRow,
  SuccessPanel,
  TestModeNotice,
  inputClass,
} from "@/components/forms/fields";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_LABEL,
  durationOptions,
  requestTypes,
  serviceChoices,
  startOptions,
  workloadOptions,
  workModes,
} from "@/lib/contact/options";
import {
  initialContactState,
  type ContactErrorField,
  type ContactState,
  type ContactTextField,
  type ContactValues,
} from "@/lib/contact/state";
import { cn } from "@/lib/utils";
import { submitContact } from "./actions";

export interface ContactDefaults {
  requestType?: string;
  services?: string[];
}

/** In the order of the form, so the error summary lists the fields as they appear. */
const FIELD_LABELS: Record<ContactErrorField, string> = {
  requestType: "Art der Anfrage",
  services: "Gewünschte Leistungen",
  projectDescription: "Beschreibung",
  attachment: "Anforderungsprofil",
  start: "Beginn",
  duration: "Laufzeit",
  workload: "Pensum",
  workMode: "Arbeitsmodell",
  location: "Einsatzort",
  requirements: "Voraussetzungen",
  company: "Unternehmen",
  name: "Name",
  email: "Geschäftliche E-Mail",
  phone: "Telefon",
  message: "Nachricht",
  consent: "Datenschutz",
};

/** The entered values, read in the browser for the error state of a request that failed on the way. */
function enteredValues(data: FormData): ContactValues {
  const values: ContactValues = { services: data.getAll("services").filter((v): v is string => typeof v === "string") };
  for (const field of Object.keys(FIELD_LABELS) as ContactErrorField[]) {
    if (field === "services" || field === "attachment") continue;
    const value = data.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

/**
 * The request as the browser sends it with JavaScript. A dropped connection or a failed function
 * throws here; without the catch the page would switch to the framework's error screen and the
 * entered request would be lost. The form stays filled and offers the e-mail address instead.
 */
async function submitSafely(prev: ContactState, data: FormData): Promise<ContactState> {
  try {
    return await submitContact(prev, data);
  } catch {
    return {
      status: "error",
      message:
        "Beim Senden ist ein technischer Fehler aufgetreten. Ihre Angaben sind noch da. Bitte senden Sie die Anfrage erneut oder schreiben Sie per E-Mail.",
      values: enteredValues(data),
    };
  }
}

/** Quick check in the browser, so an unsuitable file fails before it is uploaded. */
function attachmentProblem(file: File | undefined): string | undefined {
  if (!file) return undefined;
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `Die Datei ist grösser als ${ATTACHMENT_MAX_LABEL}. Bitte laden Sie eine kleinere Datei hoch.`;
  }
  if (!/\.(pdf|docx)$/i.test(file.name)) return "Bitte laden Sie das Anforderungsprofil als PDF- oder Word-Datei (.docx) hoch.";
  return undefined;
}

export function ContactForm({
  defaults = {},
  fallbackEmail,
  testMode = false,
}: {
  defaults?: ContactDefaults;
  fallbackEmail: string;
  testMode?: boolean;
}) {
  // Without JavaScript the browser posts the form to the Server Action itself.
  const [postedState, formAction] = useActionState(submitContact, initialContactState);
  // With JavaScript handleSubmit sends through submitSafely.
  const [sentState, send, pending] = useActionState(submitSafely, initialContactState);
  const state = sentState === initialContactState ? postedState : sentState;
  const [fileError, setFileError] = useState<string>();
  const mountedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Only the first time: when the visitor comes back to the page, for example from the privacy
    // policy, the form keeps its values and the effect runs again, but the fill time goes on.
    if (mountedAt.current === 0) mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (state.status === "invalid" || state.status === "error") summaryRef.current?.focus();
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <SuccessPanel
        headingRef={successRef}
        title="Vielen Dank für Ihre Anfrage"
        text="Ihre Anfrage ist angekommen. Ferhat Demir liest sie und meldet sich mit einer ersten Einschätzung."
        reference={state.reference}
      />
    );
  }

  const values: ContactValues = state.status === "invalid" || state.status === "error" ? state.values : {};
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors: Partial<Record<ContactErrorField, string>> = fileError ? { ...serverErrors, attachment: fileError } : serverErrors;
  const errorEntries = (Object.keys(FIELD_LABELS) as ContactErrorField[])
    .filter((field) => errors[field])
    .map((field): [string, string, string] => [field, FIELD_LABELS[field], errors[field] as string]);
  const v = (field: ContactTextField, fallback = "") => values[field] ?? fallback;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Dispatch manually so the browser keeps all entered values and the chosen file.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("attachment");
    const problem = attachmentProblem(file instanceof File && file.size > 0 ? file : undefined);
    if (problem) {
      setFileError(problem);
      document.getElementById("attachment")?.focus();
      return;
    }
    // Fill time on the visitor's own clock, so a wrong system time cannot block the request.
    if (mountedAt.current > 0) data.set("elapsedMs", String(Math.round(performance.now() - mountedAt.current)));
    startTransition(() => send(data));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-10" aria-describedby="form-hint">
      <div className="space-y-4">
        {testMode ? <TestModeNotice /> : null}
        {errorEntries.length > 0 ? <ErrorSummary ref={summaryRef} errors={errorEntries} /> : null}
        {state.status === "error" ? (
          <SubmitError ref={summaryRef} message={state.message} reference={state.reference} fallbackEmail={fallbackEmail} />
        ) : null}
        <p id="form-hint" className="text-sm text-slate">
          Pflichtfelder sind mit <span aria-hidden className="text-blue">*</span>
          <span className="sr-only">Stern</span> markiert. Alles Weitere ist freiwillig.
        </p>
      </div>

      <FormStep number={1} title="Worum geht es?">
        <ChoiceTiles
          name="requestType"
          legend="Art der Anfrage"
          required
          options={requestTypes}
          defaultValue={v("requestType", defaults.requestType)}
          error={errors.requestType}
        />
        <MultiChoiceChips
          name="services"
          legend="Gewünschte Leistungen"
          optional
          hint="Sie können mehrere Leistungen wählen."
          options={serviceChoices}
          defaultValues={values.services ?? defaults.services}
          error={errors.services}
        />
        <Field
          id="projectDescription"
          label="Beschreibung"
          required
          hint="Aufgabe oder gesuchte Unterstützung, Ausgangslage und Ziel. Bitte keine vertraulichen Kundendaten."
          error={errors.projectDescription}
        >
          {(p) => (
            <textarea
              {...p}
              name="projectDescription"
              rows={5}
              placeholder="Zum Beispiel: Business Analysis für die Ablösung einer Fachapplikation in einem laufenden Kundenmandat."
              defaultValue={v("projectDescription")}
              className={cn(inputClass, "resize-y")}
            />
          )}
        </Field>
        <FileDrop
          id="attachment"
          label="Anforderungsprofil"
          optional
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          formats={`PDF oder Word, höchstens ${ATTACHMENT_MAX_LABEL}`}
          error={errors.attachment}
          onSelect={(file) => setFileError(attachmentProblem(file))}
        />
      </FormStep>

      <FormStep number={2} title="Zeitraum und Voraussetzungen">
        <ChoiceChips name="start" legend="Beginn" optional options={startOptions} defaultValue={v("start")} error={errors.start} />
        <ChoiceChips
          name="duration"
          legend="Laufzeit"
          optional
          options={durationOptions}
          defaultValue={v("duration")}
          error={errors.duration}
        />
        <ChoiceChips
          name="workload"
          legend="Pensum"
          optional
          options={workloadOptions}
          defaultValue={v("workload")}
          error={errors.workload}
        />
        <ChoiceChips
          name="workMode"
          legend="Arbeitsmodell"
          optional
          options={workModes}
          defaultValue={v("workMode")}
          error={errors.workMode}
        />
        <Field id="location" label="Einsatzort" optional error={errors.location}>
          {(p) => (
            <input {...p} name="location" type="text" placeholder="z. B. Ort oder Region" defaultValue={v("location")} className={inputClass} />
          )}
        </Field>
        <Field
          id="requirements"
          label="Voraussetzungen"
          optional
          hint="Zum Beispiel Erfahrung, Methoden, Tools, Sprachen, Zertifikate oder Sicherheitsprüfung."
          error={errors.requirements}
        >
          {(p) => (
            <textarea {...p} name="requirements" rows={4} defaultValue={v("requirements")} className={cn(inputClass, "resize-y")} />
          )}
        </Field>
      </FormStep>

      <FormStep number={3} title="Unternehmen und Kontakt">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="company" label="Unternehmen" required error={errors.company}>
            {(p) => (
              <input {...p} name="company" type="text" autoComplete="organization" defaultValue={v("company")} className={inputClass} />
            )}
          </Field>
          <Field id="name" label="Name" required error={errors.name}>
            {(p) => <input {...p} name="name" type="text" autoComplete="name" defaultValue={v("name")} className={inputClass} />}
          </Field>
          <Field id="email" label="Geschäftliche E-Mail" required error={errors.email}>
            {(p) => (
              <input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v("email")} className={inputClass} />
            )}
          </Field>
          <Field id="phone" label="Telefon" optional error={errors.phone}>
            {(p) => <input {...p} name="phone" type="tel" autoComplete="tel" defaultValue={v("phone")} className={inputClass} />}
          </Field>
        </div>
        <Field id="message" label="Nachricht" optional hint="Weitere Fragen oder ein Rückrufwunsch." error={errors.message}>
          {(p) => <textarea {...p} name="message" rows={3} defaultValue={v("message")} className={cn(inputClass, "resize-y")} />}
        </Field>
      </FormStep>

      <Honeypot />

      <div className="space-y-7">
        <Consent
          text="dass meine Angaben zur Bearbeitung der Anfrage verwendet werden."
          defaultChecked={v("consent") === "on"}
          error={errors.consent}
        />
        <SubmitRow pending={pending} label="Anfrage senden" pendingLabel="Anfrage wird gesendet" />
      </div>
    </form>
  );
}
