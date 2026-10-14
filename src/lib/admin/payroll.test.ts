import { describe, expect, it } from "vitest";
import {
  bvgSavingsPercent,
  coordinatedSalary,
  holidaySupplement,
  OFFICIAL_RATES,
  parseDecimal,
  payrollFromBase,
  payrollFromGross,
  publicHolidaySupplement,
  RATE_SOURCES,
  supplementFactor,
  wageFromRate,
  type PayrollRates,
} from "./payroll";

/**
 * Expected values were worked out by hand (calculator), step by step, and are written out in
 * the comments so a reviewer can follow them.
 */

const line = (r: ReturnType<typeof payrollFromBase>, key: string) => r.lines.find((l) => l.key === key)!;

describe("supplements and BVG helpers", () => {
  it("derives the holiday supplement from the number of weeks", () => {
    expect(holidaySupplement(4)).toBe(8.33); // 20 / 240
    expect(holidaySupplement(5)).toBe(10.64); // 25 / 235
    expect(holidaySupplement(6)).toBe(13.04); // 30 / 230
  });

  it("derives the public-holiday supplement from the number of days", () => {
    expect(publicHolidaySupplement(9)).toBe(3.59); // 9 / 251
    expect(publicHolidaySupplement(8.5)).toBe(3.38); // 8.5 / 251.5
    expect(publicHolidaySupplement(0)).toBe(0);
  });

  it("chains the supplements into one factor", () => {
    // 1.0359 × 1.1064 × 1.0833 = 1.241591536
    expect(supplementFactor(OFFICIAL_RATES)).toBeCloseTo(1.241591536, 9);
    expect(supplementFactor({ ...OFFICIAL_RATES, thirteenthEnabled: false })).toBeCloseTo(1.14611976, 9);
  });

  it("picks the savings credit by age bracket", () => {
    expect(bvgSavingsPercent(24, OFFICIAL_RATES)).toBe(0);
    expect(bvgSavingsPercent(25, OFFICIAL_RATES)).toBe(7);
    expect(bvgSavingsPercent(34, OFFICIAL_RATES)).toBe(7);
    expect(bvgSavingsPercent(35, OFFICIAL_RATES)).toBe(10);
    expect(bvgSavingsPercent(45, OFFICIAL_RATES)).toBe(15);
    expect(bvgSavingsPercent(55, OFFICIAL_RATES)).toBe(18);
    expect(bvgSavingsPercent(65, OFFICIAL_RATES)).toBe(18);
    expect(bvgSavingsPercent(66, OFFICIAL_RATES)).toBe(0);
  });

  it("computes the coordinated salary with threshold, minimum and maximum", () => {
    expect(coordinatedSalary(22_679, OFFICIAL_RATES)).toBe(0);
    expect(coordinatedSalary(22_680, OFFICIAL_RATES)).toBe(3_780); // 22’680 − 26’460 < minimum
    expect(coordinatedSalary(60_000, OFFICIAL_RATES)).toBe(33_540);
    expect(coordinatedSalary(150_000, OFFICIAL_RATES)).toBe(64_260); // 90’720 − 26’460
  });
});

describe("employment planning", () => {
  it("builds the gross wage and contributions for CHF 50 base, age 40", () => {
    // Feiertage 50 × 3.59 % = 1.795; Ferien 51.795 × 10.64 % = 5.510988;
    // 13. Monatslohn 57.305988 × 8.33 % = 4.7735888; brutto 62.0795768 per hour.
    const r = payrollFromBase({ baseHourly: 50, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES);
    expect(r.publicHoliday).toBeCloseTo(1.795, 9);
    expect(r.holiday).toBeCloseTo(5.510988, 9);
    expect(r.thirteenth).toBeCloseTo(4.7735888, 6);
    expect(r.grossHourly).toBeCloseTo(62.0795768, 6);
    // 62.0796 × 176.4 h × 12 = 131’410.05 per year (above the BVG upper limit, below ALV cap)
    expect(r.grossAnnual).toBeCloseTo(131_410.048, 2);
    expect(r.grossMonthly).toBeCloseTo(10_950.837, 2);
    // AHV/IV/EO 5.3 % of 62.0796 = 3.29022 each side
    expect(line(r, "ahvIvEo").employer).toBeCloseTo(3.290218, 5);
    // AK 4 % of 2 × 3.29022 = 0.263217
    expect(line(r, "akAdmin").employer).toBeCloseTo(0.263217, 5);
    // BVG: coordinated 64’260 × (10 % + 2 %) = 7’711.20 per year ÷ 2’116.8 h = 3.642857, half each
    expect(r.bvg.coordinatedSalary).toBe(64_260);
    expect(r.bvg.annualTotal).toBeCloseTo(7_711.2, 6);
    expect(line(r, "bvg").employer).toBeCloseTo(1.8214286, 6);
    // Employer: AHV 3.290218 + ALV 0.682875 + FAK 0.775995 + FamEL 0.074495 + AK 0.263217
    //   + BU 0.062080 + KTG 0.372477 + BVG 1.821429 = 7.342786
    expect(r.employerContributions).toBeCloseTo(7.342786, 5);
    expect(r.employerCostHourly).toBeCloseTo(69.422363, 5);
    // Employee: AHV 3.290218 + ALV 0.682875 + NBU 0.744955 + KTG 0.372477 + BVG 1.821429 = 6.911954
    expect(r.employeeDeductions).toBeCloseTo(6.911954, 5);
    expect(r.netHourly).toBeCloseTo(55.167623, 5);
    expect(r.netMonthly).toBeCloseTo(9_731.569, 2);
  });

  it("caps ALV and UVG at CHF 148’200 per year", () => {
    // CHF 80 base → 99.3273 gross per hour → 210’256 per year
    const r = payrollFromBase({ baseHourly: 80, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES);
    expect(r.grossAnnual).toBeCloseTo(210_256.077, 2);
    // 148’200 × 1.1 % ÷ 2’116.8 h = 0.770125
    expect(line(r, "alv").employee).toBeCloseTo(0.7701247, 6);
    expect(line(r, "alv").note).toBeDefined();
    // 148’200 × 1.2 % ÷ 2’116.8 h = 0.840136
    expect(line(r, "uvgNbu").employee).toBeCloseTo(0.8401361, 6);
    // FAK has no ceiling: 1.25 % of 99.3273
    expect(line(r, "fak").employer).toBeCloseTo(1.2415915, 6);
  });

  it("leaves out the BVG below the entry threshold and for young employees' savings", () => {
    // CHF 8 base → 21’025.61 per year < 22’680
    const low = payrollFromBase({ baseHourly: 8, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES);
    expect(low.grossAnnual).toBeCloseTo(21_025.608, 2);
    expect(low.bvg.applies).toBe(false);
    expect(line(low, "bvg").employer).toBe(0);
    // Age 22: risk cover only (2 % of 64’260 = 1’285.20 per year)
    const young = payrollFromBase({ baseHourly: 50, hoursPerMonth: 176.4, age: 22 }, OFFICIAL_RATES);
    expect(young.bvg.savingsPercent).toBe(0);
    expect(young.bvg.annualTotal).toBeCloseTo(1_285.2, 6);
  });

  it("respects the toggles for the 13th month and the GAV Personalverleih", () => {
    const rates: PayrollRates = { ...OFFICIAL_RATES, thirteenthEnabled: false, gavEnabled: true };
    const r = payrollFromBase({ baseHourly: 50, hoursPerMonth: 176.4, age: 40 }, rates);
    expect(r.thirteenth).toBe(0);
    // 50 + 1.795 + 5.510988 = 57.305988; GAV 0.4 % = 0.229224 each side
    expect(r.grossHourly).toBeCloseTo(57.305988, 6);
    expect(line(r, "gav").employer).toBeCloseTo(0.229224, 6);
    expect(line(r, "gav").employee).toBeCloseTo(0.229224, 6);
    expect(payrollFromBase({ baseHourly: 50, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES).lines.some((l) => l.key === "gav")).toBe(false);
  });

  it("splits an all-in gross wage into base wage and supplements", () => {
    // The gross wage of the CHF 50 example above: 62.0795768 ÷ 1.241591536 = 50.
    const r = payrollFromGross({ grossHourly: 62.0795768, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES);
    expect(r.base).toBeCloseTo(50, 6);
    expect(r.grossHourly).toBeCloseTo(62.0795768, 9);
    expect(r.netHourly).toBeCloseTo(55.167623, 5);
    // CHF 100 all-in: base 100 ÷ 1.241591536 = 80.541786, holiday 10.64 % of (base + public holidays)
    const hundred = payrollFromGross({ grossHourly: 100, hoursPerMonth: 158.2, age: 40 }, OFFICIAL_RATES);
    expect(hundred.base).toBeCloseTo(80.541786, 5);
    expect(hundred.grossHourly).toBeCloseTo(100, 9);
  });

  it("derives the wage from a total cost rate", () => {
    // 86.777954 is what CHF 50 base costs the employer (69.422363) plus a 20 % fee.
    const plan = wageFromRate({ rate: 86.777954, unit: "stunde", retainedPercent: 20, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES)!;
    expect(plan.payroll.base).toBeCloseTo(50, 4);
    expect(plan.retainedPercent).toBeCloseTo(20, 4);
    // Daily rates are converted with 8.4 hours: 1008 / 8.4 = 120; budget 120 × 85 % = 102.
    const daily = wageFromRate({ rate: 1008, unit: "tag", retainedPercent: 15, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES)!;
    expect(daily.rateHourly).toBeCloseTo(120, 9);
    expect(daily.payroll.employerCostHourly).toBeCloseTo(102, 4);
    // Nothing kept: the whole invoice goes into salary and contributions.
    const all = wageFromRate({ rate: 100, unit: "stunde", retainedPercent: 0, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES)!;
    expect(all.payroll.employerCostHourly).toBeCloseTo(100, 4);
    expect(wageFromRate({ rate: 120, unit: "stunde", retainedPercent: 100, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES)).toBeNull();
  });
});

describe("defaults and parsing", () => {
  it("documents a source for every default rate", () => {
    const covered = new Set(RATE_SOURCES.flatMap((s) => s.keys));
    for (const key of Object.keys(OFFICIAL_RATES)) expect(covered, key).toContain(key);
  });

  it("parses Swiss number formats", () => {
    expect(parseDecimal("1'250.50")).toBe(1250.5);
    expect(parseDecimal("1’250,5")).toBe(1250.5);
    expect(parseDecimal("8,33")).toBe(8.33);
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("abc")).toBeNaN();
  });
});
