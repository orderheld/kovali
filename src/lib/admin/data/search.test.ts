import { describe, expect, it } from "vitest";
import { parseDisplayNumber, phoneVariants } from "./search";

describe("parseDisplayNumber", () => {
  it("recognises record numbers in any spelling", () => {
    expect(parseDisplayNumber(" M - 7 ")).toEqual({ kind: "mandate", id: 7 });
    expect(parseDisplayNumber("m7")).toEqual({ kind: "mandate", id: 7 });
    expect(parseDisplayNumber("f0003")).toEqual({ kind: "company", id: 3 });
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
