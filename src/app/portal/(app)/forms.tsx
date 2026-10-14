"use client";

import { ActionForm, FileField, SelectField, TextAreaField } from "@/components/admin/form";
import { CONSENT_LABEL, PASSWORD_MIN_LABEL } from "@/components/portal/constants";
import { ConsentCheckbox, PasswordField } from "@/components/portal/fields";
import type { ActionState } from "@/lib/admin/forms";
import { changeOwnPassword, sendStammdatenMessage, uploadOwnDocument } from "./actions";

/** Client forms of the logged-in portal pages. The actions check the session themselves. */

export function StammdatenForm({ defaultMessage }: { defaultMessage?: string }) {
  return (
    <ActionForm action={sendStammdatenMessage} submitLabel="Änderung melden" pendingLabel="Wird gesendet …" resetOnSuccess className="space-y-5">
      <TextAreaField
        name="message"
        label="Was soll geändert werden?"
        required
        rows={4}
        maxLength={2000}
        defaultValue={defaultMessage}
        placeholder="z. B. Neue Adresse ab 1. Dezember: Musterweg 3, 4500 Solothurn"
        hint="KOVALI prüft Ihre Meldung und passt die Stammdaten an."
      />
    </ActionForm>
  );
}

export function UploadForm({ kinds, accept, maxLabel }: { kinds: { value: string; label: string }[]; accept: string; maxLabel: string }) {
  return (
    <ActionForm action={uploadOwnDocument} submitLabel="Hochladen" pendingLabel="Wird hochgeladen …" resetOnSuccess className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <SelectField name="kind" label="Art des Dokuments" required options={kinds} defaultValue="cv" />
        <FileField name="file" label="Datei" required accept={accept} hint={`PDF, Word (DOCX), PNG oder JPG, höchstens ${maxLabel}.`} />
      </div>
    </ActionForm>
  );
}

export function InterestForm({
  action,
  recipient,
  defaultMessage,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  recipient: string;
  defaultMessage?: string | null;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} pendingLabel="Wird gespeichert …" className="space-y-4">
      <ConsentCheckbox name="consent">
        <span className="block font-medium">{CONSENT_LABEL}</span>
        <span className="mt-1 block text-sm text-slate">
          Empfänger: {recipient}. Die Einwilligung gilt nur für diese Vakanz; Sie können sie hier jederzeit widerrufen.
        </span>
      </ConsentCheckbox>
      <TextAreaField
        name="message"
        label="Nachricht an KOVALI (optional)"
        rows={3}
        maxLength={2000}
        defaultValue={defaultMessage}
        hint="Zum Beispiel ab wann Sie verfügbar wären oder Fragen zum Projekt."
      />
    </ActionForm>
  );
}

export function PasswordChangeForm() {
  return (
    <ActionForm action={changeOwnPassword} submitLabel="Passwort ändern" pendingLabel="Wird gespeichert …" resetOnSuccess className="space-y-5">
      <PasswordField name="current" label="Aktuelles Passwort" autoComplete="current-password" />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField name="password" label="Neues Passwort" autoComplete="new-password" hint={PASSWORD_MIN_LABEL} />
        <PasswordField name="passwordRepeat" label="Neues Passwort wiederholen" autoComplete="new-password" />
      </div>
    </ActionForm>
  );
}
