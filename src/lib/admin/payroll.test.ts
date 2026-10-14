import { describe, expect, it } from "vitest";
import {
  b2bMargin,
  buyRateForTargetMargin,
  bvgSavingsPercent,
  coordinatedSalary,
  holidaySupplement,
  hoursPerMonth,
  OFFICIAL_RATES,
  parseDecimal,
  payrollFromBase,
  RATE_SOURCES,
  rateFromWage,
  wageFromRate,
  type PayrollRates,
} from "./payroll";

/**
 * Expected values were worked out by hand (calculator), step by step, and are written out in
 * the comments so a reviewer can follow them.
 */

const line = (r: ReturnType<typeof payrollFromBase>, key: string) => r.lines.find((l) => l.key === key)!;

describe("B2B margin", () => {
  it("compares a daily selling rate with an hourly buying rate at 80 %", () => {
    // 1000 / 8.4 = 119.0476 per hour; minus 100 = 19.0476; × 8.4 = 160 per day;
    // 8.4 h × 21 d × 0.8 = 141.12 h; × 19.0476 = 2688 per month; × 12 = 32’256 per year.
    const r = b2bMargin({ sell: 1000, sellUnit: "tag", buy: 100, buyUnit: "stunde", workloadPercent: 80 })!;
    expect(r.sellHourly).toBeCloseTo(119.0476, 4);
    expect(r.perHour).toBeCloseTo(19.0476, 4);
    expect(r.perDay).toBeCloseTo(160, 6);
    expect(r.hoursPerMonth).toBe(141.12);
    expect(r.perMonth).toBeCloseTo(2688, 6);
    expect(r.perYear).toBeCloseTo(32256, 6);
    // 19.0476 / 119.0476 = 16 %; markup 19.0476 / 100 = 19.05 %
    expect(r.percent).toBeCloseTo(16, 6);
    expect(r.markupPercent).toBeCloseTo(19.0476, 4);
  });

  it("reports a negative margin when buying is dearer than selling", () => {
    const r = b2bMargin({ sell: 100, sellUnit: "stunde", buy: 110, buyUnit: "stunde", workloadPercent: 100 })!;
    expect(r.perHour).toBe(-10);
    expect(r.percent).toBeCloseTo(-10, 6);
    expect(r.perMonth).toBeCloseTo(-1764, 6); // 176.4 h
  });

  it("rejects missing or zero selling rates", () => {
    expect(b2bMargin({ sell: 0, sellUnit: "stunde", buy: 80, buyUnit: "stunde", workloadPercent: 100 })).toBeNull();
    expect(b2bMargin({ sell: NaN, sellUnit: "stunde", buy: 80, buyUnit: "stunde", workloadPercent: 100 })).toBeNull();
  });

  it("counts the subcontractor's VAT as cost while KOVALI is not registered", () => {
    // Sell 120, buy 100 + 8.1 % VAT = 108.10 → margin 11.90 per hour (9.9167 %)
    const r = b2bMargin({ sell: 120, sellUnit: "stunde", buy: 100, buyUnit: "stunde", workloadPercent: 100, vat: { kovaliRegistered: false, subcontractorCharges: true, ratePercent: 8.1 } })!;
    expect(r.vatCostHourly).toBeCloseTo(8.1, 9);
    expect(r.perHour).toBeCloseTo(11.9, 9);
    expect(r.percent).toBeCloseTo(9.916667, 5);
    expect(r.invoiceHourlyGross).toBe(120);
    // Registered: VAT is passed through, margin 20; the client's invoice shows 129.72 incl. VAT
    const reg = b2bMargin({ sell: 120, sellUnit: "stunde", buy: 100, buyUnit: "stunde", workloadPercent: 100, vat: { kovaliRegistered: true, subcontractorCharges: true, ratePercent: 8.1 } })!;
    expect(reg.perHour).toBe(20);
    expect(reg.invoiceHourlyGross).toBeCloseTo(129.72, 9);
    // 176.4 h × 120 × 12 = 254’016 turnover per year
    expect(reg.revenuePerYear).toBeCloseTo(254_016, 6);
  });

  it("finds the buying rate for a target margin", () => {
    // With unrecoverable VAT: 120 × 80 % = 96 ÷ 1.081 = 88.807
    expect(buyRateForTargetMargin(120, 20, 8.1)).toBeCloseTo(88.806660, 5);
    expect(buyRateForTargetMargin(120, 20)).toBeCloseTo(96, 9);
    expect(buyRateForTargetMargin(1008, 12.5)).toBeCloseTo(882, 9);
    expect(buyRateForTargetMargin(120, 100)).toBeNull();
    expect(buyRateForTargetMargin(0, 20)).toBeNull();
  });

  it("uses 8.4 h × 21 days per month", () => {
    expect(hoursPerMonth(100)).toBe(176.4);
    expect(hoursPerMonth(60)).toBe(105.84);
    expect(hoursPerMonth(150)).toBe(176.4);
  });
});

describe("supplements and BVG helpers", () => {
  it("derives the holiday supplement from the number of weeks", () => {
    expect(holidaySupplement(4)).toBe(8.33); // 20 / 240
    expect(holidaySupplement(5)).toBe(10.64); // 25 / 235
    expect(holidaySupplement(6)).toBe(13.04); // 30 / 230
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

  it("derives the invoice amount needed for a wage", () => {
    // Employer cost 69.422363 ÷ (1 − 20 %) = 86.777954; the firm keeps 17.355591 per hour
    const plan = rateFromWage({ baseHourly: 50, retainedPercent: 20, hoursPerMonth: 176.4, age: 40 }, OFFICIAL_RATES)!;
    expect(plan.rateHourly).toBeCloseTo(86.777954, 5);
    expect(plan.rateDaily).toBeCloseTo(728.93481, 4);
    expect(plan.retainedPercent).toBeCloseTo(20, 9);
    expect(plan.retainedHourly).toBeCloseTo(17.355591, 5);
    expect(plan.retainedMonthly).toBeCloseTo(17.355591 * 176.4, 2);
  });

  it("derives the wage from an invoice amount and round-trips", () => {
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
