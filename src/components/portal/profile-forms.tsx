"use client";

import Link from "next/link";
import { ActionForm, MultiChoiceField, SelectField, TagInputField, TextAreaField, TextField } from "@/components/admin/form";
import { buttonClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { disciplines, rateUnits, remoteOptions } from "@/lib/admin/options";
import { EducationEditor, ExperienceEditor, LanguagesEditor, type EducationInput, type ExperienceInput, type LanguageInput } from "./editors";

/**
 * The edit form of one profile card. Values come from the server (pending values when a
 * change is open, otherwise the confirmed ones); the Server Action validates everything again
 * and saves the complete section as a change request.
 */

type PortalCard = "profil" | "firma" | "kompetenzen" | "werdegang" | "ausbildung" | "sprachen" | "verfuegbarkeit";

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const objects = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

const legalFormOptions = [
  { value: "GmbH", label: "GmbH" },
  { value: "AG", label: "AG" },
];

function Group({ title, description, children }: { title?: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title ? (
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function CardFields({ card, values, suggestions }: { card: PortalCard; values: Record<string, unknown>; suggestions: { skills: string[]; sap: string[] } }) {
  switch (card) {
    case "profil":
      return (
        <Group>
          <TextField
            name="headline"
            label="Titel"
            defaultValue={str(values.headline)}
            hint="Ihre Rolle in einer Zeile, z. B. «Senior Business Analyst, Banking»."
          />
          <TextAreaField
            name="summary"
            label="Kurzprofil"
            rows={8}
            maxLength={4000}
            defaultValue={str(values.summary)}
            hint="Einige Sätze zu Ihren Schwerpunkten, Branchen und der Art von Projekten, die Sie suchen."
          />
        </Group>
      );
    case "firma": {
      const firm = (values.firm ?? {}) as Record<string, unknown>;
      return (
        <Group description="KOVALI schliesst Projektverträge mit Ihrer Firma ab. Die Angaben finden Sie im Handelsregister (zefix.ch) oder im UID-Register (uid.admin.ch).">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="firm.name" label="Name der Firma" required defaultValue={str(firm.name)} autoComplete="organization" className="sm:col-span-2" />
            <SelectField name="firm.legalForm" label="Rechtsform" required defaultValue={str(firm.legalForm)} options={legalFormOptions} emptyLabel="Bitte wählen" />
            <TextField name="firm.uid" label="UID" required defaultValue={str(firm.uid)} placeholder="CHE-123.456.789" hint="Unternehmens-Identifikationsnummer" />
            <TextField name="firm.street" label="Strasse und Nummer" required defaultValue={str(firm.street)} autoComplete="street-address" className="sm:col-span-2" />
            <TextField name="firm.postalCode" label="PLZ" required defaultValue={str(firm.postalCode)} autoComplete="postal-code" inputMode="numeric" />
            <TextField name="firm.city" label="Ort" required defaultValue={str(firm.city)} autoComplete="address-level2" />
            <TextField name="firm.country" label="Land" defaultValue={str(firm.country) || "Schweiz"} autoComplete="country-name" />
          </div>
        </Group>
      );
    }
    case "kompetenzen":
      return (
        <Group>
          <MultiChoiceField name="disciplines" label="Schwerpunkte" options={disciplines} defaultValue={list(values.disciplines)} hint="Wählen Sie alle, die auf Sie zutreffen." />
          <TagInputField
            name="skills"
            label="Kompetenzen und Tools"
            defaultValue={list(values.skills)}
            suggestions={suggestions.skills}
            hint="Enter oder Komma fügt einen Eintrag hinzu, z. B. BPMN, Jira, Scrum."
          />
          <TagInputField name="sapModules" label="SAP-Module" defaultValue={list(values.sapModules)} suggestions={suggestions.sap} hint="Nur falls zutreffend, z. B. SAP FI, SAP CO." />
          <TagInputField
            name="certifications"
            label="Zertifikate"
            defaultValue={list(values.certifications)}
            placeholder="z. B. IREB CPRE Foundation Level"
            hint="Den Nachweis können Sie unter Dokumente hochladen."
          />
        </Group>
      );
    case "werdegang":
      return (
        <ExperienceEditor
          name="experience"
          initial={objects(values.experience).map(
            (e): ExperienceInput => ({
              role: str(e.role),
              client: str(e.client),
              industry: str(e.industry),
              from: str(e.from),
              to: str(e.to),
              description: str(e.description),
              technologies: list(e.technologies),
            }),
          )}
        />
      );
    case "ausbildung":
      return (
        <EducationEditor
          name="education"
          initial={objects(values.education).map((e): EducationInput => ({ title: str(e.title), institution: str(e.institution), year: str(e.year) }))}
        />
      );
    case "sprachen":
      return <LanguagesEditor name="languages" initial={objects(values.languages).map((e): LanguageInput => ({ language: str(e.language), level: str(e.level) }))} />;
    case "verfuegbarkeit":
      return (
        <div className="space-y-6">
          <Group title="Verfügbarkeit">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="availableFrom" label="Verfügbar ab" type="date" defaultValue={str(values.availableFrom)} className="sm:col-span-2" />
              <TextField name="workloadMin" label="Pensum minimal" type="number" min={0} max={100} step={10} suffix="%" inputMode="numeric" defaultValue={str(values.workloadMin)} />
              <TextField name="workloadMax" label="Pensum maximal" type="number" min={0} max={100} step={10} suffix="%" inputMode="numeric" defaultValue={str(values.workloadMax)} />
              <TextField name="noticePeriod" label="Kündigungsfrist im aktuellen Einsatz" defaultValue={str(values.noticePeriod)} placeholder="z. B. 1 Monat" />
              <SelectField name="remote" label="Arbeitsmodell" defaultValue={str(values.remote)} options={remoteOptions} emptyLabel="Keine Angabe" />
              <TextField name="regions" label="Regionen" defaultValue={str(values.regions)} placeholder="z. B. Zürich, Bern, Basel" className="sm:col-span-2" />
            </div>
          </Group>
          <Group title="Satzvorstellung" description="Der Betrag, den Ihre Firma KOVALI in Rechnung stellt, exklusive MWST. Lohn, AHV und Versicherungen zahlt Ihre Firma.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="rateAmount" label="Betrag" inputMode="decimal" suffix="CHF" defaultValue={str(values.rateAmount)} placeholder="z. B. 120" />
              <SelectField name="rateUnit" label="Einheit" defaultValue={str(values.rateUnit) || "stunde"} options={rateUnits} />
            </div>
          </Group>
        </div>
      );
  }
}

export function CardForm({
  card,
  values,
  message,
  action,
  cancelHref,
  suggestions,
}: {
  card: PortalCard;
  values: Record<string, unknown>;
  message: string | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  suggestions: { skills: string[]; sap: string[] };
}) {
  return (
    <ActionForm
      action={action}
      submitLabel="Zur Prüfung senden"
      pendingLabel="Wird gesendet …"
      secondary={
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Abbrechen
        </Link>
      }
    >
      <CardFields card={card} values={values} suggestions={suggestions} />
      <TextAreaField
        name="message"
        label="Bemerkung an KOVALI (optional)"
        rows={3}
        maxLength={2000}
        defaultValue={message}
        hint="Zum Beispiel, was sich geändert hat."
      />
    </ActionForm>
  );
}
