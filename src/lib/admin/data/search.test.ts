import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { contractSearchWhere } from "../contracts/data";
import { companySearchWhere } from "./companies";
import { assignmentSearchWhere, contactSearchWhere, documentSearchWhere, excerpt, parseDisplayNumber, phoneVariants, snippetSearchWhere } from "./search";
import { everyWord, wordPatterns } from "./words";

const dialect = new PgDialect();
const render = (where: SQL | undefined) => (where ? dialect.sqlToQuery(where) : null);

describe("parseDisplayNumber", () => {
  it("recognises record numbers in any spelling", () => {
    expect(parseDisplayNumber(" M - 7 ")).toEqual({ kind: "mandate", id: 7 });
    expect(parseDisplayNumber("m7")).toEqual({ kind: "mandate", id: 7 });
    expect(parseDisplayNumber("f0003")).toEqual({ kind: "company", id: 3 });
    expect(parseDisplayNumber("A-0012")).toEqual({ kind: "assignment", id: 12 });
    expect(parseDisplayNumber("t 4")).toEqual({ kind: "snippet", id: 4 });
  });

  it("recognises contract numbers and pads them to four digits", () => {
    expect(parseDisplayNumber("V-2026-0001")).toEqual({ kind: "contract", number: "V-2026-0001" });
    expect(parseDisplayNumber("v 2026-1")).toEqual({ kind: "contract", number: "V-2026-0001" });
    expect(parseDisplayNumber("V2026-12345")).toEqual({ kind: "contract", number: "V-2026-12345" });
  });

  it("leaves names, skills and zero ids alone", () => {
    expect(parseDisplayNumber("Keller")).toBeNull();
    expect(parseDisplayNumber("SAP FI")).toBeNull();
    expect(parseDisplayNumber("M-0")).toBeNull();
    expect(parseDisplayNumber("M-")).toBeNull();
    expect(parseDisplayNumber("K-0042")).toBeNull();
    expect(parseDisplayNumber("V-2026")).toBeNull();
    expect(parseDisplayNumber("X-0042")).toBeNull();
    expect(parseDisplayNumber("")).toBeNull();
  });
});

describe("phoneVariants", () => {
  it("finds Swiss numbers stored with either prefix", () => {
    expect(phoneVariants("079 123 45 67")).toEqual(["0791234567", "41791234567"]);
    expect(phoneVariants("+41 79 123 45 67")).toEqual(["41791234567", "0791234567"]);
    expect(phoneVariants("0041 79 123 45 67")).toEqual(["0041791234567", "0791234567", "41791234567"]);
    expect(phoneVariants("41791234567")).toEqual(["41791234567", "0791234567"]);
  });

  it("matches parts of a number without guessing a prefix", () => {
    expect(phoneVariants("123 45")).toEqual(["12345"]);
    expect(phoneVariants("4123")).toEqual(["4123"]);
  });

  it("returns null for text and very short input", () => {
    expect(phoneVariants("Müller")).toBeNull();
    expect(phoneVariants("K-0042")).toBeNull();
    expect(phoneVariants("079")).toBeNull();
    expect(phoneVariants("")).toBeNull();
  });
});

describe("excerpt", () => {
  const text = `Sehr geehrte Damen und Herren\n\nIch bewerbe mich als Business Analyst. ${"Erfahrung in Banken und Versicherungen. ".repeat(6)}Mein Kurzprofil: zwölf Jahre SAP S/4HANA, Requirements Engineering und Testmanagement.`;

  it("shows short texts whole, with whitespace collapsed", () => {
    expect(excerpt("Kurzprofil\n\nBusiness   Analyst", "x")).toBe("Kurzprofil Business Analyst");
  });

  it("cuts long texts around the first word found", () => {
    const piece = excerpt(text, "s/4hana", 80);
    expect(piece.startsWith("…")).toBe(true);
    expect(piece).toContain("S/4HANA");
    expect(piece.length).toBeLessThanOrEqual(82);
  });

  it("starts at the beginning when the hit was elsewhere", () => {
    const piece = excerpt(text, "GHR", 60);
    expect(piece.startsWith("Sehr geehrte")).toBe(true);
    expect(piece.endsWith("…")).toBe(true);
  });
});

describe("word-wise search conditions", () => {
  it("splits into at most six escaped words", () => {
    expect(wordPatterns("  GHR   Kurzprofil ")).toEqual(["%GHR%", "%Kurzprofil%"]);
    expect(wordPatterns("100% sicher_")).toEqual(["%100\\%%", "%sicher\\_%"]);
    expect(wordPatterns("a b c d e f g h")).toHaveLength(6);
    expect(wordPatterns("   ")).toEqual([]);
    expect(everyWord("", () => undefined)).toBeUndefined();
  });

  it("requires every word somewhere in the snippet", () => {
    const q = render(snippetSearchWhere("GHR Kurzprofil"))!;
    expect(q.params).toEqual(["%GHR%", "%GHR%", "%GHR%", "%Kurzprofil%", "%Kurzprofil%", "%Kurzprofil%"]);
    expect(q.sql).toContain('"snippets"."body" ilike $3');
    expect(q.sql).toMatch(/\) and \(/);
    expect(snippetSearchWhere("  ")).toBeUndefined();
  });

  it("finds assignments also by their number", () => {
    const byNumber = render(assignmentSearchWhere("A-0003"))!;
    expect(byNumber.sql).toContain('"assignments"."id" = $');
    expect(byNumber.params).toContain(3);
    const byText = render(assignmentSearchWhere("Muster Bank"))!;
    expect(byText.sql).toContain('"companies"."name" ilike');
    expect(byText.sql).not.toContain('"assignments"."id" =');
  });

  it("searches documents by file name and kind, only those of a known record", () => {
    const q = render(documentSearchWhere("lohnabrechnung"))!;
    expect(q.sql).toContain('"documents"."filename" ilike $1');
    expect(q.sql).toContain('"documents"."kind" in ($2)');
    expect(q.params).toEqual(["%lohnabrechnung%", "lohnabrechnung"]);
    expect(q.sql).toContain('num_nonnulls("documents"."company_id", "documents"."mandate_id", "documents"."contract_id", "documents"."assignment_id") > 0');
    // Short words match file names only.
    expect(render(documentSearchWhere("ab"))!.sql).not.toContain('"documents"."kind"');
  });

  it("matches contracts and companies word by word, also by the company name", () => {
    const contract = render(contractSearchWhere("Rahmenvertrag GHR"))!;
    expect(contract.sql).toContain('"contracts"."number" ilike');
    expect(contract.sql).toContain('"companies"."name" ilike');
    expect(contract.params.filter((p) => p === "%GHR%")).toHaveLength(6);
    const company = render(companySearchWhere("CHE-123.456.789"))!;
    expect(company.sql).toContain("regexp_replace");
    expect(company.params).toContain("%123456789%");
    expect(render(companySearchWhere("Muster"))!.sql).not.toContain("regexp_replace");
  });

  it("looks for contacts by name in either order and by phone number", () => {
    const byName = render(contactSearchWhere("Muster Anna"))!;
    expect(byName.sql).toContain("concat_ws(' ', \"contacts\".\"first_name\", \"contacts\".\"last_name\") ilike");
    expect(byName.sql).not.toContain("regexp_replace");
    const byPhone = render(contactSearchWhere("079 123 45 67"))!;
    expect(byPhone.params).toEqual(expect.arrayContaining(["%0791234567%", "%41791234567%"]));
  });
});
