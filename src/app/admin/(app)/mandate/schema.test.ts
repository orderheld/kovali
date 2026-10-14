import { describe, expect, it } from "vitest";
import { parseForm } from "@/lib/admin/forms";
import { consentSchema, mandateSchema, portalSchema, shareSchema } from "./schema";

const errorsOf = (result: ReturnType<typeof parseForm>) => (result.ok ? {} : result.state.status === "error" ? (result.state.errors ?? {}) : {});

describe("mandateSchema", () => {
  const base = { kind: "anfrage", title: "Data Engineer", rateUnit: "stunde", status: "neu", priority: "normal" };

  it("accepts a minimal mandate and normalises blanks to null", () => {
    const result = parseForm(mandateSchema, { ...base, companyId: "", workload: "", requiredSkills: "[]" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.companyId).toBeNull();
      expect(result.data.workload).toBeNull();
    }
  });

  it("reports an end before the start together with other field errors", () => {
    const result = parseForm(mandateSchema, { ...base, title: "  ", startDate: "2026-12-01", endDate: "2026-11-01" });
    expect(errorsOf(result)).toMatchObject({ title: expect.any(String), endDate: "Das Ende liegt vor dem Start." });
  });

  it("rejects unknown disciplines", () => {
    const result = parseForm(mandateSchema, { ...base, disciplines: JSON.stringify(["business_analysis", "erfunden"]) });
    expect(errorsOf(result)).toHaveProperty("disciplines");
  });
});

describe("consentSchema", () => {
  it("requires a note for a verbal consent", () => {
    const result = parseForm(consentSchema, { consentDate: "2026-10-13", consentMethod: "muendlich", consentNote: "" });
    expect(errorsOf(result)).toHaveProperty("consentNote");
  });

  it("accepts an e-mail consent without a note", () => {
    expect(parseForm(consentSchema, { consentDate: "2026-10-13", consentMethod: "e_mail" }).ok).toBe(true);
  });
});

describe("portalSchema", () => {
  it("needs a title and a description once the vacancy is visible", () => {
    const errors = errorsOf(parseForm(portalSchema, { portalVisibility: "ausgewaehlt", portalTitle: "", portalDescription: "", portalRateUnit: "stunde" }));
    expect(Object.keys(errors).sort()).toEqual(["portalDescription", "portalTitle"]);
  });

  it("allows empty texts while the vacancy stays out of the portal", () => {
    expect(parseForm(portalSchema, { portalVisibility: "keine", portalRateUnit: "stunde" }).ok).toBe(true);
  });
});

describe("shareSchema", () => {
  it("needs at least one candidate", () => {
    expect(errorsOf(parseForm(shareSchema, { candidateIds: "[]" }))).toHaveProperty("candidateIds");
  });

  it("parses the JSON list of ids", () => {
    const result = parseForm(shareSchema, { candidateIds: "[3,1]" });
    expect(result.ok && result.data.candidateIds).toEqual([3, 1]);
  });
});
