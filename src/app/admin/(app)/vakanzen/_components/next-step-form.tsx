"use client";

import { ActionForm, TextField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";

/** Next step of a vacancy, editable on the detail page without opening the whole form. */
export function NextStepForm({
  action,
  nextStep,
  nextStepAt,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  nextStep: string | null;
  nextStepAt: string | null;
}) {
  return (
    <ActionForm action={action} submitLabel={nextStep ? "Ändern" : "Festhalten"} className="space-y-3">
      <TextField name="nextStep" label={nextStep ? "Nächster Schritt" : "Was steht als Nächstes an?"} defaultValue={nextStep} placeholder="z. B. Bei GHR nach Feedback fragen" />
      <TextField name="nextStepAt" label="Bis wann" type="date" defaultValue={nextStepAt} className="max-w-48" />
    </ActionForm>
  );
}
