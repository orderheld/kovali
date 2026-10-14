import { HOURS_PER_DAY, toHourly, WORKDAYS_PER_MONTH } from "./rates";

/**
 * Calculator for the admin area ("Rechner"). Pure functions without I/O, so every figure on
 * the page can be checked by hand (see payroll.test.ts).
 *
 * KOVALI works with specialists through their own firm (GmbH/AG as subcontractor), so the
 * primary calculation is the B2B margin. The payroll part answers "what can the specialist's
 * firm pay them as salary out of its invoice to KOVALI", and can later serve for KOVALI's own
 * employees. KOVALI has no licence for Personalverleih (AVG): placing its own employees with
 * clients would need one. All percentages are editable on the page; OFFICIAL_RATES are the
 * defaults with their sources in RATE_SOURCES.
 */

// --- Subunternehmer (B2B) ------------------------------------------------------------------

export interface B2bInput {
  /** Rate the client (Auftraggeber) pays. */
  sell: number;
  sellUnit: "stunde" | "tag";
  /** Rate KOVALI pays the subcontractor. */
  buy: number;
  buyUnit: "stunde" | "tag";
  /** 10–100 % of a full-time month (8.4 h × 21 days). */
  workloadPercent: number;
  /** VAT (MWST): rates are net. Without its own VAT number KOVALI cannot reclaim the
   * subcontractor's VAT, so that VAT becomes a cost. */
  vat?: { kovaliRegistered: boolean; subcontractorCharges: boolean; ratePercent: number };
}

export interface B2bResult {
  sellHourly: number;
  buyHourly: number;
  hoursPerMonth: number;
  /** Margin in CHF per hour, day (8.4 h), month (at the workload) and year (12 months). */
  perHour: number;
  perDay: number;
  perMonth: number;
  perYear: number;
  /** Margin as share of the selling rate, 0–100. */
  percent: number;
  /** Markup on the buying rate, 0–∞. */
  markupPercent: number | null;
  revenuePerMonth: number;
  costPerMonth: number;
  revenuePerYear: number;
  /** Buying cost per hour including VAT KOVALI cannot reclaim. */
  costHourly: number;
  /** Unrecoverable VAT per hour (0 when KOVALI is registered or the subcontractor charges none). */
  vatCostHourly: number;
  /** What KOVALI invoices the client per hour incl. VAT (equal to the net rate if not registered). */
  invoiceHourlyGross: number;
}

/** MWST standard rate since 1.1.2024. */
export const VAT_RATE_PERCENT = 8.1;
/** Turnover from which a business must register for MWST (Art. 10 Abs. 2 lit. a MWSTG). */
export const VAT_THRESHOLD = 100_000;

/** Billable hours per month at a workload, as in rates.ts (8.4 h × 21 days). */
export function hoursPerMonth(workloadPercent: number): number {
  const workload = clamp(workloadPercent, 0, 100);
  return round(HOURS_PER_DAY * WORKDAYS_PER_MONTH * (workload / 100), 2);
}

export function b2bMargin(input: B2bInput): B2bResult | null {
  const sellHourly = toHourly(input.sell, input.sellUnit);
  const buyHourly = toHourly(input.buy, input.buyUnit);
  if (sellHourly === null || buyHourly === null || !(sellHourly > 0) || buyHourly < 0) return null;
  const hours = hoursPerMonth(input.workloadPercent);
  const vatRate = (input.vat?.ratePercent ?? VAT_RATE_PERCENT) / 100;
  const vatCostHourly = input.vat && input.vat.subcontractorCharges && !input.vat.kovaliRegistered ? buyHourly * vatRate : 0;
  const costHourly = buyHourly + vatCostHourly;
  const perHour = sellHourly - costHourly;
  return {
    sellHourly,
    buyHourly,
    hoursPerMonth: hours,
    perHour,
    perDay: perHour * HOURS_PER_DAY,
    perMonth: perHour * hours,
    perYear: perHour * hours * 12,
    percent: (perHour / sellHourly) * 100,
    markupPercent: costHourly > 0 ? (perHour / costHourly) * 100 : null,
    revenuePerMonth: sellHourly * hours,
    costPerMonth: costHourly * hours,
    revenuePerYear: sellHourly * hours * 12,
    costHourly,
    vatCostHourly,
    invoiceHourlyGross: input.vat?.kovaliRegistered ? sellHourly * (1 + vatRate) : sellHourly,
  };
}

/**
 * Highest buying rate (net, in the selling rate's unit) that still leaves the target margin.
 * `unrecoverableVatPercent` is the subcontractor's VAT when KOVALI cannot reclaim it.
 */
export function buyRateForTargetMargin(sell: number, targetPercent: number, unrecoverableVatPercent = 0): number | null {
  if (!(sell > 0) || !Number.isFinite(targetPercent) || targetPercent >= 100) return null;
  return (sell * (1 - targetPercent / 100)) / (1 + unrecoverableVatPercent / 100);
}

// --- Lohn (Firma der Fachperson, später eigene Angestellte) ----------------------------------

export interface PayrollRates {
  /** Paid holiday weeks per year; sets the holiday supplement (see holidaySupplement()). */
  holidayWeeks: number;
  /** Ferienentschädigung in % of base wage + public-holiday compensation. */
  holidayPercent: number;
  /** Feiertagsentschädigung in % of the base wage. */
  publicHolidayPercent: number;
  thirteenthEnabled: boolean;
  /** 13. Monatslohn in % of base wage + both supplements (1/12 = 8.33 %). */
  thirteenthPercent: number;

  /** AHV/IV/EO, per side (employer and employee pay the same). */
  ahvIvEo: number;
  /** ALV per side, only on the salary up to alvMaxSalary. */
  alv: number;
  alvMaxSalary: number;
  /** Familienausgleichskasse (employer only). */
  fak: number;
  /** Familienergänzungsleistungen Kanton SO, collected with the FAK (employer only). */
  famel: number;
  /** Administrative costs of the AHV fund in % of the AHV/IV/EO contributions (both sides). */
  akAdminPercent: number;
  /** Accident insurance: occupational (employer) and non-occupational (employee), up to uvgMaxSalary. */
  uvgBu: number;
  uvgNbu: number;
  uvgMaxSalary: number;
  /** Daily sickness allowance insurance (KTG), shares of employer and employee. */
  ktgEmployer: number;
  ktgEmployee: number;

  /** BVG (occupational pension), statutory minimum plan. */
  bvgEntryThreshold: number;
  bvgCoordinationDeduction: number;
  bvgUpperLimit: number;
  bvgMinCoordinated: number;
  /** Savings credits in % of the coordinated salary for ages 25–34, 35–44, 45–54, 55–65. */
  bvgCredit25: number;
  bvgCredit35: number;
  bvgCredit45: number;
  bvgCredit55: number;
  /** Risk and administration costs in % of the coordinated salary. */
  bvgRiskPercent: number;
  /** Employer share of the BVG contributions, at least 50 % (Art. 66 BVG). */
  bvgEmployerShare: number;

  /** GAV Personalverleih contributions (Vollzug, Weiterbildung, Sozialfonds). */
  gavEnabled: boolean;
  gavEmployer: number;
  gavEmployee: number;
}

/** The date the defaults below were checked. Shown next to the rates; check yearly. */
export const RATES_AS_OF = "2026-10-13";

/** Defaults for 2026. Every value is listed with its source in RATE_SOURCES. */
export const OFFICIAL_RATES: PayrollRates = {
  holidayWeeks: 5,
  holidayPercent: 10.64,
  publicHolidayPercent: 3.59,
  thirteenthEnabled: true,
  thirteenthPercent: 8.33,
  ahvIvEo: 5.3,
  alv: 1.1,
  alvMaxSalary: 148_200,
  fak: 1.25,
  famel: 0.12,
  akAdminPercent: 4,
  uvgBu: 0.1,
  uvgNbu: 1.2,
  uvgMaxSalary: 148_200,
  ktgEmployer: 0.6,
  ktgEmployee: 0.6,
  bvgEntryThreshold: 22_680,
  bvgCoordinationDeduction: 26_460,
  bvgUpperLimit: 90_720,
  bvgMinCoordinated: 3_780,
  bvgCredit25: 7,
  bvgCredit35: 10,
  bvgCredit45: 15,
  bvgCredit55: 18,
  bvgRiskPercent: 2,
  bvgEmployerShare: 50,
  gavEnabled: false,
  gavEmployer: 0.4,
  gavEmployee: 0.4,
};

export interface RateSource {
  /** Fields of PayrollRates the source covers. */
  keys: (keyof PayrollRates)[];
  label: string;
  /** "amtlich": published by an authority or in the law; "annahme": planning value, depends on the policy. */
  kind: "amtlich" | "annahme";
  source: string;
  url?: string;
}

/**
 * Where each default comes from (research of 13.10.2026, via web search; several official
 * sites could not be opened directly, so the values must be checked once a year).
 */
export const RATE_SOURCES: RateSource[] = [
  {
    keys: ["ahvIvEo"],
    label: "AHV/IV/EO 5.3 % je Seite (AHV 4.35 %, IV 0.7 %, EO 0.25 %)",
    kind: "amtlich",
    source: "BSV, Synoptische Tabelle der Beitragssätze, Stand 1.1.2026",
    url: "https://sozialversicherungen.admin.ch/de/d/6877/download",
  },
  {
    keys: ["alv", "alvMaxSalary"],
    label: "ALV 1.1 % je Seite bis CHF 148’200 Jahreslohn; kein Solidaritätsbeitrag darüber (seit 2023)",
    kind: "amtlich",
    source: "BSV, Entwicklung der Beitragssätze 2026",
    url: "https://www.bsv.admin.ch/dam/de/sd-web/p1k1Z4DTI902/Entwicklung_Beitragss%C3%A4tze_2026.pdf",
  },
  {
    keys: ["uvgMaxSalary"],
    label: "UVG: höchstversicherter Verdienst CHF 148’200",
    kind: "amtlich",
    source: "Suva, UVG-Leistungsübersicht 2026",
    url: "https://www.suva.ch/de-ch/download/factsheets/uvg-leistungsuebersicht/uvg-leistungsuebersicht--2533.D?lang=de-CH",
  },
  {
    keys: ["bvgEntryThreshold", "bvgCoordinationDeduction", "bvgUpperLimit", "bvgMinCoordinated"],
    label: "BVG 2026: Eintrittsschwelle CHF 22’680, Koordinationsabzug CHF 26’460, oberer Grenzbetrag CHF 90’720, min. koordinierter Lohn CHF 3’780 (unverändert seit 2025)",
    kind: "amtlich",
    source: "BSV, Wichtige Masszahlen der beruflichen Vorsorge 2025/2026",
    url: "https://www.bsv.admin.ch/dam/de/sd-web/GZplHByBJoFc/Internet_Masszahlenarticles_25_26_d.pdf",
  },
  {
    keys: ["bvgCredit25", "bvgCredit35", "bvgCredit45", "bvgCredit55", "bvgEmployerShare"],
    label: "BVG-Altersgutschriften 7 / 10 / 15 / 18 % des koordinierten Lohns; Arbeitgeber trägt mindestens die Hälfte",
    kind: "amtlich",
    source: "Art. 16 und Art. 66 BVG (SR 831.40)",
    url: "https://www.fedlex.admin.ch/eli/cc/1983/797_797_797/de",
  },
  {
    keys: ["fak"],
    label: "FAK Kanton Solothurn 1.25 % (Ausgleichskasse SO). Erhöhung auf ca. 1.44 % mit den höheren Familienzulagen (Volksabstimmung 8.3.2026) voraussichtlich ab 2027",
    kind: "amtlich",
    source: "Regierungsrat SO, Botschaft 2025/136 (Anhebung Familienzulagen); Medienmitteilung Kanton SO vom 8.3.2026",
    url: "https://so.ch/verwaltung/staatskanzlei/medien/medienmitteilung/news/abstimmung-ja-zur-anhebung-der-familienzulagen/",
  },
  {
    keys: ["famel"],
    label: "FamEL Kanton Solothurn 0.12 % für 2026 (mit der FAK erhoben)",
    kind: "amtlich",
    source: "Regierungsratsbeschluss SO Nr. 2025/1693 vom 21.10.2025",
    url: "https://rrb.so.ch/beschlussnummer/2025_1693/download/9dbc56dc6f5249f6a3ea0f8f578c785d",
  },
  {
    keys: ["akAdminPercent"],
    label: "Verwaltungskosten AK: 4 % der AHV/IV/EO-Beiträge (Stufe bis CHF 200’000 Lohnsumme, Höchstsatz Bund 5 %)",
    kind: "amtlich",
    source: "Verordnung über die Verwaltungskostenbeiträge an die Ausgleichskasse SO (BGS 835.1, zuletzt gefundene Fassung 2016) – bei der Ausgleichskasse bestätigen",
    url: "https://bgs.so.ch/frontend/versions/3870/download_pdf_file",
  },
  {
    keys: ["gavEmployer", "gavEmployee", "gavEnabled"],
    label: "GAV Personalverleih 2024–2027: 0.4 % Arbeitgeber und 0.4 % Arbeitnehmende (vorher 0.3 / 0.7 %). Gilt nur für Betriebe mit Verleihbewilligung",
    kind: "amtlich",
    source: "Medienmitteilung der Sozialpartner vom 16.11.2023 (Einigung GAV Personalverleih)",
    url: "https://www.kfmv.ch/fileadmin/national/doc/MM_PDF/neu_20231116_Medienmitteilung_Einigung-zum-GAV-Personalverleih_DE.pdf",
  },
  {
    keys: ["holidayWeeks", "holidayPercent", "publicHolidayPercent", "thirteenthPercent", "thirteenthEnabled"],
    label: "Ferien 4 / 5 / 6 Wochen = 8.33 / 10.64 / 13.04 %; Feiertage z. B. 9 Tage = 3.59 %; 13. Monatslohn 1/12 = 8.33 %",
    kind: "amtlich",
    source: "Art. 329a OR (mindestens 4 Wochen); Formel Ferientage ÷ (260 − Ferientage); Feiertage je nach Kanton und Vertrag",
  },
  {
    keys: ["uvgBu", "uvgNbu"],
    label: "UVG Berufsunfall 0.1 % (Arbeitgeber), Nichtberufsunfall 1.2 % (Arbeitnehmende)",
    kind: "annahme",
    source: "Richtwerte für Bürotätigkeit. Massgebend ist die Police (Suva-Tarif 2026 für Personalverleih: Betriebsteil «Finanz und Informatik»)",
  },
  {
    keys: ["ktgEmployer", "ktgEmployee"],
    label: "Krankentaggeld 1.2 % total, hälftig geteilt",
    kind: "annahme",
    source: "Richtwert; Prämie gemäss Offerte. Der Arbeitgeber trägt üblicherweise mindestens die Hälfte",
  },
  {
    keys: ["bvgRiskPercent"],
    label: "BVG Risiko- und Verwaltungskosten 2 % des koordinierten Lohns",
    kind: "annahme",
    source: "Richtwert; massgebend ist der Vorsorgeplan der Pensionskasse",
  },
];

export const VAT_SOURCE: RateSource = {
  keys: [],
  label: "MWST-Normalsatz 8.1 % seit 1.1.2024; MWST-pflichtig ab CHF 100’000 Umsatz pro Jahr",
  kind: "amtlich",
  source: "ESTV, MWST-Sätze; Art. 10 Abs. 2 lit. a MWSTG (SR 641.20)",
  url: "https://www.estv.admin.ch/de/mwst-steuersaetze",
};

/** Scenario defaults of the wage calculator (not rates; saved together with them). */
export interface WageDefaults {
  /** Share of the invoice the specialist's firm keeps (reserves, accounting, insurance, profit). */
  retainedPercent: number;
  hoursPerMonth: number;
  age: number;
}

export const WAGE_DEFAULTS: WageDefaults = {
  retainedPercent: 5,
  hoursPerMonth: hoursPerMonth(100),
  age: 40,
};

/** Ferienentschädigung for n weeks: holiday days ÷ (260 working days − holiday days). */
export function holidaySupplement(weeks: number): number {
  const days = clamp(weeks, 0, 10) * 5;
  return round((days / (260 - days)) * 100, 2);
}

export interface PayrollScenario {
  /** Grundlohn per hour, without any supplement. */
  baseHourly: number;
  /** Paid (billable) hours per month. */
  hoursPerMonth: number;
  /** Age of the employee in the calculation year (BVG bracket). */
  age: number;
}

export interface PayrollLine {
  key: string;
  label: string;
  /** Rate as shown, e.g. 5.3 (%). Null for amounts without one rate (BVG). */
  percent: number | null;
  /** Per hour, CHF. */
  employer: number;
  employee: number;
  note?: string;
}

export interface PayrollResult {
  base: number;
  publicHoliday: number;
  holiday: number;
  thirteenth: number;
  /** Gross wage per hour including all supplements. */
  grossHourly: number;
  grossMonthly: number;
  grossAnnual: number;
  annualHours: number;
  /** Contributions per hour. */
  lines: PayrollLine[];
  employerContributions: number;
  employeeDeductions: number;
  /** What one hour costs the employer (gross + employer contributions). */
  employerCostHourly: number;
  employerCostMonthly: number;
  /** Approximate net wage before withholding tax (Quellensteuer). */
  netHourly: number;
  netMonthly: number;
  bvg: { coordinatedSalary: number; savingsPercent: number; annualTotal: number; applies: boolean };
}

/** BVG savings credit for an age: none below 25 (risk cover only) and above 65. */
export function bvgSavingsPercent(age: number, rates: PayrollRates): number {
  if (age < 25 || age > 65) return 0;
  if (age < 35) return rates.bvgCredit25;
  if (age < 45) return rates.bvgCredit35;
  if (age < 55) return rates.bvgCredit45;
  return rates.bvgCredit55;
}

/** Coordinated salary under the BVG minimum plan; 0 when the salary is below the entry threshold. */
export function coordinatedSalary(annual: number, rates: PayrollRates): number {
  if (annual < rates.bvgEntryThreshold) return 0;
  const coordinated = Math.min(annual, rates.bvgUpperLimit) - rates.bvgCoordinationDeduction;
  return Math.max(coordinated, rates.bvgMinCoordinated);
}

/**
 * Full breakdown for a base hourly wage. Supplements build on each other as usual for hourly
 * wages: public holidays on the base wage, holidays on base + public holidays, the 13th
 * month on all three. Contributions with a salary ceiling (ALV, UVG) and the BVG depend on
 * the annual salary, so they are computed per year and divided by the annual hours.
 */
export function payrollFromBase(scenario: PayrollScenario, rates: PayrollRates): PayrollResult {
  const base = Math.max(scenario.baseHourly, 0);
  const hoursMonth = Math.max(scenario.hoursPerMonth, 0);
  const annualHours = hoursMonth * 12;
  const p = (v: number) => v / 100;

  const publicHoliday = base * p(rates.publicHolidayPercent);
  const holiday = (base + publicHoliday) * p(rates.holidayPercent);
  const thirteenth = rates.thirteenthEnabled ? (base + publicHoliday + holiday) * p(rates.thirteenthPercent) : 0;
  const grossHourly = base + publicHoliday + holiday + thirteenth;
  const grossAnnual = grossHourly * annualHours;

  const perHour = (annual: number) => (annualHours > 0 ? annual / annualHours : 0);
  const alvBase = Math.min(grossAnnual, rates.alvMaxSalary);
  const uvgBase = Math.min(grossAnnual, rates.uvgMaxSalary);

  const age = Math.round(scenario.age);
  const coordinated = age >= 18 && age <= 65 ? coordinatedSalary(grossAnnual, rates) : 0;
  const savings = bvgSavingsPercent(age, rates);
  const bvgAnnual = coordinated * p(savings + rates.bvgRiskPercent);
  const employerShare = clamp(rates.bvgEmployerShare, 0, 100) / 100;

  const ahv = grossHourly * p(rates.ahvIvEo);
  const lines: PayrollLine[] = [
    { key: "ahvIvEo", label: "AHV/IV/EO", percent: rates.ahvIvEo, employer: ahv, employee: ahv },
    {
      key: "alv",
      label: "ALV",
      percent: rates.alv,
      employer: perHour(alvBase * p(rates.alv)),
      employee: perHour(alvBase * p(rates.alv)),
      note: grossAnnual > rates.alvMaxSalary ? "nur bis zum Höchstlohn" : undefined,
    },
    { key: "fak", label: "Familienausgleichskasse (FAK)", percent: rates.fak, employer: grossHourly * p(rates.fak), employee: 0 },
    { key: "famel", label: "FamEL (Kanton SO)", percent: rates.famel, employer: grossHourly * p(rates.famel), employee: 0 },
    {
      key: "akAdmin",
      label: "Verwaltungskosten Ausgleichskasse",
      percent: rates.akAdminPercent,
      employer: 2 * ahv * p(rates.akAdminPercent),
      employee: 0,
      note: "in % der AHV/IV/EO-Beiträge",
    },
    { key: "uvgBu", label: "UVG Berufsunfall", percent: rates.uvgBu, employer: perHour(uvgBase * p(rates.uvgBu)), employee: 0 },
    { key: "uvgNbu", label: "UVG Nichtberufsunfall", percent: rates.uvgNbu, employer: 0, employee: perHour(uvgBase * p(rates.uvgNbu)) },
    { key: "ktg", label: "Krankentaggeld", percent: null, employer: grossHourly * p(rates.ktgEmployer), employee: grossHourly * p(rates.ktgEmployee) },
    {
      key: "bvg",
      label: "BVG (Pensionskasse)",
      percent: null,
      employer: perHour(bvgAnnual * employerShare),
      employee: perHour(bvgAnnual * (1 - employerShare)),
      note: coordinated > 0 ? undefined : "unter der Eintrittsschwelle oder ausserhalb des BVG-Alters",
    },
  ];
  if (rates.gavEnabled) {
    lines.push({
      key: "gav",
      label: "GAV Personalverleih",
      percent: null,
      employer: grossHourly * p(rates.gavEmployer),
      employee: grossHourly * p(rates.gavEmployee),
    });
  }

  const employerContributions = sum(lines.map((l) => l.employer));
  const employeeDeductions = sum(lines.map((l) => l.employee));
  const employerCostHourly = grossHourly + employerContributions;
  const netHourly = grossHourly - employeeDeductions;
  return {
    base,
    publicHoliday,
    holiday,
    thirteenth,
    grossHourly,
    grossMonthly: grossHourly * hoursMonth,
    grossAnnual,
    annualHours,
    lines,
    employerContributions,
    employeeDeductions,
    employerCostHourly,
    employerCostMonthly: employerCostHourly * hoursMonth,
    netHourly,
    netMonthly: netHourly * hoursMonth,
    bvg: { coordinatedSalary: coordinated, savingsPercent: savings, annualTotal: bvgAnnual, applies: coordinated > 0 },
  };
}

export interface WagePlan {
  payroll: PayrollResult;
  /** Invoice amount per hour that pays for the wage (e.g. the subcontractor's rate to KOVALI). */
  rateHourly: number;
  rateDaily: number;
  /** Part of the rate the firm keeps (reserves, own costs, profit). */
  retainedHourly: number;
  retainedMonthly: number;
  retainedPercent: number;
}

function planFor(payroll: PayrollResult, rateHourly: number, hoursMonth: number): WagePlan {
  const retainedHourly = rateHourly - payroll.employerCostHourly;
  return {
    payroll,
    rateHourly,
    rateDaily: rateHourly * HOURS_PER_DAY,
    retainedHourly,
    retainedMonthly: retainedHourly * hoursMonth,
    retainedPercent: rateHourly > 0 ? (retainedHourly / rateHourly) * 100 : 0,
  };
}

/**
 * From an invoice amount to the wage: the firm receives `rate` per hour, keeps
 * `retainedPercent` and spends the rest on salary plus employer contributions. Finds the
 * highest base wage whose employer cost fits that budget. The cost grows with the wage (with a
 * step at the BVG entry threshold), so a bisection finds it reliably.
 */
export function wageFromRate(
  input: { rate: number; unit: "stunde" | "tag"; retainedPercent: number; hoursPerMonth: number; age: number },
  rates: PayrollRates,
): WagePlan | null {
  const rateHourly = toHourly(input.rate, input.unit);
  if (rateHourly === null || !(rateHourly > 0) || !(input.retainedPercent < 100)) return null;
  const budget = rateHourly * (1 - input.retainedPercent / 100);
  const scenario = (base: number) => ({ baseHourly: base, hoursPerMonth: input.hoursPerMonth, age: input.age });
  let lo = 0;
  let hi = Math.max(budget, 0);
  for (let i = 0; i < 80 && hi > 0; i++) {
    const mid = (lo + hi) / 2;
    if (payrollFromBase(scenario(mid), rates).employerCostHourly <= budget) lo = mid;
    else hi = mid;
  }
  return planFor(payrollFromBase(scenario(lo), rates), rateHourly, input.hoursPerMonth);
}

/** From a base wage to the invoice amount needed to pay it and keep `retainedPercent`. */
export function rateFromWage(
  input: { baseHourly: number; retainedPercent: number; hoursPerMonth: number; age: number },
  rates: PayrollRates,
): WagePlan | null {
  if (!(input.baseHourly > 0) || !(input.retainedPercent < 100)) return null;
  const payroll = payrollFromBase({ baseHourly: input.baseHourly, hoursPerMonth: input.hoursPerMonth, age: input.age }, rates);
  return planFor(payroll, payroll.employerCostHourly / (1 - input.retainedPercent / 100), input.hoursPerMonth);
}

// --- helpers ------------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Parses "1'250.50", "1250,50" or "8,33" from a form field; NaN when empty or invalid. */
export function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const s = value.replace(/['’\s]/g, "").replace(",", ".");
  if (s === "" || !/^-?\d*\.?\d+$/.test(s)) return NaN;
  return Number(s);
}
