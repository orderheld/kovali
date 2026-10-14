import { describe, expect, it } from "vitest";
import {
  consentCovers,
  consentDetails,
  consentScopeText,
  consentState,
  consentSummary,
  hasValidConsent,
  objectionSummary,
  statusAfterConsent,
  statusAfterWithdrawal,
  withdrawalSummary,
} from "./consent";

const consentAt = new Date("2026-10-10T08:00:00Z");
const withdrawnAt = new Date("2026-10-12T08:00:00Z");

describe("consent of a submission", () => {
  it("reads the state from the columns", () => {
    expect(consentState({ consentAt: null })).toBe("fehlt");
    expect(consentState({ consentAt })).toBe("erteilt");
    // The consent date stays as record after a withdrawal; only withdrawn_at counts.
    expect(consentState({ consentAt, withdrawnAt })).toBe("widerrufen");
    expect(consentState({ consentAt: null, withdrawnAt })).toBe("widerrufen");
    expect(hasValidConsent({ consentAt, withdrawnAt: null })).toBe(true);
    expect(hasValidConsent({ consentAt, withdrawnAt })).toBe(false);
  });

  it("describes consent, withdrawal and objection for history and lists", () => {
    expect(consentDetails({ consentMethod: "muendlich", consentNote: "Telefon 10.10.2026" })).toBe("Mündlich: Telefon 10.10.2026");
    expect(consentDetails({ consentMethod: "portal", consentNote: null })).toBe("Kandidatenportal");
    expect(consentDetails({ consentMethod: null, consentNote: "Altbestand" })).toBe("Altbestand");
    expect(consentSummary({ consentAt, consentMethod: "email" })).toBe("10.10.2026 (E-Mail)");
    expect(consentSummary({ consentAt: null })).toBe("keine");
    expect(withdrawalSummary({ withdrawnAt, withdrawalNote: "Im Kandidatenportal zurückgezogen" })).toBe(
      "Widerrufen am 12.10.2026: Im Kandidatenportal zurückgezogen",
    );
    expect(withdrawalSummary({ withdrawnAt: null })).toBeNull();
    expect(objectionSummary({ objectionAt: withdrawnAt, objectionNote: "Schriftlich" })).toBe("Widerspruch seit 12.10.2026: Schriftlich");
  });

  it("ends an unsent submission on withdrawal and reopens it with new consent", () => {
    expect(statusAfterWithdrawal({ status: "vorgemerkt", submittedAt: null })).toBe("zurueckgezogen");
    expect(statusAfterWithdrawal({ status: "einwilligung_offen", submittedAt: null })).toBe("zurueckgezogen");
    // A sent profile keeps its status; a decided submission too.
    expect(statusAfterWithdrawal({ status: "interview", submittedAt: consentAt })).toBe("interview");
    expect(statusAfterWithdrawal({ status: "absage", submittedAt: null })).toBe("absage");
    expect(statusAfterConsent({ status: "einwilligung_offen", submittedAt: null })).toBe("vorgemerkt");
    expect(statusAfterConsent({ status: "zurueckgezogen", submittedAt: null, withdrawnAt })).toBe("vorgemerkt");
    expect(statusAfterConsent({ status: "zurueckgezogen", submittedAt: consentAt, withdrawnAt })).toBe("zurueckgezogen");
    // Closed by Ferhat without a withdrawal: stays closed.
    expect(statusAfterConsent({ status: "zurueckgezogen", submittedAt: null, withdrawnAt: null })).toBe("zurueckgezogen");
  });
});

describe("what a consent covers", () => {
  it("covers the dossier with the name only when recorded for it", () => {
    expect(consentCovers({ consentScope: "anonym" }, "anonym")).toBe(true);
    expect(consentCovers({ consentScope: "anonym" }, "namentlich")).toBe(false);
    expect(consentCovers({ consentScope: "namentlich" }, "namentlich")).toBe(true);
    expect(consentCovers({ consentScope: "namentlich" }, "anonym")).toBe(true);
    // Unknown scope (e.g. before it was recorded): the anonymised dossier only.
    expect(consentCovers({ consentScope: null }, "namentlich")).toBe(false);
    expect(consentCovers({}, "anonym")).toBe(true);
  });

  it("names the scope", () => {
    expect(consentScopeText("anonym")).toBe("für das anonymisierte Dossier");
    expect(consentScopeText("namentlich")).toBe("für das Dossier mit Namen");
    expect(consentScopeText(null)).toBeNull();
  });
});
