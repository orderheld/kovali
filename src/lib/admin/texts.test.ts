import { describe, expect, it } from "vitest";
import { multilineText, optMultilineText } from "./text-schema";
import { formatTextStats, groupSnippets, normalizeText, PINNED_SECTION, previewText, textStats } from "./texts";

describe("texts", () => {
  it("stores line breaks as LF and drops blank space around the text", () => {
    expect(normalizeText("  Guten Tag\r\n\r\nGerne bewerbe ich mich.\rGruss\n ")).toBe("Guten Tag\n\nGerne bewerbe ich mich.\nGruss");
  });

  it("validates long texts with their line breaks", () => {
    expect(multilineText(100).parse("Zeile 1\r\n  Zeile 2\r\n")).toBe("Zeile 1\n  Zeile 2");
    expect(multilineText(100, "Bitte den Text eingeben.").safeParse("  \r\n ").error?.issues[0].message).toBe("Bitte den Text eingeben.");
    expect(multilineText(5).safeParse("123456").success).toBe(false);
    expect(optMultilineText(100).parse("")).toBeNull();
    expect(optMultilineText(100).parse(undefined)).toBeNull();
  });

  it("counts characters and words", () => {
    expect(textStats("Guten Tag\n\nich bin Ferhat")).toEqual({ chars: 25, words: 5 });
    expect(textStats("")).toEqual({ chars: 0, words: 0 });
    expect(textStats(null)).toEqual({ chars: 0, words: 0 });
    expect(formatTextStats({ chars: 1234, words: 1 })).toBe("1’234 Zeichen · 1 Wort");
  });

  it("cuts previews at a word boundary", () => {
    expect(previewText("kurz", 10)).toBe("kurz");
    expect(previewText("Business Analyst mit Erfahrung", 20)).toBe("Business Analyst …");
  });

  it("groups snippets: pinned first, then categories, without category last", () => {
    const rows = [
      { id: 1, pinned: true, category: "Bewerbung" },
      { id: 2, pinned: false, category: null },
      { id: 3, pinned: false, category: "Kurzprofil" },
      { id: 4, pinned: false, category: "Bewerbung" },
      { id: 5, pinned: false, category: "  " },
      { id: 6, pinned: false, category: "E-Mail" },
    ];
    const sections = groupSnippets(rows);
    expect(sections.map((s) => [s.key, s.title, s.items.map((i) => i.id)])).toEqual([
      [PINNED_SECTION, "Angeheftet", [1]],
      ["Bewerbung", "Bewerbung", [4]],
      ["E-Mail", "E-Mail", [6]],
      ["Kurzprofil", "Kurzprofil", [3]],
      ["", "Ohne Kategorie", [2, 5]],
    ]);
    expect(groupSnippets([])).toEqual([]);
  });
});
