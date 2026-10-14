"use client";

import { ActionForm, SelectField, TextAreaField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";
import { activityKinds } from "@/lib/admin/options";

const kinds = activityKinds.filter((k) => k.value !== "system");

export function NoteForm({ action }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  return (
    <ActionForm action={action} submitLabel="Notiz speichern" resetOnSuccess className="space-y-3">
      <TextAreaField name="body" label="Neue Notiz" rows={3} placeholder="z. B. Telefonat mit GHR: Interview am Dienstag, 10 Uhr" />
      <SelectField name="kind" label="Art" options={kinds} defaultValue="notiz" className="max-w-48" />
    </ActionForm>
  );
}
