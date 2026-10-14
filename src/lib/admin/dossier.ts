import type { Candidate, ExperienceEntry, LanguageSkill } from "./db/schema";
import { displayNo, formatChf, formatDate, formatLongDate, todayIso } from "./format";
import { disciplines, labelOf, languageLevels, rateUnits, remoteOptions, seniorities, workPermits } from "./options";
import { kovaliParty } from "./party";
import { exportFileName, type Block, type DocModel, type Rich } from "./render/model";

/**
 * Candidate dossier ("Kandidatenprofil") for firms, as a DocModel for renderPdf/renderDocx.
 * Pure: the route handler loads the data, this module decides what a firm may see.
 *
 * Two variants. The anonymised one carries no name and no personal data, only the display
 * number ("Profil K-0042"). The named one shows name and city, but never e-mail, phone, street
 * or birth date: KOVALI stays the intermediary. Free texts are scrubbed of the candidate's
 * contact data (and, when anonymised, of the name), because summaries and project
 * descriptions are typed by hand and may contain them.
 *
 * The content is assembled once (DossierContent) and then laid out by a template, so
 * firm-specific layouts (Coopers, Adnovum, GHR) can be added later without touching the rules.
 */

export type DossierVariant = "anonym" | "namentlich";

/** Layouts. Only the KOVALI layout exists so far; firm-specific ones get their own key. */
export type DossierTemplate = "kovali";

export type DossierCandidate = Pick<
  Candidate,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "dateOfBirth"
  | "street"
  | "postalCode"
  | "city"
  | "nationality"
  | "workPermit"
  | "headline"
  | "summary"
  | "disciplines"
  | "skills"
  | "sapModules"
  | "certifications"
  | "languages"
  | "education"
  | "experience"
  | "seniority"
  | "availableFrom"
  | "workloadMin"
  | "workloadMax"
  | "remote"
  | "regions"
>;

export interface DossierMandate {
  id: number;
  title: string;
  /** The client's own reference, e.g. a job number in their portal. */
  reference: string | null;
}

export interface DossierSubmission {
  consentAt: Date | null;
  /** Consent withdrawn: the dossier is a draft, whatever the consent date says. */
  withdrawnAt?: Date | null;
  /** Rate offered to the firm (selling rate). The candidate's own rate never appears. */
  rateSell: number | null;
  rateUnit: string | null;
}

export interface DossierOptions {
  variant: DossierVariant;
  mandate?: DossierMandate | null;
  submission?: DossierSubmission | null;
  /**
   * The candidate's own firm. Profiles are only passed on through it (as subcontractor of
   * KOVALI); the named variant shows its name, the anonymised one only that it exists.
   */
  company?: { name: string } | null;
  /** The candidate objects to any hand-over (candidates.objection_at): a mandate dossier is a draft. */
  objection?: boolean;
  template?: DossierTemplate;
  /** Today in Zurich (YYYY-MM-DD); decides "sofort" and the date line. */
  today?: string;
}

export const DRAFT_REASON_CONSENT = "Einwilligung der Kandidatin/des Kandidaten für dieses Mandat fehlt.";
export const DRAFT_REASON_WITHDRAWN = "Einwilligung der Kandidatin/des Kandidaten für dieses Mandat widerrufen.";
export const DRAFT_REASON_OBJECTION = "Die Kandidatin/der Kandidat hat jeder Weitergabe widersprochen.";
export const DRAFT_REASON_FIRM = "Keine eigene Firma (Subunternehmen) erfasst.";
export const DRAFT_NOTICE = `${DRAFT_REASON_CONSENT} Nicht weitergeben.`;
export const CONDITIONS_ON_REQUEST = "Konditionen auf Anfrage";

// --- Presentation helpers, also used by the admin pages -------------------------------------

/** "80–100 %", "100 %", "ab 60 %", "bis 80 %", or null. */
export function formatWorkload(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = min ?? null;
  const hi = max ?? null;
  if (lo === null && hi === null) return null;
  if (lo !== null && hi !== null) return lo === hi ? `${hi} %` : `${lo}–${hi} %`;
  return lo !== null ? `ab ${lo} %` : `bis ${hi} %`;
}

/** "CHF 120.00 pro Stunde", or null without an amount. */
export function formatRate(amount: number | null | undefined, unit: string | null | undefined): string | null {
  if (amount === null || amount === undefined) return null;
  return unit ? `${formatChf(amount)} ${labelOf(rateUnits, unit)}` : formatChf(amount);
}

/** "Deutsch (Muttersprache)" */
export function languageLine(l: LanguageSkill): string {
  return l.level ? `${l.language} (${labelOf(languageLevels, l.level)})` : l.language;
}

/** "sofort" when the date has passed, the date otherwise, null when unknown. */
export function availabilityText(availableFrom: string | null | undefined, today: string): string | null {
  if (!availableFrom) return null;
  return availableFrom <= today ? "sofort" : formatDate(availableFrom);
}

/**
 * "01.2014 – 12.2019", "01.2020 – heute". Numeric months on purpose: the PDF timeline has a
 * fixed, narrow period column (render/pdf.tsx), and "Sept. 2014 – Sept. 2019" would run into
 * the title next to it.
 */
export function dossierPeriod(from: string | null | undefined, to: string | null | undefined): string {
  const month = (ym: string | null | undefined) => {
    const m = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
    return m ? `${m[2]}.${m[1]}` : (ym ?? "").trim();
  };
  const a = month(from);
  const b = to ? month(to) : "heute";
  return a ? `${a} – ${b}` : b;
}

/** Current positions first, then by end and start date, newest first. */
export function sortExperience<E extends Pick<ExperienceEntry, "from" | "to">>(list: readonly E[]): E[] {
  const end = (e: E) => e.to || "9999-12";
  return [...list].sort((a, b) => end(b).localeCompare(end(a)) || (b.from ?? "").localeCompare(a.from ?? ""));
}

/** Download URL of the dossier route. The mandate module links here with `mandateId`. */
export function dossierHref(
  candidateId: number,
  { format = "pdf", variant = "anonym", mandateId }: { format?: "pdf" | "docx"; variant?: DossierVariant; mandateId?: number | null } = {},
): string {
  const sp = new URLSearchParams({ format, variante: variant });
  if (mandateId) sp.set("mandat", String(mandateId));
  return `/admin/api/kandidaten/${candidateId}/dossier?${sp.toString()}`;
}

/** Download file name; the anonymised one carries no name either. */
export function dossierFileName(
  c: Pick<DossierCandidate, "id" | "firstName" | "lastName">,
  opts: Pick<DossierOptions, "variant" | "mandate">,
  ext: "pdf" | "docx",
): string {
  const parts = ["Kandidatenprofil", displayNo.candidate(c.id)];
  if (opts.variant === "namentlich") parts.push(c.lastName, c.firstName);
  else parts.push("anonym");
  if (opts.mandate) parts.push(displayNo.mandate(opts.mandate.id));
  return exportFileName(parts.join(" "), ext);
}

// --- Scrubbing free text ----------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REMOVED = "[entfernt]";
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;

/** Regex for a phone number in any common spelling: +41 79 123 45 67, 079/123'45'67, 0041791234567. */
function phonePattern(phone: string | null): RegExp | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  const variants = new Set([digits]);
  // Swiss numbers are written with country code or with a leading 0.
  if (digits.startsWith("41")) variants.add(`0${digits.slice(2)}`);
  if (digits.startsWith("0")) variants.add(`41${digits.slice(1)}`);
  const alternatives = [...variants].map((v) => v.split("").join("[\\s./()'’-]*"));
  return new RegExp(`(?:\\+|00)?(?:${alternatives.join("|")})`, "g");
}

/** Whole-word, case-insensitive pattern; also catches the genitive ("Annas"). */
function wordPattern(word: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?:['’]?s)?(?![\\p{L}\\p{N}])`, "giu");
}

/**
 * Removes the candidate's contact data from a free text, and in the anonymised variant also
 * the name (replaced by the profile number, so sentences stay readable).
 */
export function makeScrubber(c: DossierCandidate, variant: DossierVariant): (text: string) => string {
  const rules: [RegExp, string][] = [[EMAIL, REMOVED]];
  const phone = phonePattern(c.phone);
  if (phone) rules.push([phone, REMOVED]);
  if (c.street && c.street.trim().length >= 4) rules.push([new RegExp(escapeRegExp(c.street.trim()), "giu"), REMOVED]);
  if (c.dateOfBirth) {
    const [y, m, d] = c.dateOfBirth.split("-");
    const dates = [c.dateOfBirth, `${d}.${m}.${y}`, `${Number(d)}.${Number(m)}.${y}`];
    rules.push([new RegExp(dates.map(escapeRegExp).join("|"), "g"), REMOVED]);
  }
  if (variant === "anonym") {
    const label = displayNo.candidate(c.id);
    const first = c.firstName.trim();
    const last = c.lastName.trim();
    // Longest forms first, so "Anna Beispiel" becomes one "K-0042", not two.
    for (const name of [`${first} ${last}`, `${last} ${first}`, `${last}, ${first}`, last, first]) {
      if (name.replace(/[\s,]/g, "").length >= 2) rules.push([wordPattern(name), label]);
    }
  }
  return (text) => rules.reduce((t, [re, replacement]) => t.replace(re, replacement), text);
}

// --- Content ----------------------------------------------------------------------------------

export interface DossierContent {
  variant: DossierVariant;
  /** "K-0042" */
  number: string;
  /** Large title: "Profil K-0042" (anonymised) or the full name. */
  heading: string;
  headline: string | null;
  mandate: { number: string; title: string; reference: string | null } | null;
  /** Why the dossier must not leave KOVALI yet; empty when it may. */
  draftReasons: string[];
  facts: { label: string; value: string }[];
  summary: string | null;
  skills: string[];
  sapModules: string[];
  experience: { period: string; title: string; subtitle?: string; text?: string; tags?: string[] }[];
  education: { period: string; title: string; subtitle?: string }[];
  certifications: string[];
  conditions: string;
  asOf: string;
  footer: string;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Why a dossier for a mandate may not leave KOVALI yet: an objection, a withdrawn or missing
 * consent for this mandate, or no own firm. Empty when it may be passed on.
 */
export function mandateDraftReasons(opts: Pick<DossierOptions, "submission" | "company" | "objection">): string[] {
  const s = opts.submission;
  const consent = s?.withdrawnAt ? DRAFT_REASON_WITHDRAWN : s?.consentAt ? null : DRAFT_REASON_CONSENT;
  return [opts.objection ? DRAFT_REASON_OBJECTION : null, consent, opts.company ? null : DRAFT_REASON_FIRM].filter((r) => r !== null);
}

export function dossierContent(c: DossierCandidate, opts: DossierOptions): DossierContent {
  const today = opts.today ?? todayIso();
  const named = opts.variant === "namentlich";
  const scrub = makeScrubber(c, opts.variant);
  const clean = (s: string | null | undefined) => (s?.trim() ? scrub(s.trim()) : null);
  const cleanList = (items: readonly string[] | null | undefined) => list<string>(items).map((s) => scrub(String(s).trim())).filter(Boolean);
  const number = displayNo.candidate(c.id);
  const mandate = opts.mandate ?? null;

  const facts: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value?.trim()) facts.push({ label, value: value.trim() });
  };
  if (mandate) add("Mandat", mandate.reference ? `${mandate.title} (Ihre Referenz: ${mandate.reference})` : mandate.title);
  if (opts.company) add("Einsatz über", named ? opts.company.name : "eigene Firma (Subunternehmen)");
  add("Schwerpunkte", list<string>(c.disciplines).map((d) => labelOf(disciplines, d)).join(", "));
  add("Seniorität", c.seniority ? labelOf(seniorities, c.seniority) : null);
  add("Verfügbar ab", availabilityText(c.availableFrom, today) ?? "nach Absprache");
  add("Pensum", formatWorkload(c.workloadMin, c.workloadMax) ?? "nach Absprache");
  add("Einsatzort / Remote", c.remote ? labelOf(remoteOptions, c.remote) : null);
  add("Region", clean(c.regions));
  if (named) add("Wohnort", c.city);
  add(
    "Sprachen",
    list<LanguageSkill>(c.languages)
      .filter((l) => l?.language?.trim())
      .map((l) => scrub(languageLine(l)))
      .join(", "),
  );
  if (named) {
    add("Arbeitsbewilligung", c.workPermit ? labelOf(workPermits, c.workPermit) : null);
    add("Nationalität", c.nationality);
  }

  const rate = opts.submission?.rateSell !== null && opts.submission?.rateSell !== undefined ? formatRate(opts.submission.rateSell, opts.submission.rateUnit) : null;

  return {
    variant: opts.variant,
    number,
    heading: named ? `${c.firstName} ${c.lastName}`.trim() : `Profil ${number}`,
    headline: clean(c.headline),
    mandate: mandate ? { number: displayNo.mandate(mandate.id), title: mandate.title, reference: mandate.reference } : null,
    draftReasons: mandate ? mandateDraftReasons(opts) : [],
    facts,
    summary: clean(c.summary),
    skills: cleanList(c.skills),
    sapModules: cleanList(c.sapModules),
    experience: sortExperience(list<ExperienceEntry>(c.experience).filter((e) => e?.role?.trim())).map((e) => ({
      period: dossierPeriod(e.from, e.to),
      title: scrub(e.role.trim()),
      subtitle: [clean(e.client), clean(e.industry)].filter(Boolean).join(" · ") || undefined,
      text: clean(e.description) ?? undefined,
      tags: cleanList(e.technologies).length ? cleanList(e.technologies) : undefined,
    })),
    education: list<{ title: string; institution: string; year: string }>(c.education)
      .filter((e) => e?.title?.trim())
      .map((e) => ({ period: e.year?.trim() ?? "", title: scrub(e.title.trim()), subtitle: clean(e.institution) ?? undefined })),
    certifications: cleanList(c.certifications),
    conditions: rate ? `${rate}, zzgl. MWST falls anwendbar` : CONDITIONS_ON_REQUEST,
    asOf: formatLongDate(today),
    footer: `Vertraulich. Vorgestellt durch KOVALI (${kovaliParty().name}). Weitergabe an Dritte nur mit Zustimmung von KOVALI.`,
  };
}

// --- Layouts ----------------------------------------------------------------------------------

function kovaliLayout(d: DossierContent): DocModel {
  const blocks: Block[] = [];
  if (d.draftReasons.length) {
    const text: Rich = [{ text: "Entwurf: ", bold: true }, `${d.draftReasons.join(" ")} Nicht weitergeben.`];
    blocks.push({ type: "box", text });
  }
  blocks.push({ type: "title", text: d.heading, subtitle: d.headline ?? undefined });
  if (d.facts.length) blocks.push({ type: "facts", rows: d.facts });
  if (d.summary) blocks.push({ type: "box", title: "Kurzprofil", text: d.summary });
  if (d.skills.length) blocks.push({ type: "heading", text: "Kernkompetenzen" }, { type: "tags", items: d.skills });
  if (d.sapModules.length) blocks.push({ type: "heading", text: "SAP-Module" }, { type: "tags", items: d.sapModules });
  if (d.experience.length) {
    blocks.push({ type: "heading", text: "Werdegang und Projekte" });
    for (const e of d.experience) blocks.push({ type: "timeline", ...e });
  }
  if (d.education.length) {
    blocks.push({ type: "heading", text: "Ausbildung" });
    for (const e of d.education) blocks.push({ type: "timeline", ...e });
  }
  if (d.certifications.length) blocks.push({ type: "heading", text: "Zertifikate" }, { type: "list", items: d.certifications });
  blocks.push({ type: "heading", text: "Konditionen" }, { type: "paragraph", text: d.conditions });
  blocks.push({ type: "spacer", size: "md" }, { type: "paragraph", text: `Stand: ${d.asOf}. Angaben gemäss Unterlagen der Fachperson.`, small: true, muted: true });

  const title = d.variant === "namentlich" ? `Kandidatenprofil ${d.heading} (${d.number})` : `Kandidatenprofil ${d.number}`;
  return {
    docType: "Kandidatenprofil",
    title: d.mandate ? `${title} – ${d.mandate.number}` : title,
    reference: [d.number, d.mandate?.number, d.draftReasons.length ? "Entwurf" : null].filter(Boolean).join(" · "),
    footer: d.footer,
    confidential: true,
    blocks,
  };
}

const layouts: Record<DossierTemplate, (d: DossierContent) => DocModel> = {
  kovali: kovaliLayout,
};

export function buildDossier(candidate: DossierCandidate, opts: DossierOptions): DocModel {
  return layouts[opts.template ?? "kovali"](dossierContent(candidate, opts));
}
