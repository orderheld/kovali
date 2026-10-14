import { describe, expect, it } from "vitest";
import { isCapitalCompany, NO_OWN_FIRM, SOLE_PROPRIETOR_WARNING, subcontractorCheck, UNKNOWN_LEGAL_FORM_WARNING } from "./submissions";

const firm = (kind: string, legalForm: string | null) => ({ id: 7, name: "Muster Consulting", kind, legalForm });

describe("subcontractor firm", () => {
  it("recognises GmbH and AG, also in French and Italian", () => {
    for (const form of ["GmbH", "AG", "gmbh", "Aktiengesellschaft", "SA", "Sàrl", "Sagl", "GmbH in Gründung"]) expect(isCapitalCompany(form)).toBe(true);
    for (const form of ["Einzelunternehmen", "Einzelfirma", "Kollektivgesellschaft", "Agentur", "", null]) expect(isCapitalCompany(form)).toBe(false);
  });

  it("needs a linked company of kind subunternehmer", () => {
    expect(subcontractorCheck(null)).toEqual({ ok: false, error: NO_OWN_FIRM });
    expect(subcontractorCheck(firm("auftraggeber", "AG"))).toEqual({ ok: false, error: NO_OWN_FIRM });
    expect(subcontractorCheck(firm("subunternehmer", "GmbH"))).toEqual({ ok: true, firm: firm("subunternehmer", "GmbH"), warning: null });
  });

  it("allows other legal forms with a warning", () => {
    expect(subcontractorCheck(firm("subunternehmer", "Einzelunternehmen"))).toMatchObject({ ok: true, warning: SOLE_PROPRIETOR_WARNING });
    expect(subcontractorCheck(firm("subunternehmer", null))).toMatchObject({ ok: true, warning: UNKNOWN_LEGAL_FORM_WARNING });
    expect(subcontractorCheck(firm("subunternehmer", "Kollektivgesellschaft"))).toMatchObject({
      ok: true,
      warning: "Kollektivgesellschaft, keine GmbH oder AG: höheres Risiko Scheinselbständigkeit, AHV-Bestätigung der Selbständigkeit einholen.",
    });
  });
});
