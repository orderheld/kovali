"use client";

import { useId, useState } from "react";
import { ActionForm, FormSection, SelectField, TextAreaField, TextField, useFormState } from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import { computeEarnings, formatHours, hoursPerYear, netTaxNote, workingDaysPerYear, type EarningsSettings } from "@/lib/admin/earnings";
import { formatChf } from "@/lib/admin/format";
import type { ActionState } from "@/lib/admin/forms";
import { assignmentStatuses, billingModels, rateBases, rateUnits, remoteOptions, type Option } from "@/lib/admin/options";
import { parseDecimal } from "@/lib/admin/payroll";

export interface Choice {
  value: number;
  label: string;
}

export interface ContactChoice extends Choice {
  companyId: number;
}

/** Values of the form; an existing assignment or the prefill of a new one. */
export interface AssignmentValues {
  title?: string | null;
  status?: string | null;
  companyId?: number | null;
  contactId?: number | null;
  mandateId?: number | null;
  endClient?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  workload?: number | null;
  rateAmount?: number | null;
  rateUnit?: string | null;
  billing?: string | null;
  rateBasis?: string | null;
  hoursPerMonth?: number | null;
  expensesMonthly?: number | null;
  location?: string | null;
  remote?: string | null;
  notes?: string | null;
}

/** A choice between a few options shown as cards with their explanation. */
function RadioCards({ name, label, options, defaultValue, columns = 2 }: { name: string; label: string; options: readonly Option[]; defaultValue: string; columns?: 2 | 3 }) {
  const id = useId();
  const { state } = useFormState();
  const error = state.status === "error" ? state.errors?.[name] : undefined;
  return (
    <fieldset className="sm:col-span-full" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className={columns === 3 ? "grid gap-2 sm:grid-cols-3" : "grid gap-2 sm:grid-cols-2"}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer gap-3 rounded-md border border-line bg-white p-3 transition-colors hover:border-slate/40 has-checked:border-blue has-checked:bg-blue/[0.04] has-checked:ring-1 has-checked:ring-blue"
          >
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="mt-0.5 size-4 shrink-0 accent-blue" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{o.label}</span>
              {o.description ? <span className="mt-0.5 block text-[0.8125rem] leading-snug text-slate">{o.description}</span> : null}
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

/** Company and contact; the contacts follow the chosen company (without one, all are offered). */
function CompanyContactFields({ companies, contacts, defaultCompanyId, defaultContactId }: { companies: Choice[]; contacts: ContactChoice[]; defaultCompanyId?: number | null; defaultContactId?: number | null }) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ? String(defaultCompanyId) : "");
  const visible = companyId ? contacts.filter((c) => String(c.companyId) === companyId) : contacts;
  const contactDefault = defaultContactId && visible.some((c) => c.value === defaultContactId) ? defaultContactId : null;
  return (
    <>
      {/* The change event bubbles up from the select, so the shared SelectField stays uncontrolled. */}
      <div
        onChange={(e) => {
          const target = e.target as EventTarget;
          if (target instanceof HTMLSelectElement && target.name === "companyId") setCompanyId(target.value);
        }}
      >
        <SelectField
          name="companyId"
          label="Vertragspartner"
          options={companies}
          emptyLabel="– keine –"
          defaultValue={defaultCompanyId}
          hint={companies.length ? "Vermittler wie GHR Group oder der Kunde selbst." : "Noch keine Firmen erfasst. Lege sie unter Firmen & Kontakte an."}
        />
      </div>
      {/* Remounted per company, so a contact of another company is never kept selected. */}
      <SelectField
        key={companyId}
        name="contactId"
        label="Ansprechperson"
        options={visible}
        emptyLabel={visible.length ? "–" : "Keine Kontakte erfasst"}
        defaultValue={contactDefault}
        hint={companyId ? undefined : "Ohne Firma werden alle Kontakte angeboten; die Firma des Kontakts wird übernommen."}
      />
    </>
  );
}

interface PreviewValues {
  rate: number;
  unit: "stunde" | "tag";
  workload: number;
  billing: "rechnung" | "lohn";
  rateBasis: "brutto" | "kostensatz";
  hoursPerMonth: number;
  expensesMonthly: number;
}

function readPreview(form: HTMLFormElement): PreviewValues {
  const fd = new FormData(form);
  return {
    rate: parseDecimal(fd.get("rateAmount") ?? ""),
    unit: fd.get("rateUnit") === "tag" ? "tag" : "stunde",
    workload: parseDecimal(fd.get("workload") ?? ""),
    billing: fd.get("billing") === "lohn" ? "lohn" : "rechnung",
    rateBasis: fd.get("rateBasis") === "kostensatz" ? "kostensatz" : "brutto",
    hoursPerMonth: parseDecimal(fd.get("hoursPerMonth") ?? ""),
    expensesMonthly: parseDecimal(fd.get("expensesMonthly") ?? ""),
  };
}

export function AssignmentForm({
  action,
  values = {},
  companies,
  contacts,
  vacancies,
  settings,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values?: AssignmentValues;
  companies: Choice[];
  contacts: ContactChoice[];
  vacancies: Choice[];
  settings: EarningsSettings;
  cancelHref: string;
  submitLabel: string;
}) {
  const [preview, setPreview] = useState<PreviewValues>({
    rate: values.rateAmount ?? Number.NaN,
    unit: values.rateUnit === "tag" ? "tag" : "stunde",
    workload: values.workload ?? 100,
    billing: values.billing === "lohn" ? "lohn" : "rechnung",
    rateBasis: values.rateBasis === "kostensatz" ? "kostensatz" : "brutto",
    hoursPerMonth: values.hoursPerMonth ?? Number.NaN,
    expensesMonthly: values.expensesMonthly ?? 0,
  });
  const workloadValid = preview.workload >= 1 && preview.workload <= 100;
  const computedHours = workloadValid ? hoursPerYear(preview.workload, settings) / 12 : null;
  const result =
    Number.isFinite(preview.rate) && workloadValid
      ? computeEarnings(
          {
            rate: preview.rate,
            unit: preview.unit,
            workload: preview.workload,
            billing: preview.billing,
            rateBasis: preview.rateBasis,
            hoursPerMonth: Number.isFinite(preview.hoursPerMonth) ? preview.hoursPerMonth : null,
            expensesMonthly: Number.isFinite(preview.expensesMonthly) ? preview.expensesMonthly : 0,
          },
          settings,
        )
      : null;

  const onFormEvent = (e: React.FormEvent<HTMLDivElement>) => {
    const form = (e.target as HTMLInputElement).form;
    if (form) setPreview(readPreview(form));
  };

  return (
    <div onInput={onFormEvent} onChange={onFormEvent}>
      <ActionForm
        action={action}
        submitLabel={submitLabel}
        secondary={
          <LinkButton href={cancelHref} variant="ghost">
            Abbrechen
          </LinkButton>
        }
      >
        <FormSection title="Auftrag">
          <TextField
            name="title"
            label="Rolle"
            required
            defaultValue={values.title}
            className="sm:col-span-2"
            hint="Wie im Vertrag, z. B. Business Analyst SAP S/4HANA."
          />
          <SelectField name="status" label="Status" options={assignmentStatuses} defaultValue={values.status ?? "laufend"} />
          <SelectField
            name="mandateId"
            label="Aus Vakanz"
            options={vacancies}
            emptyLabel="– keine –"
            defaultValue={values.mandateId}
            hint="Die Bewerbung, aus der der Auftrag entstanden ist."
          />
          <CompanyContactFields companies={companies} contacts={contacts} defaultCompanyId={values.companyId} defaultContactId={values.contactId} />
          <TextField name="endClient" label="Endkunde" defaultValue={values.endClient} hint="Bei wem du arbeitest, wenn der Vertrag über einen Vermittler läuft." />
        </FormSection>

        <FormSection title="Zeitraum und Ort" columns={3}>
          <TextField name="startDate" label="Start" type="date" defaultValue={values.startDate} />
          <TextField name="endDate" label="Ende" type="date" defaultValue={values.endDate} hint="Leer lassen, wenn offen." />
          <TextField name="workload" label="Pensum" required inputMode="numeric" suffix="%" defaultValue={values.workload ?? 100} />
          <TextField name="location" label="Arbeitsort" defaultValue={values.location} className="sm:col-span-2" />
          <SelectField name="remote" label="Remote" options={remoteOptions} emptyLabel="–" defaultValue={values.remote} />
        </FormSection>

        <FormSection title="Satz und Abrechnung" description="Was du pro Stunde oder Tag bekommst und wie.">
          <RadioCards name="billing" label="Abrechnung" options={billingModels} defaultValue={preview.billing} />
          {preview.billing === "lohn" ? (
            <RadioCards name="rateBasis" label="Der Satz ist" options={rateBases} defaultValue={preview.rateBasis} />
          ) : (
            <input type="hidden" name="rateBasis" value={preview.rateBasis} />
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-start gap-3">
            <TextField
              name="rateAmount"
              label={preview.billing !== "lohn" ? "Satz ohne MWST" : preview.rateBasis === "kostensatz" ? "Kostensatz" : "Satz (all-in)"}
              inputMode="decimal"
              suffix="CHF"
              defaultValue={values.rateAmount}
            />
            <SelectField name="rateUnit" label="Einheit" options={rateUnits} defaultValue={values.rateUnit ?? "stunde"} hint="1 Tag = 8.4 Stunden" />
          </div>
          <TextField
            name="hoursPerMonth"
            label="Stunden pro Monat"
            inputMode="decimal"
            defaultValue={values.hoursPerMonth}
            placeholder={computedHours !== null ? String(Math.round(computedHours * 10) / 10) : undefined}
            hint={
              computedHours !== null
                ? `Leer lassen für ${formatHours(computedHours)}: Pensum × 8.4 h × ${workingDaysPerYear(settings)} Arbeitstage ÷ 12.`
                : "Leer lassen, um sie aus dem Pensum zu rechnen."
            }
          />
          <TextField
            name="expensesMonthly"
            label="Eigene Spesen pro Monat"
            inputMode="decimal"
            suffix="CHF"
            defaultValue={values.expensesMonthly || ""}
            hint="Kosten, die dir niemand vergütet, z. B. Reise."
          />
          <div className="rounded-md bg-mist/70 px-4 py-3 text-sm sm:col-span-full" aria-live="polite">
            {result ? (
              <p className="text-ink">
                Mit deinen Annahmen bleiben dir {netTaxNote(result)} ca. <strong className="font-semibold">{formatChf(result.net.month, { round: true })} pro Monat</strong> (
                {formatChf(result.net.year, { round: true })} pro Jahr) von {formatChf(result.revenue.month, { round: true })}.
              </p>
            ) : (
              <p className="text-slate">Mit Satz und Pensum siehst du hier, was dir bleibt.</p>
            )}
          </div>
        </FormSection>

        <FormSection title="Notizen" columns={1}>
          <TextAreaField name="notes" label="Notizen" defaultValue={values.notes} rows={4} hint="Projekt, Team, Rapportierung, Besonderheiten." />
        </FormSection>
      </ActionForm>
    </div>
  );
}
