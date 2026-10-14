"use client";

import { ActionForm, CheckboxField, FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import type { Contact } from "@/lib/admin/db/schema";
import type { ActionState } from "@/lib/admin/forms";
import { salutations } from "@/lib/admin/options";

export function ContactForm({
  action,
  contact,
  cancelHref,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  contact?: Contact;
  cancelHref: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={contact ? "Änderungen speichern" : "Kontakt anlegen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <FormSection title="Person" columns={3}>
        <SelectField name="salutation" label="Anrede" options={salutations} emptyLabel="–" defaultValue={contact?.salutation} />
        <TextField name="firstName" label="Vorname" defaultValue={contact?.firstName} />
        <TextField name="lastName" label="Nachname" required defaultValue={contact?.lastName} />
        <TextField name="role" label="Funktion" defaultValue={contact?.role} placeholder="Recruiter, Account Manager …" />
        <TextField name="email" label="E-Mail" type="email" defaultValue={contact?.email} />
        <TextField name="phone" label="Telefon" type="tel" defaultValue={contact?.phone} />
        <CheckboxField
          name="isSignatory"
          label="Zeichnungsberechtigt"
          hint="Wird bei neuen Verträgen mit dieser Firma als Kontakt vorgeschlagen."
          defaultChecked={contact?.isSignatory}
          className="sm:col-span-2 lg:col-span-3"
        />
      </FormSection>
      <FormSection title="Notizen" columns={1}>
        <TextAreaField name="notes" label="Interne Notizen" defaultValue={contact?.notes} rows={3} />
      </FormSection>
    </ActionForm>
  );
}
