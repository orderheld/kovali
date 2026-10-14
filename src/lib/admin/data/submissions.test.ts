import { describe, expect, it } from "vitest";
import { isCapitalCompany } from "../legal-form";
import { NO_OWN_FIRM, SOLE_PROPRIETOR_WARNING, subcontractorCheck, UNKNOWN_LEGAL_FORM_WARNING } from "./submissions";

const firm = (kind: string, legalForm: string | null, name = "Muster Consulting", legalName: string | null = null) => ({ id: 7, name, kind, legalForm, legalName });

describe("subcontractor firm", () => {
  it("recognises GmbH and AG, also in French and Italian", () => {
    for (const legalForm of ["GmbH", "AG", "gmbh", "Aktiengesellschaft", "SA", "S.A.", "Sàrl", "Sarl", "Sagl", "GmbH in Gründung"]) {
      expect(isCapitalCompany({ legalForm })).toBe(true);
    }
    for (const legalForm of ["Einzelunternehmen", "Einzelfirma", "Kollektivgesellschaft", "Agentur", "", null]) expect(isCapitalCompany({ legalForm })).toBe(false);
  });

  it("falls back to the name when the legal form is empty, like the candidate page", () => {
    expect(subcontractorCheck(firm("subunternehmer", "", "Muster Analytics AG"))).toMatchObject({ ok: true, warning: null });
    expect(subcontractorCheck(firm("subunternehmer", null, "Muster Analytics", "Muster Analytics GmbH"))).toMatchObject({ ok: true, warning: null });
    // A legal form that is filled in decides, whatever the name says.
    expect(subcontractorCheck(firm("subunternehmer", "Einzelunternehmen", "Muster AG"))).toMatchObject({ ok: true, warning: SOLE_PROPRIETOR_WARNING });
    expect(subcontractorCheck(firm("subunternehmer", null, "Agil Beratung"))).toMatchObject({ ok: true, warning: UNKNOWN_LEGAL_FORM_WARNING });
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
