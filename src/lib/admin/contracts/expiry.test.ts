import { describe, expect, it } from "vitest";
import { contractExpiry, daysBetween, expiryLabel, expiryTone } from "./expiry";

describe("daysBetween", () => {
  it("counts calendar days, also across the change to winter time", () => {
    expect(daysBetween("2026-10-14", "2026-10-14")).toBe(0);
    expect(daysBetween("2026-10-14", "2026-10-15")).toBe(1);
    expect(daysBetween("2026-10-20", "2026-10-30")).toBe(10);
    expect(daysBetween("2026-10-14", "2026-12-31")).toBe(78);
    expect(daysBetween("2026-10-14", "2026-10-01")).toBe(-13);
  });
});

describe("contractExpiry", () => {
  const today = "2026-10-14";

  it("flags open contracts that end within 60 days", () => {
    expect(contractExpiry({ status: "unterzeichnet", validUntil: "2026-12-13" }, today)).toEqual({ state: "ending", days: 60 });
    expect(contractExpiry({ status: "unterzeichnet", validUntil: "2026-12-14" }, today)).toBeNull();
    expect(contractExpiry({ status: "versendet", validUntil: "2026-10-14" }, today)).toEqual({ state: "ending", days: 0 });
    expect(contractExpiry({ status: "entwurf", validUntil: "2026-10-31" }, today, 10)).toBeNull();
  });

  it("reminds of signed contracts past their end, but not of closed ones", () => {
    expect(contractExpiry({ status: "unterzeichnet", validUntil: "2026-10-11" }, today)).toEqual({ state: "expired", days: 3 });
    expect(contractExpiry({ status: "entwurf", validUntil: "2026-10-11" }, today)).toBeNull();
    expect(contractExpiry({ status: "beendet", validUntil: "2026-10-20" }, today)).toBeNull();
    expect(contractExpiry({ status: "storniert", validUntil: "2026-10-20" }, today)).toBeNull();
    expect(contractExpiry({ status: "unterzeichnet", validUntil: null }, today)).toBeNull();
  });
});

describe("expiryLabel and expiryTone", () => {
  it("speaks plainly and gets more urgent in the last two weeks", () => {
    expect(expiryLabel({ state: "ending", days: 0 })).toBe("endet heute");
    expect(expiryLabel({ state: "ending", days: 1 })).toBe("endet morgen");
    expect(expiryLabel({ state: "ending", days: 42 })).toBe("endet in 42 Tagen");
    expect(expiryLabel({ state: "expired", days: 1 })).toBe("seit gestern abgelaufen");
    expect(expiryLabel({ state: "expired", days: 5 })).toBe("seit 5 Tagen abgelaufen");
    expect(expiryTone({ state: "ending", days: 14 })).toBe("red");
    expect(expiryTone({ state: "ending", days: 15 })).toBe("amber");
    expect(expiryTone({ state: "expired", days: 2 })).toBe("neutral");
  });
});
