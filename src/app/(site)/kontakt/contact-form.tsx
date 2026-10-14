"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FileDrop } from "@/components/forms/file-drop";
import {
  ChoiceChips,
  ChoiceTiles,
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
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_LABEL,
  requestTypes,
  serviceOptions,
  startOptions,
  workModes,
} from "@/lib/contact/options";
import {
  initialContactState,
  type ContactErrorField,
  type ContactField,
  type ContactValues,
} from "@/lib/contact/state";
import { cn } from "@/lib/utils";
import { submitContact } from "./actions";

export interface ContactDefaults {
  requestType?: string;
  service?: string;
}

const FIELD_LABELS: Record<ContactErrorField, string> = {
  name: "Name",
  company: "Unternehmen",
  email: "Geschäftliche E-Mail",
  phone: "Telefon",
  requestType: "Art der Anfrage",
  service: "Gewünschte Leistung",
  projectDescription: "Beschreibung",
  attachment: "Anforderungsprofil",
  start: "Gewünschter Start",
  workMode: "Arbeitsmodell",
  location: "Einsatzort",
  message: "Nachricht",
  consent: "Datenschutz",
};

/** Optional details, collapsed until the visitor opens them or one of them needs attention. */
const DETAIL_FIELDS: ContactField[] = ["start", "workMode", "location", "message"];

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
  const [state, formAction, pending] = useActionState(submitContact, initialContactState);
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
        title="Vielen Dank für Ihre Anfrage"
        text="Ihre Anfrage ist angekommen. Ferhat Demir liest sie und meldet sich mit einer ersten Einschätzung."
        reference={state.reference}
      />
    );
  }

  const values: ContactValues = state.status === "invalid" || state.status === "error" ? state.values : {};
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors: Partial<Record<ContactErrorField, string>> = fileError ? { ...serverErrors, attachment: fileError } : serverErrors;
  const errorEntries = (Object.entries(errors) as [ContactErrorField, string][]).map(
    ([field, message]): [string, string, string] => [field, FIELD_LABELS[field], message],
  );
  const v = (field: ContactField, fallback = "") => values[field] ?? fallback;
  const detailsOpen = DETAIL_FIELDS.some((f) => values[f] || errors[f]);

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
    startTransition(() => formAction(data));
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
        <ChoiceChips
          name="service"
          legend="Gewünschte Leistung"
          optional
          options={serviceOptions}
          defaultValue={v("service", defaults.service)}
          error={errors.service}
        />
        <Field
          id="projectDescription"
          label="Beschreibung"
          required
          hint="Aufgabe oder gesuchte Unterstützung, Zeitraum und Pensum oder Ausgangslage und Ziel des Projekts. Bitte keine vertraulichen Kundendaten."
          error={errors.projectDescription}
        >
          {(p) => (
            <textarea
              {...p}
              name="projectDescription"
              rows={5}
              placeholder="Zum Beispiel: Business Analysis für die Ablösung einer Fachapplikation, ab März, 80 bis 100 %, vor Ort und remote."
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

        <details open={detailsOpen} className="group rounded-lg border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-ink marker:hidden hover:text-blue [&::-webkit-details-marker]:hidden">
            <span>
              Rahmen angeben <span className="font-normal text-slate">(optional: Start, Arbeitsmodell, Einsatzort)</span>
            </span>
            <ChevronDown aria-hidden className="size-5 shrink-0 text-slate transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-6 border-t border-line px-5 pb-6 pt-5">
            <ChoiceChips name="start" legend="Gewünschter Start" options={startOptions} defaultValue={v("start")} error={errors.start} />
            <ChoiceChips name="workMode" legend="Arbeitsmodell" options={workModes} defaultValue={v("workMode")} error={errors.workMode} />
            <Field id="location" label="Einsatzort" error={errors.location}>
              {(p) => (
                <input {...p} name="location" type="text" placeholder="z. B. Ort oder Region" defaultValue={v("location")} className={inputClass} />
              )}
            </Field>
            <Field id="message" label="Nachricht" hint="Weitere Fragen, Rahmenbedingungen oder Rückrufwunsch." error={errors.message}>
              {(p) => <textarea {...p} name="message" rows={3} defaultValue={v("message")} className={cn(inputClass, "resize-y")} />}
            </Field>
          </div>
        </details>
      </FormStep>

      <FormStep number={2} title="Ihre Kontaktdaten">
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
        </div>
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
