import { describe, expect, it } from "vitest";
import { resolveContractLinks, type ContractLinkFacts, type ContractLinkInput } from "./rules";

const input = (values: Partial<ContractLinkInput> = {}): ContractLinkInput => ({
  kind: "einzelauftrag",
  companyId: null,
  contactId: null,
  assignmentId: null,
  parentId: null,
  validFrom: null,
  validUntil: null,
  signedAt: null,
  ...values,
});

const facts = (values: Partial<ContractLinkFacts> = {}): ContractLinkFacts => ({
  today: "2026-10-14",
  company: null,
  contact: null,
  assignment: null,
  parent: null,
  ...values,
});

const framework = { id: 5, template: "rahmenvertrag", companyId: 1 };

describe("resolveContractLinks", () => {
  it("accepts a contract without links", () => {
    expect(resolveContractLinks(input(), facts())).toEqual({
      values: { companyId: null, contactId: null, assignmentId: null, parentId: null },
      errors: {},
    });
  });

  it("takes the company of the contact or the Rahmenvertrag when none is chosen", () => {
    expect(resolveContractLinks(input({ contactId: 7 }), facts({ contact: { id: 7, companyId: 3 } })).values.companyId).toBe(3);
    expect(resolveContractLinks(input({ parentId: 5 }), facts({ parent: framework })).values).toMatchObject({ companyId: 1, parentId: 5 });
  });

  it("rejects a contact of another company", () => {
    const r = resolveContractLinks(input({ companyId: 1, contactId: 7 }), facts({ company: { id: 1 }, contact: { id: 7, companyId: 3 } }));
    expect(r.errors).toEqual({ contactId: "Diese Person gehört nicht zur gewählten Firma." });
  });

  it("only allows a Rahmenvertrag of the same company as parent", () => {
    expect(resolveContractLinks(input({ companyId: 1, parentId: 5 }), facts({ company: { id: 1 }, parent: framework })).errors).toEqual({});
    expect(resolveContractLinks(input({ companyId: 2, parentId: 5 }), facts({ company: { id: 2 }, parent: framework })).errors).toEqual({
      parentId: "Dieser Rahmenvertrag gehört zu einer anderen Firma.",
    });
    expect(
      resolveContractLinks(input({ companyId: 1, parentId: 6 }), facts({ company: { id: 1 }, parent: { id: 6, template: "nda", companyId: 1 } })).errors,
    ).toEqual({ parentId: "Bitte einen Rahmenvertrag wählen." });
    expect(resolveContractLinks(input({ companyId: 1, parentId: 5 }), facts({ selfId: 5, company: { id: 1 }, parent: framework })).errors).toEqual({
      parentId: "Ein Vertrag kann nicht unter sich selbst stehen.",
    });
  });

  it("checks the contact against the company taken from the Rahmenvertrag", () => {
    const r = resolveContractLinks(input({ contactId: 7, parentId: 5 }), facts({ contact: { id: 7, companyId: 1 }, parent: framework }));
    expect(r).toEqual({ values: { companyId: 1, contactId: 7, assignmentId: null, parentId: 5 }, errors: {} });
    const other = resolveContractLinks(input({ contactId: 8, parentId: 5 }), facts({ contact: { id: 8, companyId: 4 }, parent: framework }));
    expect(other.errors).toEqual({ parentId: "Dieser Rahmenvertrag gehört zu einer anderen Firma." });
  });

  it("drops the parent of a Rahmenvertrag", () => {
    const r = resolveContractLinks(input({ kind: "rahmenvertrag", companyId: 1, parentId: 5 }), facts({ company: { id: 1 }, parent: framework }));
    expect(r).toEqual({ values: { companyId: 1, contactId: null, assignmentId: null, parentId: null }, errors: {} });
  });

  it("reports links that no longer exist", () => {
    const r = resolveContractLinks(input({ companyId: 1, contactId: 2, assignmentId: 3, parentId: 4 }), facts());
    expect(r.errors).toEqual({
      companyId: "Diese Firma gibt es nicht mehr.",
      contactId: "Diesen Kontakt gibt es nicht mehr.",
      assignmentId: "Diesen Auftrag gibt es nicht mehr.",
      parentId: "Diesen Rahmenvertrag gibt es nicht mehr.",
    });
  });

  it("checks the period and the signing date", () => {
    expect(resolveContractLinks(input({ validFrom: "2026-11-01", validUntil: "2026-10-31" }), facts()).errors).toEqual({ validUntil: "Das Ende liegt vor dem Beginn." });
    expect(resolveContractLinks(input({ validFrom: "2026-11-01", validUntil: "2026-11-01", signedAt: "2026-10-14" }), facts()).errors).toEqual({});
    expect(resolveContractLinks(input({ signedAt: "2026-10-15" }), facts()).errors).toEqual({ signedAt: "Das Datum liegt in der Zukunft." });
  });
});
