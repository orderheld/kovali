import { describe, expect, it } from "vitest";
import { site, unconfirmedFields } from "./site";

/**
 * Check digit of a Swiss UID (CHE-123.456.789): weights 5 4 3 2 7 6 5 4 on the first eight
 * digits, 11 minus the sum modulo 11; a result of 11 counts as 0, 10 never occurs.
 */
function uidCheckDigitValid(uid: string): boolean {
  const digits = uid.replace(/\D/g, "");
  if (digits.length !== 9) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const check = (11 - (sum % 11)) % 11;
  return check !== 10 && check === Number(digits[8]);
}

describe("register numbers in site.ts", () => {
  const { uid, vatNumber } = site.legal;

  it("keeps the UID in the official format with a valid check digit", () => {
    if (!uid.value) return;
    expect(uid.value).toMatch(/^CHE-\d{3}\.\d{3}\.\d{3}$/);
    expect(uidCheckDigitValid(uid.value)).toBe(true);
  });

  it("builds the MWST number from the UID plus «MWST»", () => {
    if (!vatNumber.value) return;
    expect(uid.value).toBeTruthy();
    expect(vatNumber.value).toBe(`${uid.value} MWST`);
  });

  it("no longer lists confirmed numbers in the launch check", () => {
    const open = unconfirmedFields().map((f) => f.field);
    if (uid.confirmed) expect(open).not.toContain("UID (legal.uid)");
    if (vatNumber.confirmed) expect(open).not.toContain("MWST-Nummer (legal.vatNumber)");
  });

  it("rejects a mistyped UID", () => {
    expect(uidCheckDigitValid("CHE-439.891.661")).toBe(false);
    expect(uidCheckDigitValid("CHE-439.891.66")).toBe(false);
  });
});
