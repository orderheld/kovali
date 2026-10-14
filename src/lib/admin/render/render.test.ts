import { describe, expect, it } from "vitest";
import { renderDocx } from "./docx";
import type { DocModel } from "./model";
import { exportFileName } from "./model";
import { renderPdf } from "./pdf";

const sample: DocModel = {
  docType: "Rahmenvertrag",
  title: "Rahmenvertrag V-2026-0001 – Muster AG",
  reference: "V-2026-0001",
  footer: "Webnova Solutions F. Demir (KOVALI)",
  confidential: true,
  blocks: [
    { type: "title", text: "Rahmenvertrag", subtitle: "über Beratungs- und IT-Dienstleistungen" },
    { type: "parties", parties: [{ role: "Auftragnehmer", lines: ["Webnova Solutions F. Demir"] }, { role: "Auftraggeber", lines: ["Muster AG"] }], between: "und" },
    { type: "heading", text: "Gegenstand", number: "1" },
    { type: "paragraph", number: "1.1", text: ["Dieser Vertrag regelt die ", { text: "Zusammenarbeit", bold: true }, " der Parteien. Strasse, Grösse, Massnahme."] },
    { type: "list", items: ["Erstens", "Zweitens"], ordered: true },
    { type: "facts", rows: [{ label: "Satz", value: "CHF 120.00 pro Stunde" }] },
    { type: "table", columns: [{ label: "Position" }, { label: "Betrag", align: "right" }], rows: [["Beratung", "CHF 1’000.00"]] },
    { type: "tags", items: ["SAP FI", "Jira"] },
    { type: "box", title: "Hinweis", text: "Vertraulich." },
    { type: "timeline", period: "2020 – 2024", title: "Business Analyst", subtitle: "Grossbank, Zürich", text: "Anforderungen", tags: ["BPMN"] },
    { type: "spacer", size: "md" },
    { type: "pageBreak" },
    { type: "signatures", parties: [{ party: "Auftragnehmer", signers: [{ name: "Ferhat Demir", role: "Geschäftsführer" }] }, { party: "Auftraggeber", signers: [{}] }] },
  ],
};

describe("document rendering", () => {
  it("renders every block type as PDF", async () => {
    const pdf = await renderPdf(sample);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
  }, 30_000);

  it("renders every block type as Word", async () => {
    const docx = await renderDocx(sample);
    expect(docx.subarray(0, 2).toString()).toBe("PK");
    expect(docx.length).toBeGreaterThan(5_000);
  }, 30_000);

  it("builds safe file names", () => {
    expect(exportFileName("Rahmenvertrag V-2026-0001 – Müller & Co. AG", "pdf")).toBe("Rahmenvertrag_V-2026-0001_Muller_Co._AG.pdf");
  });
});
