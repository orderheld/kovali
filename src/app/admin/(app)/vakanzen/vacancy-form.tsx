"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, FormSection, SelectField, TagInputField, TextAreaField, TextField } from "@/components/admin/form";
import { LongTextField, type SnippetChoice } from "@/components/admin/long-text-field";
import { LinkButton } from "@/components/admin/ui";
import type { Mandate } from "@/lib/admin/db/schema";
import type { ActionState } from "@/lib/admin/forms";
import { mandateKinds, mandatePriorities, mandateSources, mandateStatuses, rateUnits, remoteOptions } from "@/lib/admin/options";

export interface CompanyChoice {
  value: number;
  label: string;
}

export interface ContactChoice {
  value: number;
  label: string;
  companyId: number;
}

/**
 * After "Neue Firma anlegen" opened the company form in another tab: when Ferhat comes back,
 * the page data is loaded again, so the new company is in the list. Entries in the form stay.
 */
function useRefreshOnReturn() {
  const router = useRouter();
  const waiting = useRef(false);
  useEffect(() => {
    const onReturn = () => {
      if (!waiting.current || document.visibilityState !== "visible") return;
      waiting.current = false;
      router.refresh();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [router]);
  return () => {
    waiting.current = true;
  };
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
  const markWaiting = useRefreshOnReturn();
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
          emptyLabel={companies.length ? "– keine –" : "Noch keine Firma erfasst"}
          defaultValue={defaultCompanyId}
          hint={
            <>
              Vermittler oder Kunde, der die Stelle ausschreibt.{" "}
              <a href="/admin/firmen/neu" target="_blank" rel="noopener" onClick={markWaiting} className="font-medium text-blue hover:underline">
                Neue Firma anlegen
              </a>{" "}
              (neuer Tab, danach steht sie hier zur Wahl)
            </>
          }
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
        hint={companyId ? "Deine Ansprechperson bei dieser Firma." : "Ohne Firma werden alle Kontakte angeboten; die Firma des Kontakts wird übernommen."}
      />
    </>
  );
}

export function VacancyForm({
  action,
  vacancy,
  cancelHref,
  companies,
  contacts,
  snippets,
  skillSuggestions,
  defaultCompanyId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  vacancy?: Mandate;
  cancelHref: string;
  companies: CompanyChoice[];
  contacts: ContactChoice[];
  snippets: SnippetChoice[];
  skillSuggestions: string[];
  defaultCompanyId?: number;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={vacancy ? "Änderungen speichern" : "Vakanz erfassen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <FormSection title="Vakanz" description="Die Stelle und wer sie ausschreibt.">
        <TextField
          name="title"
          label="Titel"
          required
          defaultValue={vacancy?.title}
          placeholder="z. B. Business Analyst SAP S/4HANA"
          className="sm:col-span-2"
        />
        <CompanyContactFields
          companies={companies}
          contacts={contacts}
          defaultCompanyId={vacancy ? vacancy.companyId : defaultCompanyId}
          defaultContactId={vacancy?.contactId}
        />
        <TextField name="url" label="Link zur Ausschreibung" type="url" defaultValue={vacancy?.url} placeholder="https://…" />
        <TextField name="reference" label="Stellen-Nr." defaultValue={vacancy?.reference} hint="Nummer der Ausschreibung beim Vermittler." />
        <TextField name="endClient" label="Endkunde" defaultValue={vacancy?.endClient} placeholder="Falls bekannt, z. B. eine Bank" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="kind" label="Art" required options={mandateKinds} defaultValue={vacancy?.kind ?? "ausschreibung"} />
          <SelectField name="source" label="Quelle" options={mandateSources} emptyLabel="–" defaultValue={vacancy?.source} />
        </div>
      </FormSection>

      <FormSection title="Ausschreibung" description="Was verlangt ist und was es zahlt. Den Text kannst du direkt aus dem Portal einfügen." columns={3}>
        <TextAreaField name="description" label="Beschreibung" defaultValue={vacancy?.description} rows={10} className="sm:col-span-2 lg:col-span-3" />
        <TagInputField
          name="requiredSkills"
          label="Verlangte Kompetenzen"
          defaultValue={vacancy?.requiredSkills}
          suggestions={skillSuggestions}
          hint="Enter oder Komma trennt die Einträge."
          className="sm:col-span-2 lg:col-span-3"
        />
        <TextField name="location" label="Einsatzort" defaultValue={vacancy?.location} placeholder="Zürich, Bern …" />
        <SelectField name="remote" label="Arbeitsmodell" options={remoteOptions} emptyLabel="–" defaultValue={vacancy?.remote} />
        <TextField name="workload" label="Pensum" inputMode="numeric" suffix="%" defaultValue={vacancy?.workload} placeholder="100" />
        <TextField name="startDate" label="Start" type="date" defaultValue={vacancy?.startDate} />
        <TextField name="endDate" label="Ende" type="date" defaultValue={vacancy?.endDate} />
        <TextField name="durationText" label="Dauer" defaultValue={vacancy?.durationText} placeholder="6 Monate, Option auf Verlängerung" />
        <TextField
          name="rateSell"
          label="Satz laut Ausschreibung"
          inputMode="decimal"
          suffix="CHF"
          defaultValue={vacancy?.rateSell}
          hint="Leer lassen, wenn keiner genannt ist."
        />
        <SelectField name="rateUnit" label="Einheit" required options={rateUnits} defaultValue={vacancy?.rateUnit ?? "stunde"} />
        <TextField name="deadline" label="Eingabefrist" type="date" defaultValue={vacancy?.deadline} hint="Bis wann die Bewerbung beim Vermittler sein muss." />
      </FormSection>

      <div id="bewerbung" className="scroll-mt-20">
        <FormSection title="Bewerbung" description="Wo du stehst und was als Nächstes ansteht.">
          <SelectField name="status" label="Status" required options={mandateStatuses} defaultValue={vacancy?.status ?? "neu"} />
          <SelectField name="priority" label="Priorität" required options={mandatePriorities} defaultValue={vacancy?.priority ?? "normal"} />
          <TextField
            name="appliedAt"
            label="Beworben am"
            type="date"
            defaultValue={vacancy?.appliedAt}
            hint="Leer lassen: Beim Wechsel auf «Beworben» wird das heutige Datum eingetragen."
          />
          <div aria-hidden className="hidden sm:block" />
          <TextField name="nextStep" label="Nächster Schritt" defaultValue={vacancy?.nextStep} placeholder="z. B. CV anpassen, bei GHR nachfragen" />
          <TextField name="nextStepAt" label="Bis wann" type="date" defaultValue={vacancy?.nextStepAt} />
          <LongTextField
            name="applicationText"
            label="Bewerbungstext"
            defaultValue={vacancy?.applicationText}
            rows={14}
            snippets={snippets}
            placeholder="Guten Tag … Gerne bewerbe ich mich für die Stelle als …"
            hint="Der Text, den du mitschickst. Auf der Vakanz kopierst du ihn mit einem Klick."
            className="sm:col-span-2"
          />
        </FormSection>
      </div>

      <FormSection title="Notizen" columns={1}>
        <TextAreaField name="notes" label="Interne Notizen" defaultValue={vacancy?.notes} rows={4} hint="Konditionen, Eindrücke, Fragen für das Interview." />
      </FormSection>
    </ActionForm>
  );
}
