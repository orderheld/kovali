"use client";

import { useId } from "react";
import { ActionForm, CheckboxField, FieldShell, FormSection, SelectField, TextField, useFormState } from "@/components/admin/form";
import { LongTextField } from "@/components/admin/long-text-field";
import { LinkButton } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

export interface SnippetFormValues {
  title: string;
  category: string | null;
  companyId: number | null;
  body: string;
  pinned: boolean;
}

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none aria-[invalid=true]:border-red-600";

/** Category as free text; categories already in use are suggested (datalist). */
function CategoryField({ defaultValue, categories }: { defaultValue?: string | null; categories: string[] }) {
  const id = `${useId()}-category`;
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.category : undefined;
  return (
    <FieldShell id={id} label="Kategorie" error={error} hint="Frei wählbar, z. B. Bewerbung, Kurzprofil oder E-Mail. Bestehende Kategorien werden vorgeschlagen.">
      <input
        id={id}
        name="category"
        list={categories.length ? `${id}-list` : undefined}
        defaultValue={defaultValue ?? ""}
        autoComplete="off"
        maxLength={60}
        placeholder="Bewerbung"
        aria-invalid={error ? true : undefined}
        aria-describedby={[`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
        className={cn(control)}
      />
      {categories.length ? (
        <datalist id={`${id}-list`}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      ) : null}
    </FieldShell>
  );
}

export function SnippetForm({
  action,
  snippet,
  categories,
  companies,
  cancelHref,
  defaultCompanyId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  snippet?: SnippetFormValues;
  categories: string[];
  companies: { value: number; label: string }[];
  cancelHref: string;
  defaultCompanyId?: number;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={snippet ? "Änderungen speichern" : "Textbaustein anlegen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <FormSection title="Textbaustein">
        <TextField
          name="title"
          label="Titel"
          required
          defaultValue={snippet?.title}
          placeholder="z. B. Bewerbung GHR: Kurzprofil"
          hint="So findest du ihn in der Liste wieder."
          className="sm:col-span-2"
        />
        <CategoryField defaultValue={snippet?.category} categories={categories} />
        <SelectField
          name="companyId"
          label="Firma"
          options={companies}
          emptyLabel="– für alle –"
          defaultValue={snippet ? snippet.companyId : defaultCompanyId}
          hint="Mit Firma erscheint er bei deren Vakanzen."
        />
        <LongTextField
          name="body"
          label="Text"
          required
          rows={16}
          defaultValue={snippet?.body}
          hint="Zeilenumbrüche bleiben beim Kopieren erhalten."
          className="sm:col-span-2"
        />
        <CheckboxField
          name="pinned"
          label="Anheften"
          defaultChecked={snippet?.pinned}
          hint="Angeheftete Textbausteine stehen in der Liste zuoberst und erscheinen bei jeder Vakanz."
          className="sm:col-span-2"
        />
      </FormSection>
    </ActionForm>
  );
}
