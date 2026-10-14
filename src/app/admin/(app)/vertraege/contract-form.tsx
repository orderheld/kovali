"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Building2, Sparkles } from "lucide-react";
import { ActionForm, CheckboxField, FieldShell, FormSection, SelectField, TextAreaField, TextField, useFormState } from "@/components/admin/form";
import { LinkButton, Notice } from "@/components/admin/ui";
import type { CommonValues, ContractFormOptions } from "@/lib/admin/contracts/data";
import { suggestTitle } from "@/lib/admin/contracts/titles";
import type { FieldDef, LinkKey, TemplateInfo } from "@/lib/admin/contracts/types";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

/**
 * Form of one contract template: links to company, contact, specialist, mandate and
 * Rahmenvertrag, title and dates, then the template's own fields (posted as d_<name>).
 * The title follows the selections until Ferhat edits it.
 */

const DATA_PREFIX = "d_";

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink shadow-[inset_0_1px_0_rgb(11_23_51/0.03)] transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none disabled:bg-mist disabled:text-slate aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/20";

const linkLabels: Record<LinkKey, string> = {
  company: "Firma",
  contact: "Kontakt",
  candidate: "Fachperson",
  mandate: "Mandat",
  parent: "Rahmenvertrag",
};

type Option = { value: number; label: string };

function useError(name: string): string | undefined {
  const { state } = useFormState();
  return state.status === "error" ? state.errors?.[name] : undefined;
}

function LinkSelect({
  name,
  label,
  required,
  hint,
  value,
  onChange,
  options,
  emptyLabel = "– keine Auswahl –",
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  options: Option[];
  emptyLabel?: string;
}) {
  const id = `${useId()}-${name}`;
  const error = useError(name);
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id}
        name={name}
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        className={cn(control, "pr-8")}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function TitleField({ value, suggestion, auto, onChange, onUseSuggestion }: { value: string; suggestion: string; auto: boolean; onChange: (v: string) => void; onUseSuggestion: () => void }) {
  const id = `${useId()}-title`;
  const error = useError("title");
  return (
    <FieldShell
      id={id}
      label="Titel"
      required
      error={error}
      className="sm:col-span-full"
      hint={
        auto ? (
          "Wird aus den Angaben vorgeschlagen, solange du ihn nicht änderst."
        ) : suggestion && suggestion !== value ? (
          <button type="button" onClick={onUseSuggestion} className="inline-flex items-center gap-1 text-blue hover:underline">
            <Sparkles aria-hidden className="size-3.5" />
            Vorschlag übernehmen: {suggestion}
          </button>
        ) : undefined
      }
    >
      <input
        id={id}
        name="title"
        value={value}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        className={control}
      />
    </FieldShell>
  );
}

function DataField({ def, value }: { def: FieldDef; value: unknown }) {
  const name = `${DATA_PREFIX}${def.name}`;
  const className = def.wide ? "sm:col-span-full" : undefined;
  const text = value === null || value === undefined ? "" : String(value);
  const common = { name, label: def.label, required: def.required, hint: def.hint, className };
  switch (def.kind) {
    case "text":
      return <TextField {...common} placeholder={def.placeholder} defaultValue={text} />;
    case "textarea":
      return <TextAreaField {...common} placeholder={def.placeholder} rows={def.rows} defaultValue={text} />;
    case "amount":
      return <TextField {...common} placeholder={def.placeholder} inputMode="decimal" defaultValue={text} />;
    case "int":
      return <TextField {...common} placeholder={def.placeholder} inputMode="numeric" suffix={def.suffix} defaultValue={text} />;
    case "date":
      return <TextField {...common} type="date" defaultValue={text} />;
    case "select":
      // An empty choice only where the template allows "not specified".
      return <SelectField {...common} options={def.options} defaultValue={text} emptyLabel={value === null || value === undefined ? "– offen –" : undefined} />;
    case "checkbox":
      return <CheckboxField name={name} label={def.label} hint={def.hint} className={className} defaultChecked={value === true} />;
  }
}

function ContractFields({ template, options, initial, initialData }: { template: TemplateInfo; options: ContractFormOptions; initial: CommonValues; initialData: Record<string, unknown> }) {
  const links = template.links;
  const [companyId, setCompanyId] = useState(initial.companyId);
  const [contactId, setContactId] = useState(initial.contactId);
  const [candidateId, setCandidateId] = useState(initial.candidateId);
  const [mandateId, setMandateId] = useState(initial.mandateId);
  const [parentId, setParentId] = useState(initial.parentId);
  const [title, setTitle] = useState(initial.title);
  const [autoTitle, setAutoTitle] = useState(!initial.title);
  const [data, setData] = useState<Record<string, unknown>>(initialData);

  const parent = options.parents.find((p) => p.value === parentId) ?? null;
  // An Einzelauftrag is made with the client of its Rahmenvertrag.
  const effectiveCompanyId = template.id === "einzelauftrag" ? (parent?.companyId ?? null) : companyId;
  const company = options.companies.find((c) => c.value === effectiveCompanyId) ?? null;
  const candidate = options.candidates.find((c) => c.value === candidateId) ?? null;
  const mandate = options.mandates.find((m) => m.value === mandateId) ?? null;

  const companyChoices = options.companies.filter((c) => !template.companyKinds.length || template.companyKinds.includes(c.kind) || c.value === companyId);
  const contactChoices = options.contacts.filter((c) => c.companyId === effectiveCompanyId || c.value === contactId);

  const suggestion = suggestTitle(template.id, {
    companyName: company?.name,
    candidateName: candidate?.name,
    mandateTitle: mandate?.title,
    parentNumber: parent?.number,
    data,
  });
  const shownTitle = autoTitle ? suggestion : title;

  function pickContactFor(nextCompanyId: number | null) {
    if (links.contact === "hidden") return;
    if (contactId !== null && options.contacts.find((c) => c.value === contactId)?.companyId === nextCompanyId) return;
    const signatory = options.contacts.find((c) => c.companyId === nextCompanyId && c.isSignatory);
    setContactId(signatory?.value ?? null);
  }

  function changeCompany(next: number | null) {
    setCompanyId(next);
    pickContactFor(next);
  }

  function changeCandidate(next: number | null) {
    setCandidateId(next);
    // Subunternehmervertrag: the party is the specialist's own firm.
    const own = options.candidates.find((c) => c.value === next)?.companyId ?? null;
    if (template.id === "subunternehmer") {
      const valid = own !== null && options.companies.some((c) => c.value === own && c.kind === "subunternehmer");
      changeCompany(valid ? own : null);
    }
  }

  function changeMandate(next: number | null) {
    setMandateId(next);
    const m = options.mandates.find((x) => x.value === next);
    const allowed = (id: number) => options.companies.some((c) => c.value === id && (!template.companyKinds.length || template.companyKinds.includes(c.kind)));
    if (m?.companyId && companyId === null && links.company !== "hidden" && template.id !== "subunternehmer" && allowed(m.companyId)) {
      changeCompany(m.companyId);
    }
  }

  function changeParent(next: number | null) {
    setParentId(next);
    pickContactFor(options.parents.find((p) => p.value === next)?.companyId ?? null);
  }

  const label = (key: LinkKey) => template.labels[key] ?? linkLabels[key];
  const hint = (key: LinkKey) => template.hints[key];

  // Subunternehmervertrag without the specialist's own firm: Ferhat's rule is that
  // specialists are only engaged through their own company.
  const ownCompanyId = candidate?.companyId ?? null;
  const ownCompany = ownCompanyId ? options.companies.find((c) => c.value === ownCompanyId) : null;
  const subcontractorNotice =
    template.id === "subunternehmer" && candidate ? (
      !ownCompany ? (
        <Notice tone="amber" icon={Building2} title="Die Fachperson hat keine eigene Firma erfasst" className="sm:col-span-full">
          KOVALI beauftragt Fachpersonen nur über ihre eigene Firma (GmbH, AG oder Einzelfirma). Lege die Firma als Subunternehmer an und ordne sie beim
          Kandidaten zu, dann hier auswählen.
          <span className="mt-2 flex flex-wrap gap-2">
            <LinkButton href="/admin/firmen/neu?art=subunternehmer" size="sm" target="_blank">
              Firma anlegen
            </LinkButton>
            <LinkButton href={`/admin/kandidaten/${candidate.value}`} size="sm" variant="ghost" target="_blank">
              Kandidat öffnen
            </LinkButton>
          </span>
        </Notice>
      ) : ownCompany.kind !== "subunternehmer" ? (
        <Notice tone="amber" icon={Building2} title={`«${ownCompany.label}» ist nicht als Subunternehmer erfasst`} className="sm:col-span-full">
          Ändere die Art der Firma auf «Subunternehmer», damit sie hier gewählt werden kann.{" "}
          <Link href={`/admin/firmen/${ownCompany.value}/bearbeiten`} target="_blank" className="font-medium text-blue hover:underline">
            Firma bearbeiten
          </Link>
        </Notice>
      ) : null
    ) : null;

  return (
    <>
      <FormSection title="Vertragsparteien" description="Die Angaben zu Adresse, Rechtsform und UID stammen aus den verknüpften Firmen und Personen.">
        {links.parent !== "hidden" ? (
          <>
            <LinkSelect
              name="parentId"
              label={label("parent")}
              required={links.parent === "required"}
              hint={hint("parent")}
              value={parentId}
              onChange={changeParent}
              options={options.parents.map((p) => ({ value: p.value, label: `${p.label}${p.status === "unterzeichnet" ? "" : ` (${p.status})`}` }))}
            />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Auftraggeberin</span>
              <p className="flex min-h-10 items-center rounded-md border border-dashed border-line px-3 text-[0.9375rem] text-slate">
                {company ? company.name : "Wird aus dem Rahmenvertrag übernommen"}
              </p>
            </div>
          </>
        ) : null}
        {links.candidate !== "hidden" ? (
          <LinkSelect
            name="candidateId"
            label={label("candidate")}
            required={links.candidate === "required"}
            hint={hint("candidate")}
            value={candidateId}
            onChange={changeCandidate}
            options={options.candidates}
          />
        ) : null}
        {links.company !== "hidden" && template.id !== "einzelauftrag" ? (
          <LinkSelect
            name="companyId"
            label={label("company")}
            required={links.company === "required"}
            hint={hint("company")}
            value={companyId}
            onChange={changeCompany}
            options={companyChoices}
          />
        ) : null}
        {subcontractorNotice}
        {links.contact !== "hidden" ? (
          <LinkSelect
            name="contactId"
            label={label("contact")}
            required={links.contact === "required"}
            hint={hint("contact") ?? (effectiveCompanyId ? "Zeichnungsberechtigte Personen stehen zuoberst." : "Zuerst eine Firma wählen.")}
            value={contactId}
            onChange={setContactId}
            options={contactChoices}
          />
        ) : null}
        {links.mandate !== "hidden" ? (
          <LinkSelect name="mandateId" label={label("mandate")} required={links.mandate === "required"} hint={hint("mandate")} value={mandateId} onChange={changeMandate} options={options.mandates} />
        ) : null}
      </FormSection>

      <FormSection title="Titel und Laufzeit">
        <TitleField
          value={shownTitle}
          suggestion={suggestion}
          auto={autoTitle}
          onChange={(v) => {
            setAutoTitle(false);
            setTitle(v);
          }}
          onUseSuggestion={() => {
            setAutoTitle(true);
            setTitle(suggestion);
          }}
        />
        {template.dates.validFrom ? <TextField name="validFrom" type="date" label={template.dates.validFrom} defaultValue={initial.validFrom} /> : null}
        {template.dates.validUntil ? <TextField name="validUntil" type="date" label={template.dates.validUntil} defaultValue={initial.validUntil} /> : null}
      </FormSection>

      <div
        className="space-y-6"
        onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name?.startsWith(DATA_PREFIX)) setData((d) => ({ ...d, [t.name.slice(DATA_PREFIX.length)]: t.type === "checkbox" ? t.checked : t.value }));
        }}
      >
        {template.sections.map((section) => (
          <FormSection key={section.title} title={section.title} description={section.description} columns={section.columns ?? 2}>
            {section.fields.map((def) => (
              <DataField key={def.name} def={def} value={initialData[def.name]} />
            ))}
          </FormSection>
        ))}
      </div>

      <FormSection title="Intern" columns={1}>
        <TextAreaField name="notes" label="Interne Notizen" defaultValue={initial.notes} rows={3} hint="Erscheinen nicht im Vertrag." />
      </FormSection>
    </>
  );
}

export function ContractForm({
  action,
  template,
  options,
  initial,
  initialData,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  template: TemplateInfo;
  options: ContractFormOptions;
  initial: CommonValues;
  initialData: Record<string, unknown>;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <ContractFields template={template} options={options} initial={initial} initialData={initialData} />
    </ActionForm>
  );
}
