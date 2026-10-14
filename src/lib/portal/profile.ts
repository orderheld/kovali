import { z } from "zod";
import type { Candidate, EducationEntry, ExperienceEntry, LanguageSkill } from "@/lib/admin/db/schema";
import { dedupe, f } from "@/lib/admin/forms";
import { formatChf, formatDate, formatMonthRange } from "@/lib/admin/format";
import { disciplines, labelOf, languageLevels, rateUnits, remoteOptions, valuesOf } from "@/lib/admin/options";
import { normalizeSkills } from "@/lib/admin/skills";

/**
 * The parts of a candidate profile a candidate edits in the portal. Each section is saved as
 * a change request whose payload holds the complete new values of the section; Ferhat's
 * confirmation copies them to the candidate record. The same Zod schemas validate the form
 * (portal), the stored payload (again, when Ferhat confirms) and normalise both sides of the
 * comparison. Pure functions without database access, so they are unit-tested.
 */

export const editableSections = ["profil", "kompetenzen", "werdegang", "ausbildung", "sprachen", "verfuegbarkeit"] as const;
export type EditableSection = (typeof editableSections)[number];
export type ChangeSection = EditableSection | "stammdaten";

export function isEditableSection(value: unknown): value is EditableSection {
  return typeof value === "string" && (editableSections as readonly string[]).includes(value);
}

/** Titles shown in the portal (the admin uses changeSections from options.ts). */
export const sectionTitles: Record<ChangeSection, string> = {
  profil: "Profil",
  kompetenzen: "Kompetenzen",
  werdegang: "Werdegang",
  ausbildung: "Ausbildung",
  sprachen: "Sprachen",
  verfuegbarkeit: "Verfügbarkeit und Konditionen",
  stammdaten: "Stammdaten",
};

/** Candidate columns each section writes. Nothing else can be changed through a request. */
export const sectionFields = {
  profil: ["headline", "summary"],
  kompetenzen: ["disciplines", "skills", "sapModules", "certifications"],
  werdegang: ["experience"],
  ausbildung: ["education"],
  sprachen: ["languages"],
  verfuegbarkeit: ["availableFrom", "workloadMin", "workloadMax", "rateAmount", "rateUnit", "remote", "regions", "noticePeriod"],
} as const satisfies Record<EditableSection, readonly (keyof Candidate)[]>;

type SectionField = (typeof sectionFields)[EditableSection][number];

/** The candidate's firm as stored in the linked company (companies, kind "subunternehmer"). */
export interface FirmSource {
  name: string;
  legalForm: string | null;
  uid: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
}

export type ProfileSource = Pick<Candidate, SectionField> & { firm: FirmSource | null };

/**
 * What the portal shows as separate cards. "firma" has no section of its own in the database
 * (the check constraint of change_requests.section has no such value), so the firm travels in
 * the payload of the "verfuegbarkeit" request (Verfügbarkeit und Konditionen) as `firm`.
 */
export const portalCards = ["profil", "firma", "kompetenzen", "werdegang", "ausbildung", "sprachen", "verfuegbarkeit"] as const;
export type PortalCard = (typeof portalCards)[number];

export function isPortalCard(value: unknown): value is PortalCard {
  return typeof value === "string" && (portalCards as readonly string[]).includes(value);
}

export function cardSection(card: PortalCard): EditableSection {
  return card === "firma" ? "verfuegbarkeit" : card;
}

export const cardTitles: Record<PortalCard, string> = {
  profil: "Profil",
  firma: "Meine Firma",
  kompetenzen: "Kompetenzen",
  werdegang: "Werdegang",
  ausbildung: "Ausbildung",
  sprachen: "Sprachen",
  verfuegbarkeit: "Verfügbarkeit und Konditionen",
};

// --- Field helpers -------------------------------------------------------------

const reqText = (max: number, message: string) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ error: message }).min(1, message).max(max, `Höchstens ${max} Zeichen.`));

const optStr = (max: number) =>
  z.preprocess((v) => (v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : v), z.string().max(max, `Höchstens ${max} Zeichen.`));

/** Accepts 2021-03, 03.2021, 3.2021 and 3/2021; returns YYYY-MM. */
export function normalizeMonth(value: string): string {
  const v = value.trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(v);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{1,2})\s*[./-]\s*(\d{4})$/.exec(v);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return v;
}

const MONTH = /^(19[5-9]\d|20\d\d)-(0[1-9]|1[0-2])$/;

const monthField = (message: string) =>
  z.preprocess((v) => (typeof v === "string" ? normalizeMonth(v) : v), z.string({ error: message }).regex(MONTH, message));

const optMonthField = () =>
  z.preprocess(
    (v) => (v === null || v === undefined ? "" : typeof v === "string" ? normalizeMonth(v) : v),
    z.union([z.literal(""), z.string().regex(MONTH, "Bitte Monat und Jahr angeben, z. B. 03.2021.")], {
      error: "Bitte Monat und Jahr angeben, z. B. 03.2021.",
    }),
  );

// --- Repeatable entries ----------------------------------------------------------

export const experienceItemSchema = z
  .object({
    role: reqText(160, "Bitte die Funktion oder Rolle angeben."),
    client: optStr(160),
    industry: optStr(120),
    from: monthField("Bitte den Beginn angeben (Monat und Jahr, z. B. 03.2021)."),
    to: optMonthField(),
    description: optStr(4000),
    technologies: f.stringList(40, 80),
  })
  .refine((e) => !e.to || e.to >= e.from, { message: "Das Ende liegt vor dem Beginn.", path: ["to"] });

export const educationItemSchema = z.object({
  title: reqText(200, "Bitte den Abschluss oder die Ausbildung angeben."),
  institution: optStr(200),
  year: optStr(20),
});

export const languageItemSchema = z.object({
  language: reqText(60, "Bitte die Sprache angeben."),
  level: z.enum(valuesOf(languageLevels), { error: "Bitte das Niveau wählen." }),
});

/** Current and most recent assignments first, as in a CV. */
export function sortExperience(list: ExperienceEntry[]): ExperienceEntry[] {
  const end = (e: ExperienceEntry) => e.to || "9999-99";
  return [...list].sort((a, b) => end(b).localeCompare(end(a)) || b.from.localeCompare(a.from));
}

// --- Firm ---------------------------------------------------------------------------

/** Ferhat works with specialists through their own GmbH or AG only (decision of 13.10.2026). */
export const firmLegalForms = ["GmbH", "AG"] as const;

/** UID as CHE-123.456.789; nine digits in any format are accepted. */
export function normalizeUid(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}` : value.trim();
}

export const firmSchema = z.object({
  name: reqText(160, "Bitte den Namen der Firma angeben."),
  legalForm: z.enum(firmLegalForms, { error: "Bitte GmbH oder AG wählen." }),
  uid: z.preprocess(
    (v) => (typeof v === "string" ? normalizeUid(v) : v),
    z.string({ error: "Bitte die UID angeben, z. B. CHE-123.456.789." }).regex(/^CHE-\d{3}\.\d{3}\.\d{3}$/, "Bitte die UID im Format CHE-123.456.789 angeben."),
  ),
  street: reqText(160, "Bitte Strasse und Nummer angeben."),
  postalCode: reqText(12, "Bitte die PLZ angeben."),
  city: reqText(80, "Bitte den Ort angeben."),
  country: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : "Schweiz"), z.string().max(80, "Höchstens 80 Zeichen.")),
});

export type FirmValues = z.output<typeof firmSchema>;

/** A stored company in the shape of the firm form (legal forms written out are mapped to GmbH/AG). */
export function firmFromSource(source: FirmSource | null): FirmValues | FirmSource | null {
  if (!source) return null;
  const form = source.legalForm ?? "";
  const legalForm = /gmbh|beschränkter haftung/i.test(form) ? "GmbH" : /aktiengesellschaft|^ag$|\sag$/i.test(form) ? "AG" : source.legalForm;
  const raw = { ...source, legalForm };
  const parsed = firmSchema.safeParse(raw);
  return parsed.success ? parsed.data : raw;
}

export function formatFirmAddress(firm: Pick<FirmSource, "street" | "postalCode" | "city" | "country"> | null | undefined): string {
  if (!firm) return "–";
  const line = [firm.street, [firm.postalCode, firm.city].filter(Boolean).join(" "), firm.country && firm.country !== "Schweiz" ? firm.country : null]
    .filter(Boolean)
    .join(", ");
  return line || "–";
}

// --- Section schemas -------------------------------------------------------------

export const sectionSchemas = {
  profil: z.object({
    headline: f.optText(160),
    summary: f.optText(4000),
  }),
  kompetenzen: z.object({
    disciplines: f.stringList(15, 60).pipe(z.array(z.enum(valuesOf(disciplines), { error: "Unbekannter Schwerpunkt." }))),
    skills: f.stringList(80, 80).transform((list) => normalizeSkills(list)),
    sapModules: f.stringList(40, 80).transform((list) => normalizeSkills(list)),
    certifications: f.stringList(40, 160),
  }),
  werdegang: z.object({
    experience: f.jsonList(experienceItemSchema, 40).transform((list) => sortExperience(list)),
  }),
  ausbildung: z.object({
    education: f.jsonList(educationItemSchema, 30),
  }),
  sprachen: z.object({
    languages: f
      .jsonList(languageItemSchema, 15)
      .refine((list) => new Set(list.map((l) => l.language.toLowerCase())).size === list.length, "Bitte jede Sprache nur einmal angeben."),
  }),
  verfuegbarkeit: z
    .object({
      availableFrom: f.optDate(),
      workloadMin: f.optInt(0, 100),
      workloadMax: f.optInt(0, 100),
      rateAmount: f.optAmount(100_000),
      rateUnit: f.optEnum(valuesOf(rateUnits)),
      remote: f.optEnum(valuesOf(remoteOptions)),
      regions: f.optText(300),
      noticePeriod: f.optText(120),
      firm: firmSchema.nullable().default(null),
    })
    .superRefine((v, ctx) => {
      if (v.workloadMin !== null && v.workloadMax !== null && v.workloadMin > v.workloadMax) {
        ctx.addIssue({ code: "custom", path: ["workloadMax"], message: "Das maximale Pensum ist kleiner als das minimale." });
      }
      if (v.rateAmount !== null && !v.rateUnit) {
        ctx.addIssue({ code: "custom", path: ["rateUnit"], message: "Bitte angeben, ob pro Stunde oder pro Tag." });
      }
    })
    // A unit without an amount means nothing; dropping it avoids changes that are none.
    .transform((v) => (v.rateAmount === null ? { ...v, rateUnit: null } : v)),
} satisfies Record<EditableSection, z.ZodType>;

export type SectionValues = { [K in EditableSection]: z.output<(typeof sectionSchemas)[K]> };

export type SectionParse<S extends EditableSection> =
  | { ok: true; data: SectionValues[S] }
  | { ok: false; message: string; errors: Record<string, string> };

/**
 * Validates form input or a stored payload. Errors are keyed by field (the form shows them
 * there); errors inside repeatable entries name the entry ("Eintrag 2: …").
 */
export function parseSection<S extends EditableSection>(section: S, raw: unknown): SectionParse<S> {
  const result = sectionSchemas[section].safeParse(raw);
  if (result.success) return { ok: true, data: result.data as SectionValues[S] };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const first = String(issue.path[0] ?? "_form");
    // Firm fields are separate inputs named firm.name, firm.uid, …
    const key = first === "firm" && typeof issue.path[1] === "string" ? `firm.${issue.path[1]}` : first;
    const index = typeof issue.path[1] === "number" ? issue.path[1] : null;
    errors[key] ??= index !== null ? `Eintrag ${index + 1}: ${issue.message}` : issue.message;
  }
  return { ok: false, message: "Bitte prüfen Sie die markierten Angaben.", errors };
}

/** The confirmed values of a section, normalised like a payload (raw when old data does not fit the schema). */
export function currentValues<S extends EditableSection>(section: S, candidate: ProfileSource): SectionValues[S] {
  const raw: Record<string, unknown> = Object.fromEntries(sectionFields[section].map((key) => [key, candidate[key]]));
  if (section === "verfuegbarkeit") {
    // The firm is checked on its own, so an incomplete company record does not spoil the
    // normalisation of the availability fields.
    const firm = firmFromSource(candidate.firm);
    const parsed = sectionSchemas.verfuegbarkeit.safeParse({ ...raw, firm: null });
    return { ...(parsed.success ? parsed.data : raw), firm } as SectionValues[S];
  }
  const parsed = sectionSchemas[section].safeParse(raw);
  return (parsed.success ? parsed.data : raw) as SectionValues[S];
}

/** The part of a section's values a card edits and shows. */
export function cardValues(card: PortalCard, values: Record<string, unknown>): Record<string, unknown> {
  if (card === "firma") return { firm: values.firm ?? null };
  if (card === "verfuegbarkeit") {
    const rest = { ...values };
    delete rest.firm;
    return rest;
  }
  return values;
}

/**
 * Section values with one card's part taken from `part` and the rest from `base`. The firm
 * card and the availability card share the "verfuegbarkeit" request this way.
 */
export function mergeCard(card: PortalCard, base: Record<string, unknown>, part: Record<string, unknown>): Record<string, unknown> {
  if (card !== "firma" && card !== "verfuegbarkeit") return part;
  return { ...base, ...cardValues(card, part) };
}

/**
 * Candidate columns to write when Ferhat confirms a request. Only the section's own columns
 * are taken, skills are normalised to their canonical names once more.
 */
export function applyValues<S extends EditableSection>(section: S, values: SectionValues[S]): Partial<ProfileSource> {
  const source = values as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of sectionFields[section]) out[key] = source[key] ?? null;
  if (section === "kompetenzen") {
    out.skills = normalizeSkills((out.skills as string[] | null) ?? []);
    out.sapModules = normalizeSkills((out.sapModules as string[] | null) ?? []);
    out.certifications = dedupe((out.certifications as string[] | null) ?? []);
    out.disciplines = (out.disciplines as string[] | null) ?? [];
  }
  if (section === "werdegang") out.experience = (out.experience as ExperienceEntry[] | null) ?? [];
  if (section === "ausbildung") out.education = (out.education as EducationEntry[] | null) ?? [];
  if (section === "sprachen") out.languages = (out.languages as LanguageSkill[] | null) ?? [];
  return out as Partial<ProfileSource>;
}

/** JSON with sorted keys, so equal values compare equal regardless of key order. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function sameValues(a: unknown, b: unknown): boolean {
  return stableJson(a) === stableJson(b);
}

// --- Display ----------------------------------------------------------------------

export function formatWorkload(min: number | null | undefined, max: number | null | undefined): string {
  const lo = min ?? null;
  const hi = max ?? null;
  if (lo === null && hi === null) return "–";
  if (lo !== null && hi !== null) return lo === hi ? `${lo} %` : `${lo}–${hi} %`;
  return lo !== null ? `ab ${lo} %` : `bis ${hi} %`;
}

export function formatRate(amount: number | null | undefined, unit: string | null | undefined): string {
  if (amount === null || amount === undefined) return "–";
  return `${formatChf(amount)} ${unit ? labelOf(rateUnits, unit) : ""}`.trim();
}

export function disciplineLabels(values: readonly string[]): string[] {
  return values.map((v) => labelOf(disciplines, v));
}

export function languageLevelLabel(level: string): string {
  return labelOf(languageLevels, level);
}

function experienceTitle(e: ExperienceEntry): string {
  return e.role || "Ohne Funktion";
}

function experienceSubtitle(e: ExperienceEntry): string {
  return [[e.client, e.industry].filter(Boolean).join(", "), formatMonthRange(e.from, e.to)].filter(Boolean).join(" · ");
}

function educationSubtitle(e: EducationEntry): string {
  return [e.institution, e.year].filter(Boolean).join(", ");
}

// --- Diff ---------------------------------------------------------------------------

export interface FieldChange {
  label: string;
  before: string;
  after: string;
}

export type DiffItem =
  | ({ type: "field" } & FieldChange)
  | { type: "list"; label: string; added: string[]; removed: string[] }
  | { type: "entry"; label: string; change: "added" | "removed" | "changed"; title: string; subtitle: string; fields: FieldChange[] };

const show = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "–" : v);

function fieldChange(label: string, before: string, after: string): FieldChange[] {
  return before === after ? [] : [{ label, before, after }];
}

function listChange(label: string, before: readonly string[], after: readonly string[]): DiffItem[] {
  const b = new Set(before.map((x) => x.toLowerCase()));
  const a = new Set(after.map((x) => x.toLowerCase()));
  const added = after.filter((x) => !b.has(x.toLowerCase()));
  const removed = before.filter((x) => !a.has(x.toLowerCase()));
  return added.length || removed.length ? [{ type: "list", label, added, removed }] : [];
}

/**
 * Pairs entries of two lists, trying the keys in order (exact match first, then looser
 * ones), so an edited entry shows as "changed" instead of "removed" plus "added".
 */
export function matchEntries<T>(before: readonly T[], after: readonly T[], keys: ((e: T) => string)[]) {
  const pairs: [T, T][] = [];
  const restBefore = [...before];
  const restAfter = [...after];
  for (const key of keys) {
    for (let i = 0; i < restBefore.length; ) {
      const k = key(restBefore[i]).toLowerCase();
      const j = restAfter.findIndex((e) => key(e).toLowerCase() === k);
      if (j >= 0) {
        pairs.push([restBefore[i], restAfter[j]]);
        restBefore.splice(i, 1);
        restAfter.splice(j, 1);
      } else {
        i++;
      }
    }
  }
  return { pairs, removed: restBefore, added: restAfter };
}

function entryDiff<T>(
  label: string,
  before: readonly T[],
  after: readonly T[],
  keys: ((e: T) => string)[],
  describe: (e: T) => { title: string; subtitle: string; fields: [string, string][] },
): DiffItem[] {
  const { pairs, removed, added } = matchEntries(before, after, keys);
  const out: DiffItem[] = [];
  for (const [b, a] of pairs) {
    const db = describe(b);
    const da = describe(a);
    const fields = da.fields.flatMap(([fieldLabel, value], i) => fieldChange(fieldLabel, db.fields[i]?.[1] ?? "–", value));
    if (fields.length) out.push({ type: "entry", label, change: "changed", title: da.title, subtitle: da.subtitle, fields });
  }
  for (const a of added) {
    const d = describe(a);
    out.push({ type: "entry", label, change: "added", title: d.title, subtitle: d.subtitle, fields: d.fields.filter(([, v]) => v !== "–").map(([l, v]) => ({ label: l, before: "–", after: v })) });
  }
  for (const b of removed) {
    const d = describe(b);
    out.push({ type: "entry", label, change: "removed", title: d.title, subtitle: d.subtitle, fields: [] });
  }
  return out;
}

function firmChanges(before: FirmValues | FirmSource | null | undefined, after: FirmValues | FirmSource | null | undefined): FieldChange[] {
  return [
    ...fieldChange("Firma", show(before?.name), show(after?.name)),
    ...fieldChange("Rechtsform", show(before?.legalForm), show(after?.legalForm)),
    ...fieldChange("UID", show(before?.uid), show(after?.uid)),
    ...fieldChange("Adresse der Firma", formatFirmAddress(before), formatFirmAddress(after)),
  ];
}

/** Readable differences between the confirmed values and a proposal, for Ferhat's review. */
export function diffSection<S extends EditableSection>(section: S, before: SectionValues[S], after: SectionValues[S]): DiffItem[] {
  switch (section) {
    case "profil": {
      const b = before as SectionValues["profil"];
      const a = after as SectionValues["profil"];
      return [
        ...fieldChange("Berufsbezeichnung", show(b.headline), show(a.headline)),
        ...fieldChange("Kurzprofil", show(b.summary), show(a.summary)),
      ].map((c) => ({ type: "field", ...c }));
    }
    case "kompetenzen": {
      const b = before as SectionValues["kompetenzen"];
      const a = after as SectionValues["kompetenzen"];
      return [
        ...listChange("Schwerpunkte", disciplineLabels(b.disciplines ?? []), disciplineLabels(a.disciplines ?? [])),
        ...listChange("Kompetenzen und Tools", b.skills ?? [], a.skills ?? []),
        ...listChange("SAP-Module", b.sapModules ?? [], a.sapModules ?? []),
        ...listChange("Zertifikate", b.certifications ?? [], a.certifications ?? []),
      ];
    }
    case "werdegang": {
      const b = (before as SectionValues["werdegang"]).experience ?? [];
      const a = (after as SectionValues["werdegang"]).experience ?? [];
      return entryDiff(
        "Werdegang",
        b,
        a,
        [(e) => `${e.role}|${e.client}|${e.from}`, (e) => `${e.client}|${e.from}`, (e) => `${e.role}|${e.from}`, (e) => `${e.role}|${e.client}`],
        (e) => ({
          title: experienceTitle(e),
          subtitle: experienceSubtitle(e),
          fields: [
            ["Funktion", show(e.role)],
            ["Kunde oder Firma", show(e.client)],
            ["Branche", show(e.industry)],
            ["Zeitraum", show(formatMonthRange(e.from, e.to))],
            ["Beschreibung", show(e.description)],
            ["Technologien und Methoden", show((e.technologies ?? []).join(", "))],
          ],
        }),
      );
    }
    case "ausbildung": {
      const b = (before as SectionValues["ausbildung"]).education ?? [];
      const a = (after as SectionValues["ausbildung"]).education ?? [];
      return entryDiff(
        "Ausbildung",
        b,
        a,
        [(e) => `${e.title}|${e.institution}|${e.year}`, (e) => `${e.title}|${e.institution}`, (e) => e.title, (e) => `${e.institution}|${e.year}`],
        (e) => ({
          title: e.title,
          subtitle: educationSubtitle(e),
          fields: [
            ["Abschluss", show(e.title)],
            ["Schule oder Institution", show(e.institution)],
            ["Jahr", show(e.year)],
          ],
        }),
      );
    }
    case "sprachen": {
      const b = (before as SectionValues["sprachen"]).languages ?? [];
      const a = (after as SectionValues["sprachen"]).languages ?? [];
      return entryDiff("Sprache", b, a, [(e) => e.language], (e) => ({
        title: e.language,
        subtitle: languageLevelLabel(e.level),
        fields: [["Niveau", languageLevelLabel(e.level)]],
      }));
    }
    case "verfuegbarkeit": {
      const b = before as SectionValues["verfuegbarkeit"];
      const a = after as SectionValues["verfuegbarkeit"];
      return [
        ...fieldChange("Verfügbar ab", b.availableFrom ? formatDate(b.availableFrom) : "–", a.availableFrom ? formatDate(a.availableFrom) : "–"),
        ...fieldChange("Pensum", formatWorkload(b.workloadMin, b.workloadMax), formatWorkload(a.workloadMin, a.workloadMax)),
        ...fieldChange("Satzvorstellung", formatRate(b.rateAmount, b.rateUnit), formatRate(a.rateAmount, a.rateUnit)),
        ...fieldChange("Arbeitsmodell", labelOf(remoteOptions, b.remote), labelOf(remoteOptions, a.remote)),
        ...fieldChange("Regionen", show(b.regions), show(a.regions)),
        ...fieldChange("Kündigungsfrist", show(b.noticePeriod), show(a.noticePeriod)),
        ...firmChanges(b.firm, a.firm),
      ].map((c) => ({ type: "field", ...c }));
    }
  }
  return [];
}
