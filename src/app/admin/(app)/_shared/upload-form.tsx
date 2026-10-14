"use client";

import { ActionForm, FileField, SelectField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";
import type { Option } from "@/lib/admin/options";

export function UploadForm({
  action,
  kinds,
  defaultKind,
  accept,
  maxLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  /** The document kinds offered for this record. */
  kinds: Option[];
  defaultKind: string;
  accept: string;
  maxLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel="Hochladen" pendingLabel="Wird verschlüsselt …" resetOnSuccess className="space-y-3">
      <FileField name="file" label="Neues Dokument" accept={accept} hint={`PDF, Word, PNG oder JPG, höchstens ${maxLabel}.`} />
      <SelectField name="kind" label="Art" options={kinds} defaultValue={defaultKind} className="max-w-64" />
    </ActionForm>
  );
}
