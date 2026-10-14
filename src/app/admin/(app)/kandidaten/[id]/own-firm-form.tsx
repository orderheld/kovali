"use client";

import { ActionForm, SelectField, SubmitButton } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";

/** Links an existing subcontractor firm from the "Eigene Firma" card. */
export function OwnFirmForm({
  action,
  choices,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  choices: { value: number; label: string }[];
}) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <SelectField name="companyId" label="Bestehende Firma verknüpfen" options={choices} emptyLabel="Firma wählen" className="min-w-0 flex-1 basis-48" />
        <SubmitButton variant="secondary">Verknüpfen</SubmitButton>
      </div>
    </ActionForm>
  );
}
