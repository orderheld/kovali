import { describe, expect, it } from "vitest";
import { ageOn, defaultRetentionUntil, isCapitalCompany, privacyFlag, retentionInputError, retentionState, retentionWithoutConsent } from "./rules";

describe("default retention", () => {
  it("keeps a profile 24 months with consent and 6 months without", () => {
    expect(defaultRetentionUntil(true, "2026-10-13")).toBe("2028-10-13");
    expect(defaultRetentionUntil(false, "2026-10-13")).toBe("2027-04-13");
  });

  it("stays within the month at month ends and leap years", () => {
    expect(defaultRetentionUntil(false, "2026-08-31")).toBe("2027-02-28");
    expect(defaultRetentionUntil(true, "2026-02-28")).toBe("2028-02-28");
    expect(defaultRetentionUntil(false, "2027-08-31")).toBe("2028-02-29");
  });
});

describe("retention state", () => {
  const today = "2026-10-13";
  it("flags dates within 30 days and overdue dates", () => {
    expect(retentionState(null, today)).toEqual({ state: "none" });
    expect(retentionState("2027-01-01", today).state).toBe("ok");
    expect(retentionState("2026-11-12", today)).toEqual({ state: "due", days: 30 });
    expect(retentionState("2026-10-14", today)).toEqual({ state: "due", days: 1 });
    // «Aufbewahren bis» includes the day itself, as on the Datenschutz pages and in the badge.
    expect(retentionState("2026-10-13", today)).toEqual({ state: "due", days: 0 });
    expect(retentionState("2026-10-12", today)).toEqual({ state: "overdue", days: -1 });
    expect(retentionState("2026-10-01", today)).toEqual({ state: "overdue", days: -12 });
  });

  it("puts the most urgent privacy issue in the list flag", () => {
    expect(privacyFlag({ consentAt: null, retentionUntil: "2026-10-01" }, today)?.label).toBe("Frist abgelaufen");
    expect(privacyFlag({ consentAt: null, retentionUntil: "2026-10-12" }, today)?.label).toBe("Frist abgelaufen");
    expect(privacyFlag({ consentAt: new Date(), retentionUntil: "2026-10-13" }, today)?.label).toBe("Frist heute");
    expect(privacyFlag({ consentAt: new Date(), retentionUntil: "2026-10-14" }, today)?.label).toBe("Frist in 1 Tag");
    expect(privacyFlag({ consentAt: new Date(), retentionUntil: "2026-10-20" }, today)?.label).toBe("Frist in 7 Tagen");
    expect(privacyFlag({ consentAt: null, retentionUntil: "2027-04-13" }, today)?.label).toBe("Keine Einwilligung");
    expect(privacyFlag({ consentAt: new Date(), retentionUntil: "2028-10-13" }, today)).toBeNull();
  });
});

describe("retention date in the candidate form", () => {
  const today = "2026-10-14";

  it("caps a new or changed date at 6 months without and 24 months with consent", () => {
    expect(retentionInputError("2027-04-14", null, false, today)).toBeNull();
    expect(retentionInputError("2027-04-15", null, false, today)).toMatch(/Ohne Einwilligung höchstens 6 Monate ab heute, also bis 14\.04\.2027/);
    expect(retentionInputError("2036-01-01", "2027-01-01", false, today)).toMatch(/höchstens 6 Monate/);
    expect(retentionInputError("2028-10-14", null, true, today)).toBeNull();
    expect(retentionInputError("2028-10-15", "2027-01-01", true, today)).toMatch(/Mit Einwilligung höchstens 24 Monate ab heute, also bis 14\.10\.2028/);
  });

  it("leaves unchanged, shorter, past and empty dates alone", () => {
    // Set earlier through the Datenschutz extension: unrelated edits keep working.
    expect(retentionInputError("2028-10-01", "2028-10-01", false, today)).toBeNull();
    // Overdue and saved unchanged, or shortened into the past.
    expect(retentionInputError("2026-01-01", "2026-01-01", false, today)).toBeNull();
    expect(retentionInputError("2026-09-30", "2027-01-01", false, today)).toBeNull();
    expect(retentionInputError(null, "2027-01-01", false, today)).toBeNull();
  });

  it("limits the date to 6 months from creation when the consent is removed", () => {
    expect(retentionWithoutConsent("2028-03-01", "2026-03-01")).toBe("2026-09-01");
    expect(retentionWithoutConsent("2026-05-01", "2026-03-01")).toBe("2026-05-01");
    expect(retentionWithoutConsent(null, "2026-08-31")).toBe("2027-02-28");
  });
});

describe("age", () => {
  it("counts full years", () => {
    expect(ageOn("1986-10-14", "2026-10-13")).toBe(39);
    expect(ageOn("1986-10-13", "2026-10-13")).toBe(40);
  });
});

describe("own firm", () => {
  it("recognises GmbH and AG, also from the firm name", () => {
    expect(isCapitalCompany({ legalForm: "GmbH" })).toBe(true);
    expect(isCapitalCompany({ legalForm: "Aktiengesellschaft" })).toBe(true);
    expect(isCapitalCompany({ legalForm: "Sàrl" })).toBe(true);
    expect(isCapitalCompany({ legalForm: null, name: "Muster Analytics AG" })).toBe(true);
    expect(isCapitalCompany({ legalForm: "", legalName: "Beispiel Consulting GmbH", name: "Beispiel" })).toBe(true);
  });

  it("treats sole proprietorships and unknown forms as higher risk", () => {
    expect(isCapitalCompany({ legalForm: "Einzelunternehmen", name: "Muster AG" })).toBe(false);
    expect(isCapitalCompany({ legalForm: null, name: "Anna Beispiel Consulting" })).toBe(false);
    expect(isCapitalCompany({ name: "Agil Beratung" })).toBe(false);
  });
});
