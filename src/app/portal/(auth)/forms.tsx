"use client";

import Link from "next/link";
import { ActionForm, TextField } from "@/components/admin/form";
import { ConsentCheckbox, PasswordField } from "@/components/portal/fields";
import { PASSWORD_MIN_LABEL } from "@/components/portal/constants";
import { acceptInvitation, login, requestPasswordReset, setNewPassword } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={login} submitLabel="Anmelden" pendingLabel="Wird geprüft …" className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField name="email" label="E-Mail-Adresse" type="email" autoComplete="username" inputMode="email" required />
      <PasswordField name="password" label="Passwort" autoComplete="current-password" />
      <p className="-mt-2 text-sm">
        <Link href="/portal/passwort" className="font-medium text-blue hover:underline">
          Passwort vergessen?
        </Link>
      </p>
    </ActionForm>
  );
}

export function InvitationForm({ token, email, privacy }: { token: string; email: string; privacy: React.ReactNode }) {
  return (
    <ActionForm action={acceptInvitation} submitLabel="Passwort speichern und anmelden" pendingLabel="Wird gespeichert …" className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers store the password for the right login. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <PasswordField name="password" label="Neues Passwort" autoComplete="new-password" hint={PASSWORD_MIN_LABEL} />
      <PasswordField name="passwordRepeat" label="Passwort wiederholen" autoComplete="new-password" />
      {privacy}
      <ConsentCheckbox name="privacy">
        Ich habe die Datenschutzhinweise gelesen. Mir ist bewusst, dass KOVALI mein Profil nur mit meiner Einwilligung für eine bestimmte
        Vakanz an einen Auftraggeber weitergibt.
      </ConsentCheckbox>
    </ActionForm>
  );
}

export function ResetRequestForm() {
  return (
    <ActionForm action={requestPasswordReset} submitLabel="Link anfordern" pendingLabel="Wird gesendet …" className="space-y-5" resetOnSuccess>
      <TextField name="email" label="E-Mail-Adresse Ihres Zugangs" type="email" autoComplete="username" inputMode="email" required />
    </ActionForm>
  );
}

export function NewPasswordForm({ token, email }: { token: string; email: string }) {
  return (
    <ActionForm action={setNewPassword} submitLabel="Passwort speichern und anmelden" pendingLabel="Wird gespeichert …" className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <PasswordField name="password" label="Neues Passwort" autoComplete="new-password" hint={PASSWORD_MIN_LABEL} />
      <PasswordField name="passwordRepeat" label="Passwort wiederholen" autoComplete="new-password" />
    </ActionForm>
  );
}
