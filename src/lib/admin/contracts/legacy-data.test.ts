import { describe, expect, it } from "vitest";
import { legacyContractEntries } from "./legacy-data";

describe("legacyContractEntries", () => {
  it("labels the entries of a former Einzelauftrag in German, in the order of the old form", () => {
    const entries = legacyContractEntries({
      secondSignatory: false,
      rateUnit: "stunde",
      costCeiling: null,
      noticeDays: 30,
      rateAmount: 125,
      role: "Business Analyst",
      remote: "hybrid",
      expenses: "rahmen",
      workload: 80,
      project: "",
    });
    expect(entries.map((e) => [e.label, e.value])).toEqual([
      ["Rolle", "Business Analyst"],
      ["Pensum", "80 %"],
      ["Arbeitsform", "Hybrid"],
      ["Satz (exkl. MWST)", "CHF 125.00"],
      ["Einheit", "pro Stunde"],
      ["Spesen", "Gemäss Rahmenvertrag"],
      ["Kündigungsfrist", "30 Tage"],
      ["Zweite Unterschrift der Gegenpartei", "Nein"],
    ]);
  });

  it("keeps unknown keys and values as stored, after the known ones", () => {
    expect(legacyContractEntries({ zusatz: "x", noticeMonths: "1", mode: "neu", list: ["a"] })).toEqual([
      { key: "mode", label: "Art der Geheimhaltung", value: "neu" },
      { key: "noticeMonths", label: "Kündigungsfrist (auf Monatsende)", value: "1 Monat" },
      { key: "zusatz", label: "zusatz", value: "x" },
      { key: "list", label: "list", value: '["a"]' },
    ]);
  });

  it("is empty for contracts filed in this version", () => {
    expect(legacyContractEntries({})).toEqual([]);
    expect(legacyContractEntries(null)).toEqual([]);
  });
});
