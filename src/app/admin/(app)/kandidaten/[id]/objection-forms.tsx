"use client";

import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";
import { manualConsentMethods } from "@/lib/admin/options";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Records the candidate's objection to any further hand-over of the profile. */
export function ObjectionForm({ action, today }: { action: Action; today: string }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="objectionDate" label="Datum" type="date" defaultValue={today} max={today} required />
        <SelectField name="objectionMethod" label="Mitgeteilt per" options={manualConsentMethods} defaultValue="email" required />
        <TextField
          name="objectionReason"
          label="Notiz"
          placeholder="z. B. möchte nicht mehr vorgeschlagen werden"
          hint="Wer, wie, warum; keine heiklen Angaben."
          className="sm:col-span-2"
        />
      </div>
      <SubmitButton size="sm" variant="danger">
        Widerspruch erfassen
      </SubmitButton>
    </ActionForm>
  );
}

/** Lifts the objection; the reason goes into the history. */
export function LiftObjectionForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <TextField name="liftNote" label="Begründung" placeholder="z. B. irrtümlich erfasst, Fachperson hat es per E-Mail bestätigt" required />
      <SubmitButton size="sm" variant="secondary">
        Widerspruch aufheben
      </SubmitButton>
    </ActionForm>
  );
}
