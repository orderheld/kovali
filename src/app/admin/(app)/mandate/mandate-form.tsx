"use client";

import { useId, useState } from "react";
import {
  ActionForm,
  FormSection,
  MultiChoiceField,
  SelectField,
  TagInputField,
  TextAreaField,
  TextField,
  useFormState,
} from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import type { Mandate } from "@/lib/admin/db/schema";
import type { ActionState } from "@/lib/admin/forms";
import {
  disciplines,
  mandateKinds,
  mandatePriorities,
  mandateSources,
  mandateStatuses,
  rateUnits,
  remoteOptions,
  seniorities,
} from "@/lib/admin/options";
import { skillSuggestions } from "@/lib/admin/skills";

export interface CompanyChoice {
  value: number;
  label: string;
}

export interface ContactChoice {
  value: number;
  label: string;
  companyId: number;
}

/** Kind of mandate as cards with their explanation, so the choice is clear at a glance. */
function KindField({ defaultValue }: { defaultValue: string }) {
  const id = useId();
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.kind : undefined;
  return (
    <fieldset className="sm:col-span-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">
        Art<span aria-hidden className="text-blue"> *</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {mandateKinds.map((k) => (
          <label
            key={k.value}
            className="flex cursor-pointer gap-3 rounded-md border border-line bg-white p-3 transition-colors hover:border-slate/40 has-checked:border-blue has-checked:bg-blue/[0.04] has-checked:ring-1 has-checked:ring-blue"
          >
            <input type="radio" name="kind" value={k.value} defaultChecked={k.value === defaultValue} className="mt-0.5 size-4 shrink-0 accent-blue" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{k.label}</span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-slate">{k.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * Company and contact. The contact list follows the chosen company; without a company all
 * contacts are offered and the server takes over the contact's company.
 */
function CompanyContactFields({
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
}: {
  companies: CompanyChoice[];
  contacts: ContactChoice[];
  defaultCompanyId?: number | null;
  defaultContactId?: number | null;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ? String(defaultCompanyId) : "");
  const visible = companyId ? contacts.filter((c) => String(c.companyId) === companyId) : contacts;
  const contactDefault = defaultContactId && visible.some((c) => c.value === defaultContactId) ? defaultContactId : null;
  return (
    <>
      {/* The change event bubbles up from the select, so the shared SelectField can stay uncontrolled. */}
      <div
        onChange={(e) => {
          const target = e.target as EventTarget;
          if (target instanceof HTMLSelectElement && target.name === "companyId") setCompanyId(target.value);
        }}
      >
        <SelectField
          name="companyId"
          label="Firma"
          options={companies}
          emptyLabel="– keine –"
          defaultValue={defaultCompanyId}
          hint="Auftraggeber, der das Mandat vergibt, und Empfänger der Profile."
        />
      </div>
      {/* Remounted per company, so a contact of another company is never kept selected. */}
      <SelectField
        key={companyId}
        name="contactId"
        label="Kontakt"
        options={visible}
        emptyLabel={visible.length ? "–" : "Keine Kontakte erfasst"}
        defaultValue={contactDefault}
        hint={companyId ? "Ansprechperson bei dieser Firma." : "Ohne Firma werden alle Kontakte angeboten; die Firma des Kontakts wird übernommen."}
      />
    </>
  );
}

export function MandateForm({
  action,
  mandate,
  cancelHref,
  companies,
  contacts,
  defaultCompanyId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  mandate?: Mandate;
  cancelHref: string;
  companies: CompanyChoice[];
  contacts: ContactChoice[];
  defaultCompanyId?: number;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={mandate ? "Änderungen speichern" : "Mandat anlegen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <FormSection title="Mandat" description="Woher das Mandat kommt und wer dein Gegenüber ist.">
        <KindField defaultValue={mandate?.kind ?? "anfrage"} />
        <TextField
          name="title"
          label="Titel"
          required
          defaultValue={mandate?.title}
          placeholder="z. B. Senior Business Analyst Zahlungsverkehr"
          className="sm:col-span-2"
        />
        <CompanyContactFields
          companies={companies}
          contacts={contacts}
          defaultCompanyId={mandate ? mandate.companyId : defaultCompanyId}
          defaultContactId={mandate?.contactId}
        />
        <TextField name="reference" label="Referenz" defaultValue={mandate?.reference} hint="Nummer der Anfrage oder Ausschreibung beim Auftraggeber." />
        <TextField name="endClient" label="Endkunde" defaultValue={mandate?.endClient} hint="Intern. Erscheint nie automatisch im Kandidatenportal." />
        <SelectField name="source" label="Quelle" options={mandateSources} emptyLabel="–" defaultValue={mandate?.source} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="status" label="Status" required options={mandateStatuses} defaultValue={mandate?.status ?? "neu"} />
          <SelectField name="priority" label="Priorität" required options={mandatePriorities} defaultValue={mandate?.priority ?? "normal"} />
        </div>
      </FormSection>

      <FormSection title="Anforderungen" description="Grundlage für das Matching mit deinen Kandidaten.">
        <TextAreaField
          name="description"
          label="Beschreibung"
          defaultValue={mandate?.description}
          rows={10}
          hint="Aufgaben, Umfeld und Rahmenbedingungen, gerne direkt aus der Anfrage übernommen."
          className="sm:col-span-2"
        />
        <MultiChoiceField name="disciplines" label="Schwerpunkte" options={disciplines} defaultValue={mandate?.disciplines} className="sm:col-span-2" />
        <TagInputField
          name="requiredSkills"
          label="Muss-Kompetenzen"
          defaultValue={mandate?.requiredSkills}
          suggestions={skillSuggestions}
          hint="Zählen im Matching am stärksten. Schreibweisen wie «S4HANA» werden vereinheitlicht."
          className="sm:col-span-2"
        />
        <TagInputField
          name="niceSkills"
          label="Kann-Kompetenzen"
          defaultValue={mandate?.niceSkills}
          suggestions={skillSuggestions}
          className="sm:col-span-2"
        />
        <SelectField name="seniority" label="Seniorität" options={seniorities} emptyLabel="–" defaultValue={mandate?.seniority} />
        <TextField name="workload" label="Pensum" inputMode="numeric" suffix="%" defaultValue={mandate?.workload} placeholder="100" />
        <TextField name="location" label="Einsatzort" defaultValue={mandate?.location} placeholder="Zürich, Bern …" />
        <SelectField name="remote" label="Remote" options={remoteOptions} emptyLabel="–" defaultValue={mandate?.remote} />
      </FormSection>

      <FormSection title="Zeitraum und Konditionen" columns={3}>
        <TextField name="startDate" label="Start" type="date" defaultValue={mandate?.startDate} />
        <TextField name="endDate" label="Ende" type="date" defaultValue={mandate?.endDate} />
        <TextField name="durationText" label="Dauer" defaultValue={mandate?.durationText} placeholder="6 Monate, Option auf Verlängerung" />
        <TextField
          name="rateSell"
          label="Verkaufssatz"
          inputMode="decimal"
          suffix="CHF"
          defaultValue={mandate?.rateSell}
          hint="Was der Auftraggeber KOVALI bezahlt."
        />
        <SelectField name="rateUnit" label="Einheit" required options={rateUnits} defaultValue={mandate?.rateUnit ?? "stunde"} />
        <TextField name="deadline" label="Eingabefrist" type="date" defaultValue={mandate?.deadline} hint="Bis wann Profile beim Auftraggeber sein müssen." />
      </FormSection>

      <FormSection title="Nächster Schritt und Notizen">
        <TextField name="nextStep" label="Nächster Schritt" defaultValue={mandate?.nextStep} placeholder="z. B. Kandidaten anfragen, Profil nachreichen" />
        <TextField name="nextStepAt" label="Bis wann" type="date" defaultValue={mandate?.nextStepAt} />
        <TextAreaField name="notes" label="Interne Notizen" defaultValue={mandate?.notes} rows={4} className="sm:col-span-2" />
      </FormSection>
    </ActionForm>
  );
}
