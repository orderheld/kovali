import { describe, expect, it } from "vitest";
import { daysBetweenIso, defaultAssignmentStatus, formatPeriod, periodStatus, splitByStart } from "./assignment-period";
import { assignmentEarningsInput, computeEarnings, computeEarningsTotal, EARNINGS_DEFAULTS, type EarningsInput } from "./earnings";

const today = "2026-10-14";

describe("assignment period", () => {
  it("counts calendar days across month ends and the time change", () => {
    expect(daysBetweenIso("2026-10-14", "2026-10-15")).toBe(1);
    expect(daysBetweenIso("2026-10-14", "2027-02-28")).toBe(137);
    expect(daysBetweenIso("2026-10-24", "2026-10-26")).toBe(2); // switch to winter time on 25.10.
    expect(daysBetweenIso("2026-10-15", "2026-10-14")).toBe(-1);
  });

  it("describes a running assignment", () => {
    expect(periodStatus({ status: "laufend", startDate: "2026-03-01", endDate: "2027-02-28" }, today)).toEqual({ text: "noch 137 Tage", tone: "green", daysLeft: 137 });
    expect(periodStatus({ status: "laufend", startDate: null, endDate: "2026-10-15" }, today)).toEqual({ text: "noch 1 Tag", tone: "amber", daysLeft: 1 });
    expect(periodStatus({ status: "laufend", startDate: null, endDate: today }, today)?.text).toBe("endet heute");
    expect(periodStatus({ status: "laufend", startDate: null, endDate: "2026-10-11" }, today)).toEqual({ text: "Enddatum seit 3 Tagen vorbei", tone: "red", daysLeft: -3 });
    expect(periodStatus({ status: "laufend", startDate: "2026-01-01", endDate: null }, today)?.text).toBe("ohne Enddatum");
  });

  it("describes a planned assignment", () => {
    expect(periodStatus({ status: "geplant", startDate: "2026-11-01", endDate: null }, today)).toEqual({ text: "startet in 18 Tagen", tone: "blue", daysLeft: null });
    expect(periodStatus({ status: "geplant", startDate: "2026-10-15", endDate: null }, today)?.text).toBe("startet morgen");
    expect(periodStatus({ status: "geplant", startDate: today, endDate: null }, today)?.text).toBe("startet heute");
    expect(periodStatus({ status: "geplant", startDate: "2026-10-01", endDate: null }, today)?.text).toBe("Start überfällig");
    expect(periodStatus({ status: "geplant", startDate: null, endDate: null }, today)?.text).toBe("Start offen");
    // Marked as running before its start date
    expect(periodStatus({ status: "laufend", startDate: "2026-11-01", endDate: null }, today)?.text).toBe("startet in 18 Tagen");
    expect(periodStatus({ status: "beendet", startDate: "2026-01-01", endDate: "2026-06-30" }, today)).toBeNull();
  });

  it("formats the period", () => {
    expect(formatPeriod("2026-03-01", "2027-02-28")).toBe("01.03.2026 – 28.02.2027");
    expect(formatPeriod("2026-03-01", null)).toBe("ab 01.03.2026");
    expect(formatPeriod(null, "2027-02-28")).toBe("bis 28.02.2027");
    expect(formatPeriod(null, null)).toBe("Zeitraum offen");
  });

  it("plans a new assignment that starts after today", () => {
    expect(defaultAssignmentStatus("2026-11-01", today)).toBe("geplant");
    expect(defaultAssignmentStatus(today, today)).toBe("laufend");
    expect(defaultAssignmentStatus("2026-05-01", today)).toBe("laufend");
    expect(defaultAssignmentStatus(null, today)).toBe("laufend");
    expect(defaultAssignmentStatus(undefined, today)).toBe("laufend");
  });

  it("counts only running assignments that have started", () => {
    const base = { workload: 100, rateUnit: "stunde", billing: "rechnung", rateBasis: "brutto", hoursPerMonth: null, expensesMonthly: 0 };
    const rows = [
      { id: 1, status: "laufend", startDate: "2026-05-01", endDate: "2026-10-31", rateAmount: 120, ...base },
      { id: 2, status: "laufend", startDate: "2026-11-01", endDate: null, rateAmount: 130, ...base },
      { id: 3, status: "laufend", startDate: null, endDate: "2026-10-01", rateAmount: null, ...base },
    ];
    const { current, upcoming } = splitByStart(rows, today);
    expect(current.map((r) => r.id)).toEqual([1, 3]);
    expect(upcoming.map((r) => r.id)).toEqual([2]);
    // The follow-up assignment from 1.11. does not double the income: CHF 120 alone gives
    // 158.2 hours and CHF 18’984 revenue per month (see earnings.test.ts).
    const inputs = current.map(assignmentEarningsInput).filter((i): i is EarningsInput => i !== null);
    const total = computeEarningsTotal(inputs, EARNINGS_DEFAULTS)!;
    expect(total.hoursPerMonth).toBeCloseTo(158.2, 9);
    expect(total.revenue.month).toBeCloseTo(18_984, 9);
    expect(total.net.year).toBeCloseTo(computeEarnings(inputs[0], EARNINGS_DEFAULTS)!.net.year, 9);
  });
});
