"use client";

import { useId, useState } from "react";
import { ActionForm, FieldShell, FileField, FormSection, TextAreaField, TextField, useFormState } from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import type { ContractFormOptions, ContractFormValues } from "@/lib/admin/contracts/data";
import type { ActionState } from "@/lib/admin/forms";
import { contractKinds, contractStatuses } from "@/lib/admin/options";
import { cn } from "@/lib/utils";

/**
 * Form of a filed contract. Company, contact, assignment and Rahmenvertrag depend on each
 * other: the contact list and the Rahmenverträge follow the chosen company, and picking an
 * assignment or a Rahmenvertrag fills in an empty company.
 */

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none disabled:bg-mist disabled:text-slate aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

function useError(name: string): string | undefined {
  const { state } = useFormState();
  return state.status === "error" ? state.errors?.[name] : undefined;
}

function Select<V extends string | number>({
  name,
  label,
  required,
  hint,
  value,
  onChange,
  options,
  emptyLabel,
  disabled,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  value: V | null;
  onChange: (value: V | null) => void;
  options: readonly { value: V; label: string }[];
  /** Adds an empty first option with this label. */
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = `${useId()}-${name}`;
  const error = useError(name);
  const numeric = typeof options[0]?.value === "number";
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        value={value === null ? "" : String(value)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : ((numeric ? Number(raw) : raw) as V));
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        className={cn(control, "pr-8")}
      >
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function ContractFields({
  options,
  initial,
  number,
  currentKind,
  file,
}: {
  options: ContractFormOptions;
  initial: ContractFormValues;
  number: { value: string; pending: boolean };
  currentKind?: string;
  file?: { accept: string; maxLabel: string };
}) {
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState(initial.kind);
  const [status, setStatus] = useState(initial.status);
  const [companyId, setCompanyId] = useState(initial.companyId);
  const [contactId, setContactId] = useState(initial.contactId);
  const [assignmentId, setAssignmentId] = useState(initial.assignmentId);
  const [parentId, setParentId] = useState(initial.parentId);

  // Old kinds keep their label on contracts that have them, but are not offered otherwise.
  const kindChoices = contractKinds.filter((k) => !k.legacy || k.value === currentKind);
  const contactChoices = companyId === null ? [] : options.contacts.filter((c) => c.companyId === companyId);
  const frameworkChoices = companyId === null ? options.frameworks : options.frameworks.filter((f) => f.companyId === companyId);
  const firstFramework = (company: number | null) => options.frameworks.find((f) => f.companyId === company && company !== null)?.value ?? null;

  function changeCompany(next: number | null, preferredContact: number | null = null) {
    setCompanyId(next);
    const keep = (id: number | null) => id !== null && options.contacts.some((c) => c.value === id && c.companyId === next);
    setContactId(
      keep(preferredContact) ? preferredContact : keep(contactId) ? contactId : (options.contacts.find((c) => c.companyId === next && c.isSignatory)?.value ?? null),
    );
    // Keep the Rahmenvertrag if it belongs to the new company; an Einzelauftrag gets the company's first one.
    const parentFits = parentId !== null && options.frameworks.find((f) => f.value === parentId)?.companyId === next;
    setParentId(parentFits ? parentId : kind === "einzelauftrag" ? firstFramework(next) : null);
  }

  function changeAssignment(next: number | null) {
    setAssignmentId(next);
    const a = options.assignments.find((x) => x.value === next);
    if (!a) return;
    if (!title.trim()) setTitle(a.title);
    if (companyId === null && a.companyId !== null) changeCompany(a.companyId, a.contactId);
  }

  function changeParent(next: number | null) {
    setParentId(next);
    const p = options.frameworks.find((f) => f.value === next);
    if (p && companyId === null && p.companyId !== null) {
      setCompanyId(p.companyId);
      setContactId(options.contacts.find((c) => c.companyId === p.companyId && c.isSignatory)?.value ?? null);
    }
  }

  function changeKind(next: string | null) {
    setKind(next);
    if (next === "rahmenvertrag") setParentId(null);
    else if (next === "einzelauftrag" && parentId === null) setParentId(firstFramework(companyId));
  }

  return (
    <>
      <FormSection title="Vertrag">
        <TitleField value={title} onChange={setTitle} />
        <Select name="kind" label="Art" required value={kind} onChange={changeKind} options={kindChoices} emptyLabel="Bitte wählen" />
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Nummer</span>
          <p className="flex min-h-10 items-center gap-2 rounded-md border border-dashed border-line px-3 font-mono text-sm text-ink">
            {number.value}
            {number.pending ? <span className="font-sans text-xs text-slate">wird beim Speichern vergeben</span> : null}
          </p>
        </div>
        <Select
          name="status"
          label="Status"
          required
          value={status}
          onChange={(v) => setStatus(v ?? "entwurf")}
          options={contractStatuses}
          hint="In Prüfung: du liest ihn noch. Zur Unterschrift: unterschrieben verschickt oder wartet auf deine Unterschrift."
        />
      </FormSection>

      <FormSection title="Zuordnung" description="Mit wem der Vertrag ist und zu welchem Auftrag er gehört.">
        <Select name="companyId" label="Firma" value={companyId} onChange={(v) => changeCompany(v)} options={options.companies} emptyLabel="Keine Firma" />
        <Select
          name="contactId"
          label="Kontakt"
          value={contactId}
          onChange={setContactId}
          options={contactChoices}
          disabled={companyId === null}
          emptyLabel={companyId === null ? "Zuerst eine Firma wählen" : contactChoices.length ? "Kein Kontakt" : "Diese Firma hat noch keine Kontakte"}
        />
        <Select
          name="assignmentId"
          label="Auftrag"
          value={assignmentId}
          onChange={changeAssignment}
          options={options.assignments}
          emptyLabel={options.assignments.length ? "Kein Auftrag" : "Noch keine Aufträge erfasst"}
          hint="Der Vertrag erscheint dann auch beim Auftrag."
        />
        {kind !== "rahmenvertrag" ? (
          <Select
            name="parentId"
            label="Gehört zum Rahmenvertrag"
            value={parentId}
            onChange={changeParent}
            options={frameworkChoices}
            emptyLabel={frameworkChoices.length ? "Keinem" : companyId === null ? "Noch keine Rahmenverträge" : "Diese Firma hat keinen Rahmenvertrag"}
            hint={companyId === null ? "Die Firma des Rahmenvertrags wird übernommen." : "Nur Rahmenverträge der gewählten Firma."}
          />
        ) : null}
      </FormSection>

      <FormSection title="Laufzeit und Unterschrift">
        <TextField name="validFrom" type="date" label="Gültig ab" defaultValue={initial.validFrom} />
        <TextField name="validUntil" type="date" label="Gültig bis" defaultValue={initial.validUntil} hint="Leer lassen, wenn der Vertrag unbefristet ist." />
        <SignedAtField
          defaultValue={initial.signedAt}
          onDate={(date) => {
            if (date && (status === "entwurf" || status === "versendet")) setStatus("unterzeichnet");
          }}
        />
        <TextField name="noticePeriod" label="Kündigungsfrist" defaultValue={initial.noticePeriod} placeholder="z. B. 1 Monat auf Monatsende" />
      </FormSection>

      {file ? (
        <FormSection title="Datei" columns={1}>
          <FileField
            name="file"
            label="Vertrag als Datei (optional)"
            accept={file.accept}
            hint={`Zum Beispiel das unterzeichnete PDF. PDF, Word, PNG oder JPG, höchstens ${file.maxLabel}. Weitere Dateien kannst du danach hochladen.`}
          />
        </FormSection>
      ) : null}

      <FormSection title="Notizen" columns={1}>
        <TextAreaField name="notes" label="Notizen" defaultValue={initial.notes} rows={4} hint="Was du später wissen willst: Konditionen, Besonderheiten, Verlängerungsoption." />
      </FormSection>
    </>
  );
}

/** Controlled, so choosing an assignment can fill in an empty title. */
function TitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = `${useId()}-title`;
  const error = useError("title");
  return (
    <FieldShell id={id} label="Titel" required error={error} hint="So erscheint der Vertrag in Listen und in der Suche." className="sm:col-span-full">
      <input
        id={id}
        name="title"
        value={value}
        maxLength={200}
        placeholder="z. B. Einzelauftrag Business Analyst, Muster Bank"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        className={control}
      />
    </FieldShell>
  );
}

/** Entering a signing date moves a contract in review or out for signature to "Unterzeichnet". */
function SignedAtField({ defaultValue, onDate }: { defaultValue: string | null; onDate: (date: string) => void }) {
  return (
    <div onChange={(e) => onDate((e.target as HTMLInputElement).value)}>
      <TextField name="signedAt" type="date" label="Unterzeichnet am" defaultValue={defaultValue} hint="Datum der letzten Unterschrift." />
    </div>
  );
}

export function ContractForm({
  action,
  options,
  initial,
  number,
  currentKind,
  file,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: ContractFormOptions;
  initial: ContractFormValues;
  /** The contract number, or the expected one for a new contract (`pending`). */
  number: { value: string; pending: boolean };
  /** Kind of the contract being edited; an old kind stays selectable. */
  currentKind?: string;
  /** Offers a file upload (new contracts). */
  file?: { accept: string; maxLabel: string };
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      pendingLabel={file ? "Wird gespeichert und verschlüsselt …" : undefined}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <ContractFields options={options} initial={initial} number={number} currentKind={currentKind} file={file} />
    </ActionForm>
  );
}
