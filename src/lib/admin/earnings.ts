import { formatChf, formatNumber, formatPercent, formatRate } from "./format";
import {
  holidaySupplement,
  OFFICIAL_RATES,
  payrollFromGross,
  publicHolidaySupplement,
  RATE_SOURCES,
  VAT_THRESHOLD,
  wageFromRate,
  type PayrollRates,
  type PayrollResult,
} from "./payroll";
import { HOURS_PER_DAY, toHourly } from "./rates";

/**
 * Earnings engine: what is left of a rate for Ferhat, in both ways he can be paid.
 *
 * - "rechnung": he invoices through his sole proprietorship (Einzelfirma) and pays AHV,
 *   pension, insurance and running costs himself.
 * - "lohn": a provider (GHR Group, Coopers Group …) employs him; the rate is either his gross
 *   hourly wage including all supplements ("brutto", the usual "all-in" rate) or what the
 *   provider spends per hour in total ("kostensatz").
 *
 * Pure functions without I/O, used by the dashboard, the assignment pages and the Rechner.
 * All amounts are CHF per year internally and only rounded for display (formatChf).
 * earnings.test.ts checks the results with figures worked out by hand.
 */

export type BillingModel = "rechnung" | "lohn";
export type RateBasis = "brutto" | "kostensatz";
export type PensionMode = "saeule3a" | "bvg";
export type LineGroup = "sozialversicherung" | "vorsorge" | "versicherung" | "kosten" | "steuern" | "info";

/** Display order and names of the line groups. Lines of group "info" are not subtracted. */
export const LINE_GROUPS: readonly { id: LineGroup; label: string }[] = [
  { id: "sozialversicherung", label: "Sozialversicherungen" },
  { id: "vorsorge", label: "Vorsorge" },
  { id: "versicherung", label: "Versicherungen" },
  { id: "kosten", label: "Kosten" },
  { id: "steuern", label: "Steuern" },
  { id: "info", label: "Zur Info, nicht abgezogen" },
];

// --- Settings ---------------------------------------------------------------------------------

/** Rates and assumptions, stored in the settings table under key "einkommen" (EARNINGS_SETTINGS_KEY). */
export interface EarningsSettings {
  /** Vacation weeks per year; unpaid when invoicing, part of the hourly wage on payroll. */
  vacationWeeks: number;
  /** Paid public holidays on working days per year. */
  publicHolidays: number;
  /** Age in the calculation year (BVG savings credit on payroll). */
  age: number;

  // Rechnung über die Einzelfirma
  /** AHV/IV/EO for the self-employed from the top of the sliding scale (CHF 60'500). */
  ahvRate: number;
  /** Minimum contribution per year below CHF 10'100. */
  ahvMinimum: number;
  /** Administrative costs of the Ausgleichskasse in % of the AHV/IV/EO contributions, by income. */
  akAdminLow: number;
  akAdminMid: number;
  akAdminHigh: number;
  fakEnabled: boolean;
  fakRate: number;
  fakMaxIncome: number;
  pensionMode: PensionMode;
  /** Own pension contributions in % of the profit (income before social contributions). */
  pensionPercent: number;
  /** Daily sickness allowance insurance in % of the profit. */
  ktgPercent: number;
  /** Voluntary accident insurance in % of the insured earnings (clamped to min/max). */
  accidentPercent: number;
  accidentMinIncome: number;
  accidentMaxIncome: number;
  liabilityYearly: number;
  fiduciaryYearly: number;
  otherFixedMonthly: number;
  /** Reserve for income taxes in % of what is left before taxes; 0 hides the line. */
  taxReservePercent: number;
  vatRegistered: boolean;
  vatRate: number;

  // Lohn über Payroll
  /** Provider fee in % of the total cost rate ("kostensatz" only). */
  providerFeePercent: number;
  /** Payroll rates; holidayWeeks, holidayPercent and publicHolidayPercent follow vacationWeeks and publicHolidays. */
  payroll: PayrollRates;
}

/** The day the defaults and sources below were checked. Check once a year. */
export const EARNINGS_AS_OF = "2026-10-14";

export const EARNINGS_DEFAULTS: EarningsSettings = {
  vacationWeeks: 5,
  publicHolidays: 9,
  age: 40,
  ahvRate: 10,
  ahvMinimum: 530,
  akAdminLow: 5,
  akAdminMid: 4,
  akAdminHigh: 3,
  fakEnabled: true,
  fakRate: 1.25,
  fakMaxIncome: 148_200,
  pensionMode: "saeule3a",
  pensionPercent: 10,
  ktgPercent: 2,
  accidentPercent: 3.2,
  accidentMinIncome: 66_690,
  accidentMaxIncome: 148_200,
  liabilityYearly: 1_000,
  fiduciaryYearly: 2_500,
  otherFixedMonthly: 0,
  taxReservePercent: 0,
  vatRegistered: false,
  vatRate: 8.1,
  providerFeePercent: 0,
  payroll: OFFICIAL_RATES,
};

/**
 * Sliding scale of AHV/IV/EO for the self-employed, 2025 and 2026 (Merkblatt 2.02): income from
 * `from` (inclusive) up to the next step (exclusive). The rate applies to the whole income.
 * Below the first step the minimum contribution applies, from AHV_SCALE_TOP the full rate.
 */
export const AHV_SELF_SCALE: readonly { from: number; rate: number }[] = [
  { from: 10_100, rate: 5.371 },
  { from: 17_600, rate: 5.494 },
  { from: 23_000, rate: 5.617 },
  { from: 25_500, rate: 5.741 },
  { from: 28_000, rate: 5.864 },
  { from: 30_500, rate: 5.987 },
  { from: 33_000, rate: 6.235 },
  { from: 35_500, rate: 6.481 },
  { from: 38_000, rate: 6.728 },
  { from: 40_500, rate: 6.976 },
  { from: 43_000, rate: 7.222 },
  { from: 45_500, rate: 7.469 },
  { from: 48_000, rate: 7.84 },
  { from: 50_500, rate: 8.209 },
  { from: 53_000, rate: 8.58 },
  { from: 55_500, rate: 8.951 },
  { from: 58_000, rate: 9.321 },
];
export const AHV_SCALE_TOP = 60_500;

/** Säule 3a 2026: without a pension fund 20 % of the net earned income, at most CHF 36'288; with one CHF 7'258. */
export const PILLAR_3A_SHARE = 20;
export const PILLAR_3A_MAX_WITHOUT_PK = 36_288;
export const PILLAR_3A_MAX_WITH_PK = 7_258;
/** Working days per year before vacation and public holidays (52 weeks × 5 days). */
export const WORKING_DAYS = 260;

export type EarningsSection = "arbeitszeit" | "ahv" | "vorsorge" | "versicherung" | "kosten" | "mwst" | "lohn" | "lohnBvg" | "lohnFirma";

export const EARNINGS_SECTIONS: readonly { id: EarningsSection; title: string; description: string }[] = [
  { id: "arbeitszeit", title: "Arbeitszeit", description: "Gilt für beide Modelle. Die Stunden pro Jahr sind Pensum × 8.4 Stunden × Arbeitstage." },
  {
    id: "ahv",
    title: "Rechnung: AHV, Ausgleichskasse und FAK",
    description: "Die sinkende Beitragsskala für Einkommen unter CHF 60’500 ist eingebaut. Selbständige zahlen keine ALV.",
  },
  { id: "vorsorge", title: "Rechnung: Vorsorge", description: "Was du selbst für das Alter zur Seite legst." },
  { id: "versicherung", title: "Rechnung: Versicherungen", description: "Als Selbständiger bist du weder gegen Unfall noch für Krankentaggeld obligatorisch versichert." },
  { id: "kosten", title: "Rechnung: Kosten und Steuern", description: "Fixkosten der Einzelfirma. Die Spesen erfasst du pro Auftrag." },
  { id: "mwst", title: "MWST", description: "Die MWST stellst du zusätzlich in Rechnung und lieferst sie ab. Sie ist kein Einkommen." },
  {
    id: "lohn",
    title: "Lohn: Abzüge",
    description: "Wenn dich ein Anbieter anstellt. Ferien und Feiertage oben bestimmen die Zuschläge im Stundenlohn.",
  },
  { id: "lohnBvg", title: "Lohn: Pensionskasse (BVG)", description: "Obligatorium (Minimalplan). Viele Pensionskassen versichern mehr." },
  {
    id: "lohnFirma",
    title: "Lohn: Beiträge der Firma",
    description: "Beim Bruttolohn zahlt sie die Firma zusätzlich (nur zur Info). Beim Kostensatz gehen sie vom Satz ab.",
  },
];

type PayrollFieldKey = Exclude<keyof PayrollRates, "holidayWeeks" | "holidayPercent" | "publicHolidayPercent">;
type OwnFieldKey = Exclude<keyof EarningsSettings, "payroll">;
export type EarningsFieldKey = OwnFieldKey | `payroll.${PayrollFieldKey}`;

export interface EarningsField {
  key: EarningsFieldKey;
  section: EarningsSection;
  label: string;
  type: "number" | "boolean" | "choice";
  suffix?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  choices?: readonly { value: string; label: string }[];
  hint?: string;
}

const pct = (key: EarningsFieldKey, section: EarningsSection, label: string, max: number, hint?: string): EarningsField => ({
  key,
  section,
  label,
  type: "number",
  suffix: "%",
  min: 0,
  max,
  hint,
});
const chf = (key: EarningsFieldKey, section: EarningsSection, label: string, suffix = "CHF", hint?: string): EarningsField => ({
  key,
  section,
  label,
  type: "number",
  suffix,
  min: 0,
  max: 1_000_000,
  hint,
});

/** Every editable setting, in form order. Drives the form, its validation and the parser of stored values. */
export const EARNINGS_FIELDS: readonly EarningsField[] = [
  { key: "vacationWeeks", section: "arbeitszeit", label: "Ferien", type: "number", suffix: "Wochen", min: 0, max: 10, hint: "Bei Rechnung unbezahlt, beim Lohn im Stundensatz enthalten." },
  { key: "publicHolidays", section: "arbeitszeit", label: "Bezahlte Feiertage", type: "number", suffix: "Tage", min: 0, max: 20, hint: "Werktage pro Jahr; Solothurn ca. 9." },

  pct("ahvRate", "ahv", "AHV/IV/EO ab CHF 60’500 Einkommen", 20),
  chf("ahvMinimum", "ahv", "Mindestbeitrag", "CHF/Jahr", "Unter CHF 10’100 Einkommen."),
  pct("akAdminLow", "ahv", "Verwaltungskosten bis CHF 50’000", 10, "In % der AHV/IV/EO-Beiträge."),
  pct("akAdminMid", "ahv", "Verwaltungskosten bis CHF 100’000", 10),
  pct("akAdminHigh", "ahv", "Verwaltungskosten darüber", 10),
  { key: "fakEnabled", section: "ahv", label: "FAK-Beiträge zahlen", type: "boolean", hint: "Seit 2013 Pflicht für Selbständige." },
  pct("fakRate", "ahv", "FAK-Satz", 5),
  chf("fakMaxIncome", "ahv", "FAK höchstens auf", "CHF/Jahr"),

  {
    key: "pensionMode",
    section: "vorsorge",
    label: "Vorsorge über",
    type: "choice",
    choices: [
      { value: "saeule3a", label: "Säule 3a (ohne Pensionskasse)" },
      { value: "bvg", label: "Pensionskasse (BVG, freiwillig)" },
    ],
  },
  pct("pensionPercent", "vorsorge", "Vorsorge in % des Gewinns", 50, "0 blendet die Zeile aus. Die Säule 3a wird auf das gesetzliche Maximum gekürzt."),

  pct("ktgPercent", "versicherung", "Krankentaggeld", 10, "Wartefrist 30 Tage ca. 2 %, 60 Tage ca. 1.3 %."),
  pct("accidentPercent", "versicherung", "Unfallversicherung", 10, "0, wenn nur die Krankenkasse Unfälle deckt."),
  chf("accidentMinIncome", "versicherung", "Unfall: versicherter Verdienst mindestens", "CHF/Jahr"),
  chf("accidentMaxIncome", "versicherung", "Unfall: versicherter Verdienst höchstens", "CHF/Jahr"),

  chf("liabilityYearly", "kosten", "Berufshaftpflicht", "CHF/Jahr"),
  chf("fiduciaryYearly", "kosten", "Treuhand und Steuererklärung", "CHF/Jahr"),
  chf("otherFixedMonthly", "kosten", "Weitere Fixkosten", "CHF/Monat", "Software, Telefon, Geräte."),
  pct("taxReservePercent", "kosten", "Rücklage für Steuern", 60, "In % von dem, was vor Steuern bleibt. 0 blendet die Zeile aus."),

  { key: "vatRegistered", section: "mwst", label: "KOVALI ist MWST-pflichtig", type: "boolean" },
  pct("vatRate", "mwst", "MWST-Satz", 20),

  { key: "age", section: "lohn", label: "Dein Alter", type: "number", suffix: "Jahre", min: 16, max: 75, integer: true, hint: "Bestimmt die BVG-Altersgutschrift." },
  pct("providerFeePercent", "lohn", "Gebühr des Anbieters", 30, "Nur beim Kostensatz, wenn sie noch nicht abgezogen ist (typisch 1–5 %)."),
  { key: "payroll.thirteenthEnabled", section: "lohn", label: "13. Monatslohn im Stundenlohn", type: "boolean" },
  pct("payroll.thirteenthPercent", "lohn", "13. Monatslohn", 20),
  pct("payroll.ahvIvEo", "lohn", "AHV/IV/EO je Seite", 20),
  pct("payroll.alv", "lohn", "ALV je Seite", 10),
  chf("payroll.alvMaxSalary", "lohn", "ALV-Höchstlohn", "CHF/Jahr"),
  pct("payroll.uvgNbu", "lohn", "Nichtberufsunfall (dein Anteil)", 20),
  chf("payroll.uvgMaxSalary", "lohn", "UVG-Höchstlohn", "CHF/Jahr"),
  pct("payroll.ktgEmployee", "lohn", "Krankentaggeld (dein Anteil)", 10),
  { key: "payroll.gavEnabled", section: "lohn", label: "GAV Personalverleih", type: "boolean", hint: "Wenn der Anbieter dich als Personalverleiher anstellt." },
  pct("payroll.gavEmployee", "lohn", "GAV (dein Beitrag)", 5),

  chf("payroll.bvgEntryThreshold", "lohnBvg", "Eintrittsschwelle", "CHF/Jahr"),
  chf("payroll.bvgCoordinationDeduction", "lohnBvg", "Koordinationsabzug", "CHF/Jahr"),
  chf("payroll.bvgUpperLimit", "lohnBvg", "Oberer Grenzbetrag", "CHF/Jahr"),
  chf("payroll.bvgMinCoordinated", "lohnBvg", "Min. koordinierter Lohn", "CHF/Jahr"),
  pct("payroll.bvgCredit25", "lohnBvg", "Altersgutschrift 25–34", 40),
  pct("payroll.bvgCredit35", "lohnBvg", "Altersgutschrift 35–44", 40),
  pct("payroll.bvgCredit45", "lohnBvg", "Altersgutschrift 45–54", 40),
  pct("payroll.bvgCredit55", "lohnBvg", "Altersgutschrift 55–65", 40),
  pct("payroll.bvgRiskPercent", "lohnBvg", "Risiko und Verwaltung", 20, "In % des koordinierten Lohns."),
  { key: "payroll.bvgEmployerShare", section: "lohnBvg", label: "Anteil der Firma", type: "number", suffix: "%", min: 50, max: 100, hint: "Mindestens 50 %." },

  pct("payroll.fak", "lohnFirma", "FAK", 10),
  pct("payroll.famel", "lohnFirma", "FamEL Kanton SO", 5),
  pct("payroll.akAdminPercent", "lohnFirma", "Verwaltungskosten AK", 10, "In % der AHV/IV/EO-Beiträge."),
  pct("payroll.uvgBu", "lohnFirma", "Berufsunfall", 20),
  pct("payroll.ktgEmployer", "lohnFirma", "Krankentaggeld (Anteil Firma)", 10),
  pct("payroll.gavEmployer", "lohnFirma", "GAV (Beitrag Firma)", 5),
];

/** Value of one field, e.g. fieldValue(s, "payroll.alv"). */
export function fieldValue(s: EarningsSettings, key: EarningsFieldKey): number | boolean | string {
  if (key.startsWith("payroll.")) return s.payroll[key.slice(8) as PayrollFieldKey];
  return s[key as OwnFieldKey];
}

/** Flat values keyed like the form fields. */
export function flatFromSettings(s: EarningsSettings): Record<EarningsFieldKey, number | boolean | string> {
  return Object.fromEntries(EARNINGS_FIELDS.map((f) => [f.key, fieldValue(s, f.key)])) as Record<EarningsFieldKey, number | boolean | string>;
}

/** Settings from flat values; missing keys keep the value of `base`. */
export function settingsFromFlat(flat: Partial<Record<string, unknown>>, base: EarningsSettings = EARNINGS_DEFAULTS): EarningsSettings {
  const own: Record<string, unknown> = { ...base };
  const payroll: Record<string, unknown> = { ...base.payroll };
  for (const f of EARNINGS_FIELDS) {
    if (!(f.key in flat)) continue;
    if (f.key.startsWith("payroll.")) payroll[f.key.slice(8)] = flat[f.key];
    else own[f.key] = flat[f.key];
  }
  return { ...(own as unknown as EarningsSettings), payroll: payroll as unknown as PayrollRates };
}

export interface EarningsSource {
  keys: EarningsFieldKey[];
  label: string;
  /** "amtlich": published by an authority or in the law; "annahme": planning value. */
  kind: "amtlich" | "annahme";
  confidence?: "hoch" | "mittel" | "tief";
  source: string;
  url?: string;
  note?: string;
}

/** Badge for a source: "Richtwert" for low confidence, "Annahme" for planning values, else none. */
export function sourceBadge(s: Pick<EarningsSource, "kind" | "confidence">): "Richtwert" | "Annahme" | null {
  if (s.confidence === "tief") return "Richtwert";
  return s.kind === "annahme" ? "Annahme" : null;
}

/**
 * Where each default comes from (research of 14.10.2026; several official sites could only be
 * read through search excerpts and mirrors, so check the values once a year).
 */
export const EARNINGS_SOURCES: readonly EarningsSource[] = [
  {
    keys: ["publicHolidays"],
    label: "Kanton Solothurn: 8.5 gesetzliche Feiertage, üblich frei sind zusätzlich Berchtoldstag, Ostermontag, Pfingstmontag und Stephanstag. Auf Werktage fallen je nach Jahr 8 bis 11 Tage, 9 als Mittelwert",
    kind: "annahme",
    confidence: "mittel",
    source: "Kanton Solothurn, Gesetzliche Feiertage; eigene Auszählung",
    url: "https://so.ch/allgemeine-informationen/gesetzliche-feiertage/",
    note: "Massgebend sind die Feiertage am Standort des Kunden.",
  },
  {
    keys: ["vacationWeeks", "payroll.thirteenthEnabled", "payroll.thirteenthPercent"],
    label: "Zuschläge im Stundenlohn: Ferien 4 / 5 / 6 Wochen = 8.33 / 10.64 / 13.04 %, Feiertage 9 Tage = 3.59 %, 13. Monatslohn 8.33 %",
    kind: "amtlich",
    confidence: "hoch",
    source: "Art. 329a OR; OBT «Arbeiten im Stundenlohn»",
    url: "https://www.obt.ch/de/infoboard/arbeiten-im-stundenlohn-auszahlung-der-ferien-und-feiertage",
  },
  {
    keys: ["ahvRate"],
    label: "AHV/IV/EO für Selbständige 10.0 % (AHV 8.1, IV 1.4, EO 0.5) auf dem ganzen Einkommen, ohne Obergrenze. Keine ALV",
    kind: "amtlich",
    confidence: "hoch",
    source: "BSV, Synoptische Tabelle der Beitragssätze, Stand 1.1.2026; AHV/IV-Merkblatt 2.02",
    url: "https://sozialversicherungen.admin.ch/de/d/6877/download",
  },
  {
    keys: ["ahvRate"],
    label: "Sinkende Beitragsskala von CHF 10’100 bis 60’500 Einkommen: 5.371 % bis 9.321 % auf dem ganzen Einkommen. Ab 2027 gelten 10’300 und 61’500",
    kind: "amtlich",
    confidence: "mittel",
    source: "AHV/IV-Merkblatt 2.02; SVA Graubünden, Begleitschreiben 2025 Selbständigerwerbende",
    url: "https://www.ahv-iv.ch/p/2.02.d",
    note: "10 der 17 Stufen sind direkt belegt, die übrigen nach dem Muster der Tabelle berechnet (± 0.001 Prozentpunkte).",
  },
  {
    keys: ["ahvMinimum"],
    label: "Mindestbeitrag CHF 530 pro Jahr unter CHF 10’100 Einkommen (ab 2027: CHF 541)",
    kind: "amtlich",
    confidence: "hoch",
    source: "AHV/IV-Merkblatt 1.2025",
    url: "https://www.ahv-iv.ch/p/1.2025.d",
  },
  {
    keys: ["akAdminLow", "akAdminMid", "akAdminHigh"],
    label: "Verwaltungskosten der Ausgleichskasse Solothurn für Selbständige: 5 % bis CHF 50’000 Einkommen, 4 % bis 100’000, 3 % darüber, jeweils in % der AHV/IV/EO-Beiträge",
    kind: "amtlich",
    confidence: "mittel",
    source: "Verordnung über die Verwaltungskostenbeiträge der AKSO (BGS 835.1), § 3",
    url: "https://bgs.so.ch/app/de/texts_of_law/835.1",
    note: "Mit der Beitragsverfügung der AKSO bestätigen.",
  },
  {
    keys: ["fakEnabled", "fakRate", "fakMaxIncome"],
    label: "FAK Kanton Solothurn für Selbständige 1.25 % bis CHF 148’200 Einkommen, ab 2027 voraussichtlich höher (ca. 1.44 %). FamEL zahlen nur juristische Personen",
    kind: "amtlich",
    confidence: "mittel",
    source: "AKSO, Beitragssatz der kantonalen FAK; Art. 16 Abs. 4 FamZG; RRB SO 2025/1693",
    url: "https://www.akso.ch/news/neuer-beitragssatz-der-kantonalen-familienausgleichskasse-fuer-die-beitragsperiode-2024",
  },
  {
    keys: ["pensionMode", "pensionPercent"],
    label: "Säule 3a ohne Pensionskasse: 20 % des Nettoerwerbseinkommens, höchstens CHF 36’288; mit Pensionskasse höchstens CHF 7’258 (2026)",
    kind: "amtlich",
    confidence: "hoch",
    source: "BVV 3 Art. 7; UBS «Maximalbetrag 2026»",
    url: "https://www.ubs.com/ch/de/help/pension/maximal-contribution-2026.html",
  },
  {
    keys: ["pensionMode"],
    label: "Freiwillige Pensionskasse über den Berufsverband oder die Auffangeinrichtung. Die Hälfte der Beiträge mindert das AHV-Einkommen",
    kind: "amtlich",
    confidence: "mittel",
    source: "Art. 4 und 44 BVG; Art. 9 Abs. 2 lit. e AHVG; Steuerbuch SO § 41 Nr. 6",
    url: "https://steuerbuch.so.ch/steuern/einkommenssteuer/allgemeine-abzuege-und-sozialabzuege/41-nr-6/",
  },
  {
    keys: ["pensionPercent"],
    label: "10 % als Planungswert für deine eigenen Einzahlungen",
    kind: "annahme",
    confidence: "tief",
    source: "Eigene Annahme, an deine Einzahlungen anpassen",
  },
  {
    keys: ["ktgPercent"],
    label: "Krankentaggeld 80 % ab dem 31. Tag ca. 2 % des versicherten Einkommens, mit 60 Tagen Wartefrist ca. 1.3 %, mit 90 Tagen ca. 1 %",
    kind: "annahme",
    confidence: "tief",
    source: "Magic Heidi, gryps.ch (Richtwerte); Prämie gemäss Offerte",
    url: "https://magicheidi.ch/blog/krankentaggeldversicherung-schweiz",
  },
  {
    keys: ["accidentPercent", "accidentMinIncome", "accidentMaxIncome"],
    label: "Freiwillige Unfallversicherung nach UVG ca. 3.2 % des versicherten Verdienstes (CHF 66’690 bis 148’200)",
    kind: "annahme",
    confidence: "mittel",
    source: "Suva, Unternehmerversicherung für Selbständige (Prämienbeispiel); Art. 4 UVG",
    url: "https://www.suva.ch/de-ch/versicherung/unfallversicherung/unternehmerversicherung-fuer-selbststaendige/versicherungspraemien-bei-unfallversicherung-fuer-selbststaendige",
  },
  {
    keys: ["liabilityYearly"],
    label: "Berufshaftpflicht für IT-Berater CHF 400 bis 1’500 pro Jahr bei CHF 1 bis 3 Mio. Deckung",
    kind: "annahme",
    confidence: "mittel",
    source: "exali.ch; Vergleiche von Ratgeber-Seiten",
    url: "https://www.exali.ch/consulting-haftpflicht/it-berater/",
  },
  {
    keys: ["fiduciaryYearly"],
    label: "Jahresabschluss und Steuererklärung extern CHF 800 bis 2’000, dazu Buchhaltungssoftware",
    kind: "annahme",
    confidence: "mittel",
    source: "pfeffersack.ch «Treuhänder Kosten 2026»; treuhand-vergleich-schweiz.ch",
    url: "https://pfeffersack.ch/blog/treuhaender-kosten-schweiz-2026",
  },
  {
    keys: ["otherFixedMonthly", "taxReservePercent"],
    label: "Deine eigenen Werte",
    kind: "annahme",
    source: "Deine Angaben",
  },
  {
    keys: ["vatRegistered", "vatRate"],
    label: "MWST-pflichtig ab CHF 100’000 Umsatz pro Jahr (Anmeldung innert 30 Tagen), Normalsatz 8.1 %. Saldosteuersatz für Informatik und Beratung 6.2 %",
    kind: "amtlich",
    confidence: "hoch",
    source: "Art. 10 und 14 MWSTG; ESTV, MWST-Sätze",
    url: "https://www.estv.admin.ch/de/mwst-steuersaetze",
  },
  {
    keys: ["age"],
    label: "Dein Alter bestimmt die BVG-Altersgutschrift (7 / 10 / 15 / 18 % ab 25 / 35 / 45 / 55)",
    kind: "annahme",
    source: "Trag dein Alter ein",
  },
  {
    keys: ["providerFeePercent"],
    label: "Gebühr von Payroll-Anbietern 1 bis 5 % des Umsatzes oder ein fester Betrag pro Stunde",
    kind: "annahme",
    confidence: "mittel",
    source: "Magic Heidi «Payrolling für Freelancer Schweiz 2026»; diligo.ch",
    url: "https://magicheidi.ch/de/payrolling-for-freelancers",
  },
  ...RATE_SOURCES.map(
    (s): EarningsSource => ({
      keys: s.keys.map((k) => `payroll.${k}` as EarningsFieldKey),
      label: s.label,
      kind: s.kind,
      source: s.source,
      url: s.url,
    }),
  ),
];

/** Sources that cover at least one of the given fields. */
export function sourcesFor(keys: readonly EarningsFieldKey[]): EarningsSource[] {
  return EARNINGS_SOURCES.filter((s) => s.keys.some((k) => keys.includes(k)));
}

// --- Engine -----------------------------------------------------------------------------------

export interface EarningsInput {
  /** CHF per hour or per day (8.4 hours). */
  rate: number;
  unit: "stunde" | "tag";
  /** 1–100 % of full time. */
  workload: number;
  billing: BillingModel;
  /** Payroll only. */
  rateBasis: RateBasis;
  /** Replaces the computed hours per month. */
  hoursPerMonth?: number | null;
  /** Own costs per month nobody reimburses (travel and the like). */
  expensesMonthly?: number | null;
}

export interface EarningsLine {
  key: string;
  label: string;
  group: LineGroup;
  /** Rate as shown, e.g. 10 (%); null for fixed amounts. */
  percent: number | null;
  month: number;
  year: number;
  note?: string;
  /** "Richtwert" or "Annahme" when the line rests on a planning value. */
  estimate?: "Richtwert" | "Annahme";
}

export interface Earnings {
  model: BillingModel | "gemischt";
  rateBasis: RateBasis | null;
  hoursPerMonth: number;
  hoursPerYear: number;
  hoursOverridden: boolean;
  revenue: { month: number; year: number; hourly: number; label: string };
  lines: EarningsLine[];
  net: { month: number; year: number; hourly: number };
  notices: string[];
}

const p = (v: number) => v / 100;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
}

function line(key: string, label: string, group: LineGroup, percent: number | null, year: number, extra: Pick<EarningsLine, "note" | "estimate"> = {}): EarningsLine {
  return { key, label, group, percent, month: year / 12, year, ...extra };
}

/** Working days per year after vacation and public holidays: 260 − 25 − 9 = 226 by default. */
export function workingDaysPerYear(s: Pick<EarningsSettings, "vacationWeeks" | "publicHolidays">): number {
  return Math.max(WORKING_DAYS - clamp(s.vacationWeeks, 0, 52) * 5 - clamp(s.publicHolidays, 0, 260), 0);
}

/** Worked hours per year at a workload: workload × 8.4 h × working days (1’898.4 at 100 %). */
export function hoursPerYear(workload: number, s: Pick<EarningsSettings, "vacationWeeks" | "publicHolidays">): number {
  return (clamp(workload, 0, 100) / 100) * HOURS_PER_DAY * workingDaysPerYear(s);
}

/** Payroll rates with the supplements that follow from the vacation weeks and public holidays. */
export function payrollRatesFor(s: EarningsSettings): PayrollRates {
  return {
    ...s.payroll,
    holidayWeeks: s.vacationWeeks,
    holidayPercent: holidaySupplement(s.vacationWeeks),
    publicHolidayPercent: publicHolidaySupplement(s.publicHolidays),
  };
}

/** AHV/IV/EO of a self-employed person for a contribution-liable income per year. */
export function ahvSelfEmployed(income: number, s: Pick<EarningsSettings, "ahvRate" | "ahvMinimum">): { amount: number; percent: number | null; basis: "minimum" | "skala" | "voll" } {
  if (!(income >= AHV_SELF_SCALE[0].from)) return { amount: s.ahvMinimum, percent: null, basis: "minimum" };
  if (income < AHV_SCALE_TOP) {
    const step = [...AHV_SELF_SCALE].reverse().find((st) => income >= st.from)!;
    return { amount: income * p(step.rate), percent: step.rate, basis: "skala" };
  }
  return { amount: income * p(s.ahvRate), percent: s.ahvRate, basis: "voll" };
}

/** Administrative costs of the Ausgleichskasse in % of the contributions, by income. */
export function akAdminPercent(income: number, s: Pick<EarningsSettings, "akAdminLow" | "akAdminMid" | "akAdminHigh">): number {
  if (income <= 50_000) return s.akAdminLow;
  if (income <= 100_000) return s.akAdminMid;
  return s.akAdminHigh;
}

const chfRound = (v: number) => formatChf(v, { round: true });

function finish(
  base: Omit<Earnings, "lines" | "net" | "notices" | "revenue" | "hoursPerMonth"> & { revenueYear: number; revenueLabel: string },
  lines: EarningsLine[],
  notices: string[],
): Earnings {
  const { revenueYear, revenueLabel, hoursPerYear: hours, ...rest } = base;
  const deductions = lines.filter((l) => l.group !== "info").reduce((a, l) => a + l.year, 0);
  const netYear = revenueYear - deductions;
  return {
    ...rest,
    hoursPerYear: hours,
    hoursPerMonth: hours / 12,
    revenue: { month: revenueYear / 12, year: revenueYear, hourly: hours > 0 ? revenueYear / hours : 0, label: revenueLabel },
    lines,
    net: { month: netYear / 12, year: netYear, hourly: hours > 0 ? netYear / hours : 0 },
    notices,
  };
}

/** Rücklage für Steuern on what is left before taxes (pushed only when the setting is above 0). */
function pushTaxReserve(lines: EarningsLine[], revenueYear: number, s: EarningsSettings) {
  if (!(s.taxReservePercent > 0)) return;
  const beforeTax = revenueYear - lines.filter((l) => l.group !== "info").reduce((a, l) => a + l.year, 0);
  lines.push(
    line("steuern", "Rücklage für Steuern", "steuern", s.taxReservePercent, Math.max(beforeTax, 0) * p(s.taxReservePercent), {
      note: "auf dem Einkommen nach allen Abzügen",
      estimate: "Annahme",
    }),
  );
}

interface InvoiceBase {
  revenueYear: number;
  expensesYear: number;
  hoursYear: number;
  hoursOverridden: boolean;
}

/**
 * Invoice via the Einzelfirma. The contribution-liable income is the profit before the own
 * social contributions (revenue − expenses − fixed costs), less half of voluntary BVG
 * contributions; the Ausgleichskasse grosses the tax figure up the same way (Art. 9 AHVG).
 */
function invoiceEarnings(b: InvoiceBase, s: EarningsSettings): Earnings {
  const lines: EarningsLine[] = [];
  const notices: string[] = [];
  const fixedYear = Math.max(s.liabilityYearly, 0) + Math.max(s.fiduciaryYearly, 0) + Math.max(s.otherFixedMonthly, 0) * 12;
  const profit = b.revenueYear - b.expensesYear - fixedYear;
  const earned = Math.max(profit, 0);
  const bvgYear = s.pensionMode === "bvg" ? earned * p(Math.max(s.pensionPercent, 0)) : 0;
  const ahvIncome = Math.max(profit - bvgYear / 2, 0);

  const ahv = ahvSelfEmployed(ahvIncome, s);
  lines.push(
    line("ahv", "AHV/IV/EO", "sozialversicherung", ahv.percent, ahv.amount, {
      note:
        ahv.basis === "minimum"
          ? `Mindestbeitrag unter ${chfRound(AHV_SELF_SCALE[0].from)} Einkommen`
          : ahv.basis === "skala"
            ? `sinkende Beitragsskala, Einkommen ${chfRound(ahvIncome)}`
            : `auf ${chfRound(ahvIncome)} Einkommen`,
    }),
  );
  const akPercent = akAdminPercent(ahvIncome, s);
  lines.push(line("akAdmin", "Verwaltungskosten Ausgleichskasse", "sozialversicherung", akPercent, ahv.amount * p(akPercent), { note: "in % der AHV/IV/EO-Beiträge" }));
  if (s.fakEnabled && s.fakRate > 0) {
    const fakBase = Math.min(ahvIncome, s.fakMaxIncome);
    lines.push(
      line("fak", "Familienausgleichskasse (FAK)", "sozialversicherung", s.fakRate, fakBase * p(s.fakRate), {
        note: ahvIncome > s.fakMaxIncome ? `nur bis ${chfRound(s.fakMaxIncome)} Einkommen` : undefined,
      }),
    );
  }
  const socialYear = lines.reduce((a, l) => a + l.year, 0);

  if (s.pensionPercent > 0) {
    if (s.pensionMode === "bvg") {
      lines.push(
        line("vorsorge", "Pensionskasse (BVG, freiwillig)", "vorsorge", s.pensionPercent, bvgYear, {
          note: `Die Hälfte mindert das AHV-Einkommen. Säule 3a daneben höchstens ${chfRound(PILLAR_3A_MAX_WITH_PK)}.`,
          estimate: "Annahme",
        }),
      );
    } else {
      const wanted = earned * p(s.pensionPercent);
      const netEarned = Math.max(profit - socialYear, 0);
      const cap = Math.min(netEarned * p(PILLAR_3A_SHARE), PILLAR_3A_MAX_WITHOUT_PK);
      const amount = Math.min(wanted, cap);
      lines.push(
        line("vorsorge", "Säule 3a", "vorsorge", s.pensionPercent, amount, {
          note:
            amount < wanted
              ? `auf das Maximum gekürzt: 20 % des Nettoerwerbseinkommens, höchstens ${chfRound(PILLAR_3A_MAX_WITHOUT_PK)}`
              : "in % des Gewinns",
          estimate: "Annahme",
        }),
      );
    }
  }
  if (s.ktgPercent > 0) {
    lines.push(line("ktg", "Krankentaggeld", "versicherung", s.ktgPercent, earned * p(s.ktgPercent), { note: "Prämie gemäss Offerte", estimate: "Richtwert" }));
  }
  if (s.accidentPercent > 0) {
    const insured = clamp(earned, s.accidentMinIncome, Math.max(s.accidentMaxIncome, s.accidentMinIncome));
    lines.push(
      line("unfall", "Unfallversicherung", "versicherung", s.accidentPercent, insured * p(s.accidentPercent), {
        note: `versicherter Verdienst ${chfRound(insured)}`,
        estimate: "Annahme",
      }),
    );
  }
  if (s.liabilityYearly > 0) lines.push(line("haftpflicht", "Berufshaftpflicht", "kosten", null, s.liabilityYearly, { estimate: "Annahme" }));
  if (s.fiduciaryYearly > 0) lines.push(line("treuhand", "Treuhand und Steuererklärung", "kosten", null, s.fiduciaryYearly, { estimate: "Annahme" }));
  if (s.otherFixedMonthly > 0) lines.push(line("fixkosten", "Weitere Fixkosten", "kosten", null, s.otherFixedMonthly * 12));
  if (b.expensesYear > 0) lines.push(line("spesen", "Eigene Spesen", "kosten", null, b.expensesYear, { note: "nicht vergütet" }));
  pushTaxReserve(lines, b.revenueYear, s);

  if (s.vatRegistered) {
    lines.push(
      line("mwst", `MWST ${formatPercent(s.vatRate)} auf deinen Rechnungen`, "info", s.vatRate, b.revenueYear * p(s.vatRate), {
        note: "kommt dazu und geht an die ESTV, kein Einkommen",
      }),
    );
  } else if (b.revenueYear > VAT_THRESHOLD) {
    notices.push(
      `Mit ${chfRound(b.revenueYear)} Umsatz pro Jahr liegst du über ${chfRound(VAT_THRESHOLD)}: KOVALI wird MWST-pflichtig. Melde dich innert 30 Tagen bei der ESTV an; danach kommen ${formatPercent(s.vatRate)} MWST auf deine Rechnungen.`,
    );
  }

  return finish(
    { model: "rechnung", rateBasis: null, hoursPerYear: b.hoursYear, hoursOverridden: b.hoursOverridden, revenueYear: b.revenueYear, revenueLabel: "Umsatz ohne MWST" },
    lines,
    notices,
  );
}

const payrollGroups: Record<string, LineGroup> = {
  ahvIvEo: "sozialversicherung",
  alv: "sozialversicherung",
  fak: "sozialversicherung",
  famel: "sozialversicherung",
  akAdmin: "sozialversicherung",
  gav: "sozialversicherung",
  bvg: "vorsorge",
  uvgBu: "versicherung",
  uvgNbu: "versicherung",
  ktg: "versicherung",
};

/** Payroll lines that rest on planning values (policy or pension plan). */
const payrollEstimates: Record<string, EarningsLine["estimate"]> = { uvgNbu: "Annahme", uvgBu: "Annahme", ktg: "Annahme", bvg: "Annahme" };

function bvgNote(pr: PayrollResult, rates: PayrollRates, share: "du" | "beide"): string {
  if (!pr.bvg.applies) return "unter der Eintrittsschwelle";
  const yours = 100 - clamp(rates.bvgEmployerShare, 0, 100);
  return `koordinierter Lohn ${chfRound(pr.bvg.coordinatedSalary)}, ${formatPercent(pr.bvg.savingsPercent)} Altersgutschrift + ${formatPercent(rates.bvgRiskPercent)} Risiko${
    share === "du" ? `, davon ${formatPercent(yours)} du` : ""
  }`;
}

/** Rates of a payroll line on each side, for the notes of the cost-rate model. */
function sides(key: string, r: PayrollRates): { firm: number; you: number } | null {
  switch (key) {
    case "ahvIvEo":
      return { firm: r.ahvIvEo, you: r.ahvIvEo };
    case "alv":
      return { firm: r.alv, you: r.alv };
    case "ktg":
      return { firm: r.ktgEmployer, you: r.ktgEmployee };
    case "gav":
      return { firm: r.gavEmployer, you: r.gavEmployee };
    case "fak":
      return { firm: r.fak, you: 0 };
    case "famel":
      return { firm: r.famel, you: 0 };
    case "uvgBu":
      return { firm: r.uvgBu, you: 0 };
    case "uvgNbu":
      return { firm: 0, you: r.uvgNbu };
    default:
      return null;
  }
}

function payrollEarnings(input: EarningsInput, rateHourly: number, hoursYear: number, hoursOverridden: boolean, expensesYear: number, s: EarningsSettings): Earnings | null {
  const rates = payrollRatesFor(s);
  const hoursMonth = hoursYear / 12;
  const lines: EarningsLine[] = [];
  const notices: string[] = [];
  const revenueYear = rateHourly * hoursYear;
  const cost = input.rateBasis === "kostensatz";
  let pr: PayrollResult;

  if (cost) {
    const fee = clamp(s.providerFeePercent, 0, 99);
    const plan = wageFromRate({ rate: rateHourly, unit: "stunde", retainedPercent: fee, hoursPerMonth: hoursMonth, age: s.age }, rates);
    if (!plan) return null;
    pr = plan.payroll;
    if (fee > 0) lines.push(line("lohn-gebuehr", "Gebühr des Anbieters", "kosten", fee, revenueYear * p(fee), { estimate: "Annahme" }));
    for (const l of pr.lines) {
      const amount = (l.employer + l.employee) * hoursYear;
      if (!(amount > 0)) continue;
      const side = sides(l.key, rates);
      const note =
        l.key === "bvg"
          ? bvgNote(pr, rates, "beide")
          : l.key === "akAdmin"
            ? `${formatPercent(rates.akAdminPercent)} der AHV/IV/EO-Beiträge, zahlt die Firma`
            : side && side.you === 0
              ? "zahlt die Firma"
              : side && side.firm === 0
                ? "dein Anteil"
                : side
                  ? `Firma ${formatPercent(side.firm)}, du ${formatPercent(side.you)}`
                  : undefined;
      const percent = side ? side.firm + side.you : null;
      lines.push(line(`lohn-${l.key}`, l.label, payrollGroups[l.key] ?? "sozialversicherung", percent, amount, { note, estimate: payrollEstimates[l.key] }));
    }
    lines.push(
      line("lohn-brutto", "Dein Bruttolohn", "info", null, pr.grossHourly * hoursYear, {
        note: `${formatChf(pr.grossHourly)} pro Stunde, nach den Beiträgen der Firma`,
      }),
    );
  } else {
    pr = payrollFromGross({ grossHourly: rateHourly, hoursPerMonth: hoursMonth, age: s.age }, rates);
    for (const l of pr.lines) {
      const amount = l.employee * hoursYear;
      if (!(amount > 0)) continue;
      const capped = (l.key === "alv" && pr.grossAnnual > rates.alvMaxSalary) || (l.key === "uvgNbu" && pr.grossAnnual > rates.uvgMaxSalary);
      const percent = l.key === "ktg" ? rates.ktgEmployee : l.key === "gav" ? rates.gavEmployee : l.key === "bvg" ? null : l.percent;
      const note = l.key === "bvg" ? bvgNote(pr, rates, "du") : capped ? `nur bis ${chfRound(l.key === "alv" ? rates.alvMaxSalary : rates.uvgMaxSalary)} Jahreslohn` : undefined;
      lines.push(line(`lohn-${l.key}`, l.label, payrollGroups[l.key] ?? "sozialversicherung", percent, amount, { note, estimate: payrollEstimates[l.key] }));
    }
    lines.push(
      line("lohn-arbeitgeber", "Beiträge der Firma", "info", null, pr.employerContributions * hoursYear, {
        note: "zahlt die Firma zusätzlich zu deinem Lohn",
      }),
    );
  }

  lines.push(
    line("lohn-ferien", "Im Lohn enthalten: Ferienentschädigung", "info", rates.holidayPercent, pr.holiday * hoursYear, {
      note: "kommt mit jeder Stunde, in den Ferien gibt es keinen Lohn",
    }),
    line("lohn-feiertage", "Im Lohn enthalten: Feiertagsentschädigung", "info", rates.publicHolidayPercent, pr.publicHoliday * hoursYear),
  );
  if (rates.thirteenthEnabled) {
    lines.push(line("lohn-13", "Im Lohn enthalten: 13. Monatslohn", "info", rates.thirteenthPercent, pr.thirteenth * hoursYear));
  }
  if (expensesYear > 0) lines.push(line("spesen", "Eigene Spesen", "kosten", null, expensesYear, { note: "nicht vergütet" }));
  pushTaxReserve(lines, revenueYear, s);
  if (!pr.bvg.applies && s.age >= 25 && s.age <= 65) {
    notices.push(`Der Jahreslohn liegt unter der BVG-Eintrittsschwelle von ${chfRound(rates.bvgEntryThreshold)}: keine Pensionskasse.`);
  }

  return finish(
    {
      model: "lohn",
      rateBasis: cost ? "kostensatz" : "brutto",
      hoursPerYear: hoursYear,
      hoursOverridden,
      revenueYear,
      revenueLabel: cost ? "Kostensatz × Stunden" : "Bruttolohn inkl. Zuschläge",
    },
    lines,
    notices,
  );
}

interface Prepared {
  rateHourly: number;
  hoursYear: number;
  hoursOverridden: boolean;
  expensesYear: number;
}

function prepare(input: EarningsInput, s: EarningsSettings): Prepared | null {
  const rateHourly = toHourly(input.rate, input.unit);
  if (rateHourly === null || !(rateHourly > 0) || !Number.isFinite(rateHourly)) return null;
  const override = input.hoursPerMonth !== null && input.hoursPerMonth !== undefined && input.hoursPerMonth > 0 ? input.hoursPerMonth : null;
  const hoursYear = override !== null ? override * 12 : hoursPerYear(clamp(input.workload, 1, 100), s);
  if (!(hoursYear > 0)) return null;
  const expenses = input.expensesMonthly && input.expensesMonthly > 0 ? input.expensesMonthly : 0;
  return { rateHourly, hoursYear, hoursOverridden: override !== null, expensesYear: expenses * 12 };
}

/** What is left of one rate. Null when the rate is missing or not positive. */
export function computeEarnings(input: EarningsInput, s: EarningsSettings): Earnings | null {
  const x = prepare(input, s);
  if (!x) return null;
  if (input.billing === "rechnung") {
    return invoiceEarnings({ revenueYear: x.rateHourly * x.hoursYear, expensesYear: x.expensesYear, hoursYear: x.hoursYear, hoursOverridden: x.hoursOverridden }, s);
  }
  return payrollEarnings(input, x.rateHourly, x.hoursYear, x.hoursOverridden, x.expensesYear, s);
}

/**
 * Several assignments at once (the dashboard). Invoiced assignments share one Einzelfirma, so
 * their revenue is added up first: AHV with its scale, the FAK ceiling and the fixed costs count
 * once. Payroll assignments are separate employments and are computed one by one.
 * Lines with the same key are added up.
 */
export function computeEarningsTotal(inputs: EarningsInput[], s: EarningsSettings): Earnings | null {
  const parts: Earnings[] = [];
  const invoice = { revenueYear: 0, expensesYear: 0, hoursYear: 0, hoursOverridden: false, count: 0 };
  for (const input of inputs) {
    if (input.billing === "rechnung") {
      const x = prepare(input, s);
      if (!x) continue;
      invoice.revenueYear += x.rateHourly * x.hoursYear;
      invoice.expensesYear += x.expensesYear;
      invoice.hoursYear += x.hoursYear;
      invoice.hoursOverridden ||= x.hoursOverridden;
      invoice.count++;
    } else {
      const e = computeEarnings(input, s);
      if (e) parts.push(e);
    }
  }
  if (invoice.count) parts.unshift(invoiceEarnings(invoice, s));
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];

  const byKey = new Map<string, EarningsLine>();
  for (const part of parts) {
    for (const l of part.lines) {
      const prev = byKey.get(l.key);
      if (!prev) {
        byKey.set(l.key, { ...l });
        continue;
      }
      prev.month += l.month;
      prev.year += l.year;
      if (prev.percent !== l.percent) prev.percent = null;
      if (prev.note !== l.note) prev.note = undefined;
    }
  }
  const order = LINE_GROUPS.map((g) => g.id);
  const lines = [...byKey.values()].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  const revenueYear = parts.reduce((a, e) => a + e.revenue.year, 0);
  const hours = parts.reduce((a, e) => a + e.hoursPerYear, 0);
  const models = new Set(parts.map((e) => e.model));
  const bases = new Set(parts.map((e) => e.rateBasis));
  return finish(
    {
      model: models.size === 1 ? parts[0].model : "gemischt",
      rateBasis: bases.size === 1 ? parts[0].rateBasis : null,
      hoursPerYear: hours,
      hoursOverridden: parts.some((e) => e.hoursOverridden),
      revenueYear,
      revenueLabel: models.size === 1 && bases.size === 1 ? parts[0].revenue.label : "Einnahmen aller Aufträge",
    },
    lines,
    [...new Set(parts.flatMap((e) => e.notices))],
  );
}

/** The earnings input of a stored assignment; null without a rate. */
export function assignmentEarningsInput(a: {
  rateAmount: number | null;
  rateUnit: string;
  workload: number;
  billing: string;
  rateBasis: string;
  hoursPerMonth: number | null;
  expensesMonthly: number | null;
}): EarningsInput | null {
  if (a.rateAmount === null || !(a.rateAmount > 0)) return null;
  return {
    rate: a.rateAmount,
    unit: a.rateUnit === "tag" ? "tag" : "stunde",
    workload: a.workload,
    billing: a.billing === "lohn" ? "lohn" : "rechnung",
    rateBasis: a.rateBasis === "kostensatz" ? "kostensatz" : "brutto",
    hoursPerMonth: a.hoursPerMonth,
    expensesMonthly: a.expensesMonthly,
  };
}

/** Short name of the model, e.g. "Rechnung" or "Lohn, Kostensatz". */
export function modelLabel(billing: string, rateBasis?: string | null): string {
  if (billing !== "lohn") return "Rechnung";
  return rateBasis === "kostensatz" ? "Lohn, Kostensatz" : "Lohn, brutto";
}

/** "CHF 120.00 pro Stunde", short "CHF 120 / h" (shared with the vacancies, see format.ts). */
export { formatRate };

/** "158.2 Stunden pro Monat" for hints. */
export function formatHours(hours: number): string {
  return `${formatNumber(hours, 1)} Stunden`;
}
