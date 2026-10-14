import { describe, expect, it } from "vitest";
import { daysBetweenIso, formatPeriod, periodStatus } from "./assignment-period";

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
});
