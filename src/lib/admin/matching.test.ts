import { describe, expect, it } from "vitest";
import { matchCandidate, rankCandidates, type MatchCandidate, type MatchMandate } from "./matching";

/** Matching margin with and without the subcontractor's VAT as cost. Fictional data only. */

const today = "2026-10-13";

const candidate: MatchCandidate = {
  id: 1,
  status: "aktiv",
  disciplines: ["business-analysis"],
  skills: ["BPMN"],
  sapModules: [],
  detectedSkills: [],
  seniority: "senior",
  availableFrom: "2026-11-01",
  workloadMin: 80,
  workloadMax: 100,
  rateAmount: 112,
  rateUnit: "stunde",
  consentAt: null,
  retentionUntil: null,
};

const mandate: MatchMandate = {
  disciplines: ["business-analysis"],
  requiredSkills: ["BPMN"],
  niceSkills: [],
  seniority: "senior",
  startDate: "2026-11-01",
  workload: 100,
  rateSell: 120,
  rateUnit: "stunde",
};

const marginReason = (reasons: string[]) => reasons.find((r) => r.startsWith("Marge rund"));

describe("matching margin", () => {
  it("uses the net rates when KOVALI can reclaim the VAT", () => {
    const m = matchCandidate(candidate, mandate, today, { kovaliVatRegistered: true });
    expect(marginReason(m.reasons)).toBe("Marge rund 7 %");
    expect(m.warnings).toContain("Marge unter 10 %");
  });

  it("counts the subcontractor's VAT as cost without a VAT number of KOVALI", () => {
    // 112 × 1.081 = 121.07 > 120: the net margin of 7 % is a loss.
    const loss = matchCandidate(candidate, mandate, today, { kovaliVatRegistered: false });
    expect(marginReason(loss.reasons)).toBeUndefined();
    expect(loss.warnings).toContain("Keine Marge nach nicht abziehbarer MWST des Subunternehmens");
    expect(loss.score).toBeLessThan(matchCandidate(candidate, mandate, today, { kovaliVatRegistered: true }).score);

    // 100 × 1.081 = 108.10: rund 10 % instead of 17 %.
    const ok = matchCandidate({ ...candidate, rateAmount: 100 }, mandate, today, { kovaliVatRegistered: false });
    expect(marginReason(ok.reasons)).toBe("Marge rund 10 % (inkl. nicht abziehbarer MWST des Subunternehmens)");
  });

  it("still reports a rate above the budget as such", () => {
    const m = matchCandidate({ ...candidate, rateAmount: 130 }, mandate, today, { kovaliVatRegistered: false });
    expect(m.warnings).toContain("Satzvorstellung über dem Budget");
    expect(m.warnings).not.toContain("Keine Marge nach nicht abziehbarer MWST des Subunternehmens");
  });

  it("passes the VAT situation on when ranking", () => {
    const [registered] = rankCandidates([candidate], mandate, today, { kovaliVatRegistered: true });
    const [unregistered] = rankCandidates([candidate], mandate, today, { kovaliVatRegistered: false });
    expect(registered.match.score).toBeGreaterThan(unregistered.match.score);
  });
});
