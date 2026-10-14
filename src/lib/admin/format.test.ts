import { describe, expect, it } from "vitest";
import { addDaysIso, addMonthsIso, displayNo, formatDate, todayIso } from "./format";

describe("date helpers", () => {
  it("adds days across months and years", () => {
    expect(addDaysIso("2026-10-13", 30)).toBe("2026-11-12");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds months and keeps the day within the month", () => {
    expect(addMonthsIso("2026-10-13", 6)).toBe("2027-04-13");
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsIso("2026-10-13", -12)).toBe("2025-10-13");
  });

  it("uses the calendar day in Zurich", () => {
    // 23:30 UTC on 13 October is already 14 October in Zurich (summer time).
    expect(todayIso(new Date("2026-10-13T23:30:00Z"))).toBe("2026-10-14");
    expect(formatDate("2026-10-14")).toBe("14.10.2026");
  });
});

describe("display numbers", () => {
  it("pads ids to four digits", () => {
    expect(displayNo.assignment(12)).toBe("A-0012");
    expect(displayNo.mandate(7)).toBe("M-0007");
    expect(displayNo.company(3)).toBe("F-0003");
    expect(displayNo.snippet(4)).toBe("T-0004");
  });
});
