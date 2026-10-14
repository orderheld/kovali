"use client";

import { ActionForm, FormSection, MultiChoiceField, SelectField, TagInputField, TextAreaField, TextField } from "@/components/admin/form";
import { LinkButton } from "@/components/admin/ui";
import type { Candidate, EducationEntry, ExperienceEntry, LanguageSkill } from "@/lib/admin/db/schema";
import { formatMonthRange, todayIso } from "@/lib/admin/format";
import type { ActionState } from "@/lib/admin/forms";
import {
  candidateSources,
  candidateStatuses,
  disciplines,
  engagements,
  labelOf,
  languageLevels,
  rateUnits,
  remoteOptions,
  seniorities,
  workPermits,
} from "@/lib/admin/options";
import { skillGroups, skillSuggestions } from "@/lib/admin/skills";
import { RepeatableField, RowSelect, RowTags, RowText, RowTextArea } from "./repeatable";
import { RETENTION_RULE_HINT } from "./rules";

const sapSuggestions = skillSuggestions.filter((s) => skillGroups[s] === "SAP");

const certificationSuggestions = [
  "IREB CPRE Foundation Level",
  "IREB CPRE Advanced Level",
  "IIBA CBAP",
  "ISTQB Certified Tester Foundation Level",
  "ISTQB Advanced Level Test Manager",
  "PRINCE2 Foundation",
  "PRINCE2 Practitioner",
  "PMP",
  "HERMES 2022 Foundation",
  "Professional Scrum Master I (PSM I)",
  "Professional Scrum Product Owner I (PSPO I)",
  "SAFe Agilist",
  "ITIL 4 Foundation",
  "SAP Certified Associate",
];

const languageSuggestions = [
  "Deutsch",
  "Englisch",
  "Französisch",
  "Italienisch",
  "Rätoromanisch",
  "Spanisch",
  "Portugiesisch",
  "Niederländisch",
  "Polnisch",
  "Türkisch",
  "Albanisch",
  "Serbisch",
  "Kroatisch",
  "Russisch",
  "Ukrainisch",
  "Arabisch",
  "Hindi",
  "Chinesisch",
];

const ratingOptions = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${"★".repeat(n)}${"☆".repeat(5 - n)}  ${n} von 5` }));

/** Profiles are only passed on through the candidate's own firm, not into employment (for now). */
const engagementChoices = engagements.map((o) => (o.value === "anstellung" ? { ...o, label: `${o.label} (derzeit keine Vermittlung)` } : o));

const SKILLS_LIST = "kandidat-kompetenzen";
const LANGUAGES_LIST = "kandidat-sprachen";

/** Timestamps (consent, privacy notice) are edited as calendar days in Zurich. */
function dateValue(value: Date | null | undefined): string | undefined {
  return value ? todayIso(value) : undefined;
}

export function CandidateForm({
  action,
  candidate,
  cancelHref,
  companyChoices,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  candidate?: Candidate;
  cancelHref: string;
  /** The candidate's own firm (subcontractor), from companyOptions(). */
  companyChoices: { value: number; label: string }[];
}) {
  const c = candidate;
  return (
    <ActionForm
      action={action}
      submitLabel={c ? "Änderungen speichern" : "Kandidat anlegen"}
      secondary={
        <LinkButton href={cancelHref} variant="ghost">
          Abbrechen
        </LinkButton>
      }
    >
      <datalist id={SKILLS_LIST}>
        {skillSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id={LANGUAGES_LIST}>
        {languageSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <FormSection title="Stammdaten" columns={3} description="Kontaktdaten erscheinen nie in einem Dossier.">
        <TextField name="firstName" label="Vorname" required defaultValue={c?.firstName} autoComplete="off" />
        <TextField name="lastName" label="Nachname" required defaultValue={c?.lastName} autoComplete="off" />
        <TextField name="dateOfBirth" label="Geburtsdatum" type="date" defaultValue={c?.dateOfBirth} />
        <TextField name="email" label="E-Mail" type="email" defaultValue={c?.email} autoComplete="off" />
        <TextField name="phone" label="Telefon" type="tel" defaultValue={c?.phone} autoComplete="off" />
        <TextField name="nationality" label="Nationalität" defaultValue={c?.nationality} placeholder="Schweiz, Deutschland …" />
        <TextField name="street" label="Strasse und Nr." defaultValue={c?.street} className="sm:col-span-2 lg:col-span-3" autoComplete="off" />
        <TextField name="postalCode" label="PLZ" defaultValue={c?.postalCode} />
        <TextField name="city" label="Ort" defaultValue={c?.city} />
        <TextField name="country" label="Land" required defaultValue={c?.country ?? "Schweiz"} />
        <SelectField
          name="workPermit"
          label="Arbeitsbewilligung"
          options={workPermits}
          emptyLabel="–"
          defaultValue={c?.workPermit}
          hint="Nur intern, erscheint nicht im Dossier."
        />
      </FormSection>

      <FormSection title="Profil">
        <TextField
          name="headline"
          label="Kurztitel"
          defaultValue={c?.headline}
          placeholder="Senior Business Analyst Zahlungsverkehr"
          hint="Erscheint in Listen und im Dossier unter dem Namen."
          className="sm:col-span-2"
        />
        <TextAreaField
          name="summary"
          label="Kurzprofil"
          defaultValue={c?.summary}
          rows={5}
          hint="Für das Dossier. Ohne Namen schreiben (im anonymisierten Dossier wird er durch die Profilnummer ersetzt) und ohne besonders schützenswerte Daten wie Gesundheit oder Religion."
          className="sm:col-span-2"
        />
        <MultiChoiceField name="disciplines" label="Schwerpunkte" options={disciplines} defaultValue={c?.disciplines ?? []} className="sm:col-span-2" />
        <SelectField name="seniority" label="Seniorität" options={seniorities} emptyLabel="–" defaultValue={c?.seniority} />
        <div aria-hidden className="hidden sm:block" />
        <TagInputField
          name="skills"
          label="Kompetenzen"
          defaultValue={c?.skills ?? []}
          suggestions={skillSuggestions}
          hint="Bekannte Schreibweisen werden vereinheitlicht, z. B. «S4HANA» zu «SAP S/4HANA»."
          className="sm:col-span-2"
        />
        <TagInputField name="sapModules" label="SAP-Module" defaultValue={c?.sapModules ?? []} suggestions={sapSuggestions} className="sm:col-span-2" />
        <TagInputField
          name="certifications"
          label="Zertifikate"
          defaultValue={c?.certifications ?? []}
          suggestions={certificationSuggestions}
          placeholder="z. B. IREB CPRE Foundation Level"
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Sprachen" columns={1}>
        <RepeatableField<LanguageSkill>
          name="languages"
          label="Sprachen"
          defaultValue={c?.languages ?? []}
          emptyItem={() => ({ language: "", level: "" })}
          addLabel="Sprache hinzufügen"
          emptyText="Noch keine Sprachen erfasst."
          itemTitle={(l) => (l.language ? `${l.language}${l.level ? ` · ${labelOf(languageLevels, l.level)}` : ""}` : "Neue Sprache")}
          renderItem={(l, set, id) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <RowText id={`${id}-language`} label="Sprache" required value={l.language} onChange={(language) => set({ language })} list={LANGUAGES_LIST} />
              <RowSelect id={`${id}-level`} label="Niveau" required value={l.level} onChange={(level) => set({ level })} options={languageLevels} emptyLabel="Bitte wählen" />
            </div>
          )}
        />
      </FormSection>

      <FormSection title="Ausbildung" columns={1}>
        <RepeatableField<EducationEntry>
          name="education"
          label="Ausbildung"
          defaultValue={c?.education ?? []}
          emptyItem={() => ({ title: "", institution: "", year: "" })}
          addLabel="Ausbildung hinzufügen"
          emptyText="Noch keine Ausbildung erfasst."
          itemTitle={(e) => [e.title, e.year].filter(Boolean).join(" · ") || "Neue Ausbildung"}
          renderItem={(e, set, id) => (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
              <RowText id={`${id}-title`} label="Abschluss" required value={e.title} onChange={(title) => set({ title })} placeholder="MSc Wirtschaftsinformatik" />
              <RowText id={`${id}-institution`} label="Schule / Hochschule" value={e.institution} onChange={(institution) => set({ institution })} placeholder="ZHAW" />
              <RowText id={`${id}-year`} label="Jahr" value={e.year} onChange={(year) => set({ year })} placeholder="2015" />
            </div>
          )}
        />
      </FormSection>

      <FormSection
        title="Werdegang und Projekte"
        columns={1}
        description="Neueste Stelle zuerst; beim Speichern wird nach Datum sortiert. Den Kunden so angeben, wie er im anonymen Profil stehen darf."
      >
        <RepeatableField<ExperienceEntry>
          name="experience"
          label="Werdegang"
          defaultValue={c?.experience ?? []}
          emptyItem={() => ({ role: "", client: "", industry: "", from: "", to: "", description: "", technologies: [] })}
          addLabel="Station hinzufügen"
          emptyText="Noch keine Stationen erfasst."
          itemTitle={(e) => (e.role ? `${e.role}${e.from ? ` · ${formatMonthRange(e.from, e.to)}` : ""}` : "Neue Station")}
          renderItem={(e, set, id) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <RowText id={`${id}-role`} label="Rolle" required value={e.role} onChange={(role) => set({ role })} placeholder="Business Analyst" />
              <RowText
                id={`${id}-client`}
                label="Kunde (wie im anonymen Profil)"
                value={e.client}
                onChange={(client) => set({ client })}
                placeholder="Grossbank, Zürich"
              />
              <RowText id={`${id}-industry`} label="Branche" value={e.industry} onChange={(industry) => set({ industry })} placeholder="Banking" />
              {/* Container query: month inputs need about 150 px each, side by side only when the row is wide enough. */}
              <div className="@container">
                <div className="grid gap-3 @xs:grid-cols-2">
                  <RowText id={`${id}-from`} label="Von" type="month" required value={e.from} onChange={(from) => set({ from })} placeholder="2021-03" />
                  <RowText id={`${id}-to`} label="Bis" type="month" value={e.to} onChange={(to) => set({ to })} placeholder="2024-12" hint="Leer lassen, wenn die Stelle andauert." />
                </div>
              </div>
              <RowTextArea
                id={`${id}-description`}
                label="Aufgaben und Ergebnisse"
                value={e.description}
                onChange={(description) => set({ description })}
                rows={3}
                className="sm:col-span-2"
              />
              <RowTags
                id={`${id}-technologies`}
                label="Methoden und Technologien"
                value={e.technologies ?? []}
                onChange={(technologies) => set({ technologies })}
                suggestionsId={SKILLS_LIST}
                className="sm:col-span-2"
              />
            </div>
          )}
        />
      </FormSection>

      <FormSection title="Verfügbarkeit und Konditionen" columns={3}>
        <SelectField
          name="engagement"
          label="Einsatzform"
          required
          options={engagementChoices}
          defaultValue={c?.engagement ?? "offen"}
          hint="KOVALI schlägt Profile nur über die eigene Firma der Fachperson vor."
        />
        <SelectField
          name="companyId"
          label="Eigene Firma"
          options={companyChoices}
          emptyLabel="Keine"
          defaultValue={c?.companyId}
          hint={
            <>
              Nur Firmen der Art «Subunternehmer»; ohne eigene Firma kann das Profil nicht vorgeschlagen werden.{" "}
              <a href="/admin/firmen/neu?art=subunternehmer" target="_blank" rel="noopener" className="text-blue hover:underline">
                Firma anlegen
              </a>
            </>
          }
        />
        <TextField name="availableFrom" label="Verfügbar ab" type="date" defaultValue={c?.availableFrom} />
        <TextField name="workloadMin" label="Pensum von" type="number" inputMode="numeric" min={0} max={100} step={10} suffix="%" defaultValue={c?.workloadMin} />
        <TextField name="workloadMax" label="Pensum bis" type="number" inputMode="numeric" min={0} max={100} step={10} suffix="%" defaultValue={c?.workloadMax} />
        <TextField name="noticePeriod" label="Kündigungsfrist" defaultValue={c?.noticePeriod} placeholder="3 Monate, sofort …" />
        <TextField
          name="rateAmount"
          label="Satzvorstellung"
          inputMode="decimal"
          suffix="CHF"
          defaultValue={c?.rateAmount}
          hint="Was die Fachperson erhalten möchte. Erscheint nie im Dossier."
        />
        <SelectField name="rateUnit" label="Einheit" options={rateUnits} emptyLabel="–" defaultValue={c?.rateUnit ?? "stunde"} />
        <TextField
          name="salaryExpectation"
          label="Lohnvorstellung pro Jahr"
          inputMode="numeric"
          suffix="CHF"
          defaultValue={c?.salaryExpectation}
          hint="Bei Anstellung, brutto."
        />
        <SelectField name="remote" label="Arbeitsmodell" options={remoteOptions} emptyLabel="–" defaultValue={c?.remote} />
        <TextField name="regions" label="Regionen" defaultValue={c?.regions} placeholder="Zürich, Bern, Basel" hint="Erscheint im Dossier." className="sm:col-span-1 lg:col-span-2" />
      </FormSection>

      <FormSection title="Herkunft und Status" columns={3}>
        <SelectField
          name="source"
          label="Herkunft der Daten"
          required
          options={candidateSources}
          emptyLabel="Bitte wählen"
          defaultValue={c?.source}
          hint="Woher das Profil stammt; nötig für Auskunftsbegehren nach DSG."
        />
        <SelectField name="status" label="Status" required options={candidateStatuses} defaultValue={c?.status ?? "neu"} />
        <SelectField name="rating" label="Bewertung" options={ratingOptions} emptyLabel="Keine Bewertung" defaultValue={c?.rating} />
        <TextAreaField
          name="notes"
          label="Interne Notizen"
          defaultValue={c?.notes}
          rows={4}
          hint="Nur für dich, erscheint nie im Dossier. Keine besonders schützenswerten Daten (Gesundheit, Religion, Strafregister …)."
          className="sm:col-span-2 lg:col-span-3"
        />
      </FormSection>

      <FormSection
        title="Datenschutz"
        description="Einwilligung zur Speicherung des Profils. Die Einwilligung für ein bestimmtes Mandat wird beim Vorschlag erfasst."
      >
        <TextField name="consentAt" label="Einwilligung erteilt am" type="date" defaultValue={dateValue(c?.consentAt)} />
        <TextField
          name="consentNote"
          label="Wie erteilt oder widerrufen"
          defaultValue={c?.consentNote}
          placeholder="z. B. E-Mail vom 13.10.2026"
          hint="Bei Widerruf das Feld «Einwilligung erteilt am» leeren und hier vermerken, z. B. «Widerrufen per E-Mail vom 20.10.2026». Einen Widerspruch gegen jede Weitergabe erfasst du auf der Kandidatenseite unter Datenschutz."
        />
        <TextField
          name="privacyInfoAt"
          label="Datenschutzinformation zugestellt am"
          type="date"
          defaultValue={dateValue(c?.privacyInfoAt)}
        />
        <TextField name="retentionUntil" label="Aufbewahren bis" type="date" defaultValue={c?.retentionUntil} hint={RETENTION_RULE_HINT} />
      </FormSection>
    </ActionForm>
  );
}
