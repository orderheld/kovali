"use client";

import { ActionForm, FormSection, SelectField, TextAreaField, TextField } from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import type { Company } from "@/lib/admin/db/schema";
import type { ActionState } from "@/lib/admin/forms";
import { companyKinds, companyStatuses } from "@/lib/admin/options";

export function CompanyForm({
  action,
  company,
  cancelHref,
  defaultKind,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  company?: Company;
  cancelHref: string;
  defaultKind?: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={company ? "Änderungen speichern" : "Firma anlegen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <FormSection title="Firma">
        <TextField name="name" label="Name" required defaultValue={company?.name} hint="Kurzname, wie er in Listen erscheint, z. B. GHR Group." />
        <SelectField
          name="kind"
          label="Art"
          required
          options={companyKinds}
          defaultValue={company?.kind ?? defaultKind ?? "auftraggeber"}
          hint="Auftraggeber geben Mandate; Subunternehmer sind Firmen von Fachpersonen."
        />
        <TextField name="legalName" label="Rechtlicher Name" defaultValue={company?.legalName} hint="Für Verträge, z. B. GHR Group AG." />
        <TextField name="legalForm" label="Rechtsform" defaultValue={company?.legalForm} placeholder="AG, GmbH, Einzelunternehmen …" />
        <TextField name="uid" label="UID" defaultValue={company?.uid} placeholder="CHE-123.456.789" />
        <TextField name="industry" label="Branche" defaultValue={company?.industry} placeholder="IT-Dienstleister, Bank, Verwaltung …" />
        <SelectField name="status" label="Status" options={companyStatuses} defaultValue={company?.status ?? "aktiv"} />
      </FormSection>
      <FormSection title="Adresse und Kontakt" columns={3}>
        <TextField name="street" label="Strasse und Nr." defaultValue={company?.street} className="sm:col-span-2 lg:col-span-3" />
        <TextField name="postalCode" label="PLZ" defaultValue={company?.postalCode} />
        <TextField name="city" label="Ort" defaultValue={company?.city} />
        <TextField name="country" label="Land" defaultValue={company?.country ?? "Schweiz"} required />
        <TextField name="email" label="E-Mail allgemein" type="email" defaultValue={company?.email} />
        <TextField name="phone" label="Telefon" type="tel" defaultValue={company?.phone} />
        <TextField name="website" label="Website" defaultValue={company?.website} placeholder="www.beispiel.ch" />
      </FormSection>
      <FormSection title="Notizen" columns={1}>
        <TextAreaField name="notes" label="Interne Notizen" defaultValue={company?.notes} rows={4} hint="Konditionen, Ansprechpartner, Portal-Zugang (keine Passwörter)." />
      </FormSection>
    </ActionForm>
  );
}
