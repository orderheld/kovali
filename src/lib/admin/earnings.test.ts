import { describe, expect, it } from "vitest";
import {
  ahvSelfEmployed,
  akAdminPercent,
  assignmentEarningsInput,
  computeEarnings,
  computeEarningsTotal,
  EARNINGS_DEFAULTS,
  EARNINGS_FIELDS,
  hoursPerYear,
  sourcesFor,
  workingDaysPerYear,
  type Earnings,
  type EarningsInput,
  type EarningsSettings,
} from "./earnings";
import { earningsFormSchema, parseEarningsSettings, settingsFromForm } from "./earnings-settings";

/**
 * Expected values were worked out by hand (calculator), step by step in the comments, with the
 * default settings: 5 weeks vacation, 9 public holidays, age 40, Säule 3a 10 %, Krankentaggeld
 * 2 %, accident 3.2 %, liability 1’000, fiduciary 2’500, no tax reserve, not VAT-registered.
 */

const S = EARNINGS_DEFAULTS;
const at = (overrides: Partial<EarningsInput>): EarningsInput => ({
  rate: 120,
  unit: "stunde",
  workload: 100,
  billing: "rechnung",
  rateBasis: "brutto",
  ...overrides,
});
const run = (input: EarningsInput, settings: EarningsSettings = S) => computeEarnings(input, settings)!;
const year = (e: Earnings, key: string) => e.lines.find((l) => l.key === key)?.year;
const deducted = (e: Earnings) => e.lines.filter((l) => l.group !== "info").reduce((a, l) => a + l.year, 0);

describe("hours", () => {
  it("counts 8.4 hours on 226 working days at full time", () => {
    // 260 − 5 × 5 − 9 = 226 days; × 8.4 = 1’898.4 hours; ÷ 12 = 158.2 per month
    expect(workingDaysPerYear(S)).toBe(226);
    expect(hoursPerYear(100, S)).toBeCloseTo(1898.4, 9);
    const e = run(at({}));
    expect(e.hoursPerMonth).toBeCloseTo(158.2, 9);
    expect(e.hoursOverridden).toBe(false);
  });

  it("scales with the workload and honours an override", () => {
    // 80 %: 0.8 × 1’898.4 = 1’518.72 hours, 126.56 per month
    expect(run(at({ workload: 80 })).hoursPerYear).toBeCloseTo(1518.72, 9);
    // 160 hours per month replace the computed value: 1’920 per year, 120 × 1’920 = 230’400
    const o = run(at({ hoursPerMonth: 160, workload: 50 }));
    expect(o.hoursPerYear).toBe(1920);
    expect(o.hoursOverridden).toBe(true);
    expect(o.revenue.year).toBeCloseTo(230_400, 9);
  });

  it("follows vacation weeks and public holidays from the settings", () => {
    // 260 − 4 × 5 − 10 = 230 days × 8.4 = 1’932 hours
    expect(hoursPerYear(100, { vacationWeeks: 4, publicHolidays: 10 })).toBeCloseTo(1932, 9);
  });
});

describe("AHV for the self-employed", () => {
  it("matches the worked examples of the research", () => {
    // 150’000: 10 % = 15’000, administrative costs 3 % = 450, FAK 1.25 % × 148’200 = 1’852.50
    expect(ahvSelfEmployed(150_000, S)).toEqual({ amount: 15_000, percent: 10, basis: "voll" });
    expect(akAdminPercent(150_000, S)).toBe(3);
    // 50’000: step 48’000–50’500 = 7.840 % → 3’920; administrative costs 5 %
    expect(ahvSelfEmployed(50_000, S).amount).toBeCloseTo(3_920, 9);
    expect(akAdminPercent(50_000, S)).toBe(5);
    // 9’000: minimum contribution
    expect(ahvSelfEmployed(9_000, S)).toEqual({ amount: 530, percent: null, basis: "minimum" });
  });

  it("applies the step boundaries of the sliding scale", () => {
    expect(ahvSelfEmployed(10_099, S).basis).toBe("minimum");
    expect(ahvSelfEmployed(10_100, S).percent).toBe(5.371);
    expect(ahvSelfEmployed(17_599, S).percent).toBe(5.371);
    expect(ahvSelfEmployed(17_600, S).percent).toBe(5.494);
    expect(ahvSelfEmployed(60_499, S).percent).toBe(9.321);
    expect(ahvSelfEmployed(60_500, S).percent).toBe(10);
    expect(akAdminPercent(50_001, S)).toBe(4);
    expect(akAdminPercent(100_000, S)).toBe(4);
    expect(akAdminPercent(100_001, S)).toBe(3);
  });
});

describe("invoice via the Einzelfirma", () => {
  it("breaks down CHF 120 per hour at 100 %", () => {
    // Revenue 120 × 1’898.4 = 227’808 (18’984 per month)
    const e = run(at({}));
    expect(e.model).toBe("rechnung");
    expect(e.revenue.year).toBeCloseTo(227_808, 9);
    expect(e.revenue.month).toBeCloseTo(18_984, 9);
    expect(e.revenue.hourly).toBeCloseTo(120, 9);
    // Profit before social contributions: 227’808 − 1’000 − 2’500 = 224’308
    expect(year(e, "ahv")).toBeCloseTo(22_430.8, 6); // 10 %
    expect(year(e, "akAdmin")).toBeCloseTo(672.924, 6); // 3 % of 22’430.80
    expect(year(e, "fak")).toBeCloseTo(1_852.5, 6); // 1.25 % × 148’200 (ceiling)
    // Säule 3a 10 % = 22’430.80; limit 20 % × (224’308 − 22’430.80 − 672.924 − 1’852.50) = 39’870.36, max 36’288
    expect(year(e, "vorsorge")).toBeCloseTo(22_430.8, 6);
    expect(year(e, "ktg")).toBeCloseTo(4_486.16, 6); // 2 % × 224’308
    expect(year(e, "unfall")).toBeCloseTo(4_742.4, 6); // 3.2 % × 148’200 (ceiling)
    expect(year(e, "haftpflicht")).toBe(1_000);
    expect(year(e, "treuhand")).toBe(2_500);
    // Total 60’115.584; net 227’808 − 60’115.584 = 167’692.416 per year, 13’974.368 per month
    expect(deducted(e)).toBeCloseTo(60_115.584, 6);
    expect(e.net.year).toBeCloseTo(167_692.416, 6);
    expect(e.net.month).toBeCloseTo(13_974.368, 6);
    expect(e.net.hourly).toBeCloseTo(167_692.416 / 1898.4, 9);
    expect(e.lines.some((l) => l.key === "steuern" || l.key === "mwst")).toBe(false);
  });

  it("breaks down CHF 120 per hour at 80 %", () => {
    // Revenue 120 × 1’518.72 = 182’246.40; profit 178’746.40
    // AHV 17’874.64 + AK 3 % 536.2392 + FAK 1’852.50 + 3a 17’874.64 + KTG 3’574.928 + accident 4’742.40
    //   + 1’000 + 2’500 = 49’955.3472; net 132’291.0528
    const e = run(at({ workload: 80 }));
    expect(e.revenue.year).toBeCloseTo(182_246.4, 6);
    expect(year(e, "ahv")).toBeCloseTo(17_874.64, 6);
    expect(year(e, "akAdmin")).toBeCloseTo(536.2392, 6);
    expect(deducted(e)).toBeCloseTo(49_955.3472, 6);
    expect(e.net.year).toBeCloseTo(132_291.0528, 6);
  });

  it("uses the sliding scale and the higher administrative costs at a low income", () => {
    // CHF 100 at 28 %: 0.28 × 1’898.4 = 531.552 hours; revenue 53’155.20; profit 49’655.20
    const e = run(at({ rate: 100, workload: 28 }));
    expect(e.revenue.year).toBeCloseTo(53_155.2, 6);
    const ahv = e.lines.find((l) => l.key === "ahv")!;
    expect(ahv.percent).toBe(7.84); // step 48’000–50’500
    expect(ahv.year).toBeCloseTo(3_892.96768, 6); // 7.84 % × 49’655.20
    expect(year(e, "akAdmin")).toBeCloseTo(194.648384, 6); // 5 % (income up to 50’000)
    expect(year(e, "fak")).toBeCloseTo(620.69, 6); // 1.25 % × 49’655.20
    expect(year(e, "vorsorge")).toBeCloseTo(4_965.52, 6); // 10 %, below 20 % of 44’946.89
    expect(year(e, "ktg")).toBeCloseTo(993.104, 6);
    // Accident: insured earnings at least 66’690 → 2’134.08
    expect(year(e, "unfall")).toBeCloseTo(2_134.08, 6);
    // 3’892.96768 + 194.648384 + 620.69 + 4’965.52 + 993.104 + 2’134.08 + 3’500 = 16’301.010064
    expect(e.net.year).toBeCloseTo(53_155.2 - 16_301.010064, 6);
    expect(e.notices).toEqual([]);
  });

  it("charges the minimum contribution on a very small income", () => {
    // CHF 50 at 10 %: 189.84 hours, revenue 9’492, profit 5’992 → minimum CHF 530
    const e = run(at({ rate: 50, workload: 10 }));
    expect(year(e, "ahv")).toBe(530);
    expect(e.lines.find((l) => l.key === "ahv")!.note).toContain("Mindestbeitrag");
    expect(year(e, "akAdmin")).toBeCloseTo(26.5, 9); // 5 % of 530
  });

  it("caps the Säule 3a at the legal maximum", () => {
    // 30 % of 224’308 = 67’292.40; limit min(20 % × 199’351.776 = 39’870.36, 36’288) = 36’288
    const e = run(at({}), { ...S, pensionPercent: 30 });
    expect(year(e, "vorsorge")).toBe(36_288);
    expect(e.lines.find((l) => l.key === "vorsorge")!.note).toContain("gekürzt");
  });

  it("lets half of voluntary BVG contributions reduce the AHV income", () => {
    // BVG 10 % × 224’308 = 22’430.80; AHV income 224’308 − 11’215.40 = 213’092.60 → AHV 21’309.26
    const e = run(at({}), { ...S, pensionMode: "bvg" });
    expect(year(e, "vorsorge")).toBeCloseTo(22_430.8, 6);
    expect(year(e, "ahv")).toBeCloseTo(21_309.26, 6);
    expect(e.lines.find((l) => l.key === "vorsorge")!.label).toContain("Pensionskasse");
  });

  it("subtracts own expenses before AHV and adds a tax reserve on what is left", () => {
    // Expenses 300 per month = 3’600; profit 220’708 → AHV 22’070.80
    const e = run(at({ expensesMonthly: 300 }), { ...S, taxReservePercent: 20 });
    expect(year(e, "spesen")).toBe(3_600);
    expect(year(e, "ahv")).toBeCloseTo(22_070.8, 6);
    const beforeTax = e.revenue.year - deducted(e) + year(e, "steuern")!;
    expect(year(e, "steuern")).toBeCloseTo(beforeTax * 0.2, 6);
    expect(e.net.year).toBeCloseTo(beforeTax * 0.8, 6);
  });

  it("converts a daily rate with 8.4 hours", () => {
    // 1’008 per day = 120 per hour
    expect(run(at({ rate: 1008, unit: "tag" })).net.year).toBeCloseTo(run(at({})).net.year, 6);
  });

  it("warns about MWST above CHF 100’000 revenue and shows it as pass-through once registered", () => {
    expect(run(at({})).notices.join(" ")).toContain("MWST-pflichtig");
    // 40 %: 120 × 759.36 = 91’123.20, below the threshold
    expect(run(at({ workload: 40 })).notices).toEqual([]);
    const registered = run(at({}), { ...S, vatRegistered: true });
    expect(registered.notices).toEqual([]);
    const vat = registered.lines.find((l) => l.key === "mwst")!;
    expect(vat.group).toBe("info");
    expect(vat.year).toBeCloseTo(18_452.448, 6); // 8.1 % × 227’808
    // Pass-through: the net does not change.
    expect(registered.net.year).toBeCloseTo(run(at({})).net.year, 9);
  });

  it("returns null without a usable rate", () => {
    expect(computeEarnings(at({ rate: 0 }), S)).toBeNull();
    expect(computeEarnings(at({ rate: Number.NaN }), S)).toBeNull();
  });
});

describe("payroll at the provider", () => {
  it("treats CHF 100 as an all-in gross wage", () => {
    // Gross 100 × 1’898.4 = 189’840 per year. Deductions: AHV 5.3 % = 10’061.52; ALV 1.1 % up to
    // 148’200 = 1’630.20; NBU 1.2 % up to 148’200 = 1’778.40; KTG 0.6 % = 1’139.04;
    // BVG (64’260 × 12 %) ÷ 2 = 3’855.60. Total 18’464.76; net 171’375.24 (14’281.27 per month)
    const e = run(at({ rate: 100, billing: "lohn", rateBasis: "brutto" }));
    expect(e.model).toBe("lohn");
    expect(e.rateBasis).toBe("brutto");
    expect(e.revenue.year).toBeCloseTo(189_840, 6);
    expect(year(e, "lohn-ahvIvEo")).toBeCloseTo(10_061.52, 6);
    expect(year(e, "lohn-alv")).toBeCloseTo(1_630.2, 6);
    expect(year(e, "lohn-uvgNbu")).toBeCloseTo(1_778.4, 6);
    expect(year(e, "lohn-ktg")).toBeCloseTo(1_139.04, 6);
    expect(year(e, "lohn-bvg")).toBeCloseTo(3_855.6, 6);
    expect(deducted(e)).toBeCloseTo(18_464.76, 6);
    expect(e.net.year).toBeCloseTo(171_375.24, 6);
    expect(e.net.month).toBeCloseTo(14_281.27, 6);
    // Employer side, information only: AHV 10’061.52 + ALV 1’630.20 + FAK 2’373 + FamEL 227.808
    //   + AK 4 % × 20’123.04 = 804.9216 + BU 148.20 + KTG 1’139.04 + BVG 3’855.60 = 20’240.2896
    const employer = e.lines.find((l) => l.key === "lohn-arbeitgeber")!;
    expect(employer.group).toBe("info");
    expect(employer.year).toBeCloseTo(20_240.2896, 6);
    // The supplements are part of the gross wage: base 100 ÷ 1.241591536 = 80.541786 per hour
    const parts = ["lohn-ferien", "lohn-feiertage", "lohn-13"].reduce((a, k) => a + year(e, k)!, 0);
    expect(e.revenue.year - parts).toBeCloseTo(80.54178617 * 1898.4, 4);
  });

  it("treats CHF 120 as the provider's total cost per hour", () => {
    // Employer cost = gross × (1 + 5.3 % + 1.25 % + 0.12 % + 4 % × 10.6 % + 0.6 %) + capped parts per hour
    //   (ALV 1’630.20 + BU 148.20 + BVG 3’855.60) ÷ 1’898.4 = 2.967762. Gross = (120 − 2.967762) ÷ 1.07694
    //   = 108.671084 per hour, 206’301.19 per year.
    // Deductions = 5.9 % × gross + (1’630.20 + 1’778.40 + 3’855.60) ÷ 1’898.4 = 10.238079 per hour;
    // net 98.433005 per hour = 186’865.22 per year.
    const e = run(at({ rate: 120, billing: "lohn", rateBasis: "kostensatz" }));
    expect(e.rateBasis).toBe("kostensatz");
    expect(e.revenue.year).toBeCloseTo(227_808, 6);
    expect(year(e, "lohn-brutto")).toBeCloseTo(108.6710844 * 1898.4, 2);
    expect(e.net.year).toBeCloseTo(186_865.2167, 2);
    expect(e.net.hourly).toBeCloseTo(98.433005, 5);
    // Both sides of AHV/IV/EO come off the rate: 10.6 % of the gross wage
    const ahv = e.lines.find((l) => l.key === "lohn-ahvIvEo")!;
    expect(ahv.percent).toBeCloseTo(10.6, 9);
    expect(ahv.year).toBeCloseTo(0.106 * 108.6710844 * 1898.4, 2);
    expect(e.lines.some((l) => l.key === "lohn-gebuehr")).toBe(false);
  });

  it("subtracts a provider fee from the cost rate", () => {
    // 3 % of 227’808 = 6’834.24; the rest pays wage and contributions
    const e = run(at({ rate: 120, billing: "lohn", rateBasis: "kostensatz" }), { ...S, providerFeePercent: 3 });
    expect(year(e, "lohn-gebuehr")).toBeCloseTo(6_834.24, 6);
    expect(e.net.year).toBeLessThan(186_865);
  });

  it("does not charge the Einzelfirma's fixed costs on payroll", () => {
    const e = run(at({ rate: 100, billing: "lohn" }));
    expect(e.lines.some((l) => ["haftpflicht", "treuhand", "ahv", "fak"].includes(l.key))).toBe(false);
    expect(e.notices).toEqual([]);
  });
});

describe("several assignments", () => {
  it("adds invoiced revenue first, so AHV and fixed costs count once", () => {
    // Two assignments at 50 % each equal one at 100 %.
    const total = computeEarningsTotal([at({ workload: 50 }), at({ workload: 50 })], S)!;
    const single = run(at({}));
    expect(total.revenue.year).toBeCloseTo(single.revenue.year, 6);
    expect(total.net.year).toBeCloseTo(single.net.year, 6);
    expect(year(total, "haftpflicht")).toBe(1_000);
  });

  it("combines invoice and payroll", () => {
    const invoice = run(at({ workload: 50 }));
    const payroll = run(at({ rate: 100, workload: 50, billing: "lohn" }));
    const total = computeEarningsTotal([at({ workload: 50 }), at({ rate: 100, workload: 50, billing: "lohn" }), at({ rate: 0 })], S)!;
    expect(total.model).toBe("gemischt");
    expect(total.revenue.year).toBeCloseTo(invoice.revenue.year + payroll.revenue.year, 6);
    expect(total.net.year).toBeCloseTo(invoice.net.year + payroll.net.year, 6);
    expect(total.hoursPerYear).toBeCloseTo(1898.4, 6);
    expect(computeEarningsTotal([at({ rate: 0 })], S)).toBeNull();
  });
});

describe("assignment input", () => {
  it("reads a stored assignment", () => {
    const row = { rateAmount: 950, rateUnit: "tag", workload: 80, billing: "lohn", rateBasis: "kostensatz", hoursPerMonth: null, expensesMonthly: 0 };
    expect(assignmentEarningsInput(row)).toEqual({
      rate: 950,
      unit: "tag",
      workload: 80,
      billing: "lohn",
      rateBasis: "kostensatz",
      hoursPerMonth: null,
      expensesMonthly: 0,
    });
    expect(assignmentEarningsInput({ ...row, rateAmount: null })).toBeNull();
  });
});

describe("settings", () => {
  it("documents a source for every editable value", () => {
    for (const f of EARNINGS_FIELDS) expect(sourcesFor([f.key]).length, f.key).toBeGreaterThan(0);
  });

  it("keeps valid stored values and falls back for missing, old or invalid ones", () => {
    const parsed = parseEarningsSettings({
      vacationWeeks: 4,
      ahvRate: "kaputt",
      fakEnabled: false,
      pensionMode: "lebensversicherung",
      retainedPercent: 5,
      payroll: { ahvIvEo: 5.4, alv: -3 },
      savedAt: "2026-10-14T10:00:00.000Z",
    });
    expect(parsed.vacationWeeks).toBe(4);
    expect(parsed.ahvRate).toBe(10);
    expect(parsed.fakEnabled).toBe(false);
    expect(parsed.pensionMode).toBe("saeule3a");
    expect(parsed.payroll.ahvIvEo).toBe(5.4);
    expect(parsed.payroll.alv).toBe(1.1);
    expect(parsed.payroll.uvgNbu).toBe(1.2);
    expect("retainedPercent" in parsed).toBe(false);
    expect(parseEarningsSettings(null)).toEqual(EARNINGS_DEFAULTS);
    expect(parseEarningsSettings("text", { ...S, vatRegistered: true }).vatRegistered).toBe(true);
    // A missing boolean keeps the fallback instead of becoming false.
    expect(parseEarningsSettings({}, { ...S, vatRegistered: true }).vatRegistered).toBe(true);
  });

  it("validates the settings form", () => {
    const form = Object.fromEntries(
      EARNINGS_FIELDS.map((f) => {
        const v = f.key.startsWith("payroll.") ? (S.payroll as unknown as Record<string, unknown>)[f.key.slice(8)] : (S as unknown as Record<string, unknown>)[f.key];
        return [f.key, typeof v === "boolean" ? (v ? "on" : undefined) : String(v)];
      }),
    );
    const ok = earningsFormSchema.safeParse({ ...form, vacationWeeks: "4,5", ktgPercent: "1.3" });
    expect(ok.success).toBe(true);
    const settings = settingsFromForm(ok.data!);
    expect(settings.vacationWeeks).toBe(4.5);
    expect(settings.ktgPercent).toBe(1.3);
    expect(settings.payroll.thirteenthEnabled).toBe(true);
    expect(settings.payroll.gavEnabled).toBe(false);
    expect(settings.fakEnabled).toBe(true);
    const bad = earningsFormSchema.safeParse({ ...form, ahvRate: "abc", age: "40.5" });
    expect(bad.error!.issues.map((i) => i.path[0])).toEqual(["ahvRate", "age"]);
    const range = earningsFormSchema.safeParse({ ...form, accidentMaxIncome: "1000" });
    expect(range.error!.issues.map((i) => i.path[0])).toEqual(["accidentMaxIncome"]);
  });
});
