import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrations } from "../db/migrations";
import * as schema from "../db/schema";
import { parseForm } from "../forms";
import { kovaliParty } from "../party";
import { renderDocx } from "../render/docx";
import { inlineText, type Block, type DocModel } from "../render/model";
import { renderPdf } from "../render/pdf";
import { parseStored } from "./define";
import { buildContractDocument, contractIssues } from "./document";
import { formatContractNumber, insertContractWithNumber, isUniqueViolation, nextContractNumber, parseContractNumber } from "./numbering";
import { contractTemplates, getTemplate } from "./templates";
import { kovaliSigners } from "./text";
import { suggestTitle } from "./titles";
import { templateIds, type CompanyInfo, type ContractContext, type TemplateId } from "./types";

/**
 * Contract numbers and every template: builds with fictional sample data, renders PDF and
 * Word, checks party names, Swiss spelling and that no text claims a licence or offers
 * staff leasing or placement. Set CONTRACTS_PDF_OUT=<dir> to keep the sample PDFs.
 */

// --- Sample data (fictional) ----------------------------------------------------------

const client: CompanyInfo = {
  id: 11,
  name: "Muster Consulting",
  legalName: "Muster Consulting AG",
  legalForm: "AG",
  uid: "CHE-111.222.333",
  street: "Seestrasse 10",
  postalCode: "8002",
  city: "Zürich",
  country: "Schweiz",
  kind: "auftraggeber",
};

const subFirm: CompanyInfo = {
  id: 12,
  name: "Beispiel Informatik",
  legalName: "Beispiel Informatik GmbH",
  legalForm: "GmbH",
  uid: "CHE-444.555.666",
  street: "Hauptgasse 3",
  postalCode: "4500",
  city: "Solothurn",
  country: "Schweiz",
  kind: "subunternehmer",
};

const soleFirm: CompanyInfo = { ...subFirm, id: 13, name: "Anna Beispiel IT", legalName: "Anna Beispiel IT-Beratung", legalForm: "Einzelunternehmen", uid: null };

const person = { id: 7, firstName: "Anna", lastName: "Beispiel", street: "Lindenweg 5", postalCode: "3000", city: "Bern", country: "Schweiz", ref: "K-0007" };

function ctx(over: Partial<ContractContext> = {}): ContractContext {
  return {
    number: "V-2026-0042",
    title: "Muster",
    validFrom: "2026-11-01",
    validUntil: "2027-04-30",
    signedAt: null,
    kovali: kovaliParty(),
    company: client,
    contact: { id: 3, name: "Peter Muster", role: "Leiter Einkauf" },
    candidate: null,
    mandate: null,
    parent: null,
    ...over,
  };
}

const mandate = { id: 5, ref: "M-0005", title: "SAP FI Consultant", reference: "REQ-17", endClient: "Grossbank, Zürich", companyName: "Muster Consulting AG" };
const parent = { id: 1, number: "V-2026-0001", title: "Rahmenvertrag mit Muster Consulting", template: "rahmenvertrag", validFrom: "2026-11-01", signedAt: "2026-10-20" };

const samples: Record<TemplateId, { data: Record<string, unknown>; ctx: ContractContext; names: string[] }> = {
  rahmenvertrag: {
    data: { specialTerms: "Die Parteien treffen sich quartalsweise zu einem Austausch über laufende Einzelaufträge." },
    ctx: ctx({ validUntil: null }),
    names: ["Muster Consulting AG", "Peter Muster"],
  },
  einzelauftrag: {
    data: {
      role: "SAP FI Consultant",
      project: "S/4HANA Finance",
      endClient: "Grossbank, Zürich",
      description: "Analyse der Prozesse im Hauptbuch\nSpezifikation der Anpassungen\nTestunterstützung",
      rateAmount: 150,
      volume: 800,
      location: "Zürich",
    },
    ctx: ctx({ candidate: person, parent, mandate }),
    names: ["Muster Consulting AG", "Anna Beispiel", "V-2026-0001"],
  },
  subunternehmer: {
    data: { clientName: "Muster Consulting AG", endClient: "Grossbank, Zürich", role: "SAP FI Consultant", description: "Analyse und Spezifikation im Hauptbuch.", rateAmount: 1100, rateUnit: "tag", insuranceAmount: 1000000 },
    ctx: ctx({ company: subFirm, contact: null, candidate: person, mandate }),
    names: ["Beispiel Informatik GmbH", "Anna Beispiel"],
  },
  nda: {
    data: { mode: "gegenseitig" },
    ctx: ctx({ validFrom: null, validUntil: null }),
    names: ["Muster Consulting AG", "Peter Muster"],
  },
  einwilligung: {
    data: { endClient: "Grossbank, Zürich", variant: "anonym" },
    ctx: ctx({ candidate: person, mandate, contact: null, validFrom: null, validUntil: null }),
    names: ["Anna Beispiel", "Muster Consulting AG", "SAP FI Consultant"],
  },
  beratung: {
    data: { scope: "Review der Anforderungen im Projekt Kundenportal\nWorkshop zur Priorisierung", feeAmount: 165, estimate: "rund 8 Tage", costCeiling: 12000 },
    ctx: ctx(),
    names: ["Muster Consulting AG", "Peter Muster"],
  },
};

function docText(doc: DocModel): string {
  const parts: string[] = [doc.title, doc.footer, doc.docType];
  const walk = (b: Block) => {
    switch (b.type) {
      case "title":
        parts.push(b.text, b.subtitle ?? "");
        break;
      case "heading":
        parts.push(b.text);
        break;
      case "paragraph":
        parts.push(inlineText(b.text));
        break;
      case "list":
        parts.push(...b.items.map(inlineText));
        break;
      case "facts":
        parts.push(...b.rows.flatMap((r) => [r.label, inlineText(r.value)]));
        break;
      case "table":
        parts.push(...b.rows.flat().map(inlineText));
        break;
      case "parties":
        parts.push(...b.parties.flatMap((p) => [p.role, ...p.lines]));
        break;
      case "signatures":
        parts.push(...b.parties.flatMap((p) => [p.party, ...p.signers.flatMap((s) => [s.name ?? "", s.role ?? ""])]));
        break;
      case "box":
        parts.push(b.title ?? "", inlineText(b.text));
        break;
      default:
        break;
    }
  };
  doc.blocks.forEach(walk);
  return parts.join("\n");
}

/** Sentences that offer staff leasing or placement, claim a licence or name a placement fee. */
function forbiddenStatements(text: string): string[] {
  const sentences = text.split(/(?<=[.;:])\s+|\n/);
  const problems: string[] = [];
  for (const s of sentences) {
    if (/Vermittlungs(provision|gebühr|honorar)|Platzierungs|lizenziert/i.test(s)) problems.push(s);
    if (/(Personalverleih|Arbeitsvermittlung|vermittelt)/.test(s) && !/\b(weder|kein|keine|keinen|nicht)\b/.test(s)) problems.push(s);
    if (/Bewilligung/.test(s) && /(KOVALI|AVG|Verleih|Vermittlung)/.test(s) && !/Arbeits- und Aufenthaltsbewilligungen/.test(s)) problems.push(s);
  }
  return problems;
}

function headingNumbers(doc: DocModel): Map<string, string> {
  const map = new Map<string, string>();
  for (const b of doc.blocks) if (b.type === "heading" && b.number) map.set(b.number, b.text);
  return map;
}

/** The posted form values for the defaults plus the sample data, as strings like a browser sends. */
function asForm(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === false) continue;
    out[k] = v === true ? "on" : String(v);
  }
  return out;
}

const pdfOut = process.env.CONTRACTS_PDF_OUT;

// --- Numbering ------------------------------------------------------------------------

describe("contract numbers", () => {
  it("formats and parses V-YYYY-NNNN", () => {
    expect(formatContractNumber(2026, 1)).toBe("V-2026-0001");
    expect(formatContractNumber(2026, 12345)).toBe("V-2026-12345");
    expect(parseContractNumber("V-2026-0042")).toEqual({ year: 2026, seq: 42 });
    expect(parseContractNumber(" V-2027-10001 ")).toEqual({ year: 2027, seq: 10001 });
    expect(parseContractNumber("V-2026-0000")).toBeNull();
    expect(parseContractNumber("V-26-0001")).toBeNull();
    expect(parseContractNumber("K-0042")).toBeNull();
    expect(parseContractNumber(null)).toBeNull();
  });

  it("continues the sequence of the year and ignores other years", () => {
    expect(nextContractNumber(2026, [])).toBe("V-2026-0001");
    expect(nextContractNumber(2026, ["V-2026-0001", "V-2026-0009", "V-2025-0150", "Muster"])).toBe("V-2026-0010");
    expect(nextContractNumber(2027, ["V-2026-0009"])).toBe("V-2027-0001");
    expect(nextContractNumber(2026, ["V-2026-9999"])).toBe("V-2026-10000");
  });

  it("recognises unique violations, also wrapped by Drizzle", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ message: "failed", cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

const dbUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!dbUrl)("contract numbers in the database", () => {
  const pool = new Pool({ connectionString: dbUrl, max: 8 });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await pool.query("drop schema public cascade; create schema public;");
    for (const m of migrations) await pool.query(m.sql);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("gives concurrent inserts distinct consecutive numbers", async () => {
    const values = { template: "nda", title: "Test", data: {} };
    const rows = await Promise.all(Array.from({ length: 6 }, () => insertContractWithNumber(db, values, 2026)));
    expect(rows.map((r) => r.number).sort()).toEqual(["V-2026-0001", "V-2026-0002", "V-2026-0003", "V-2026-0004", "V-2026-0005", "V-2026-0006"]);
    const next = await insertContractWithNumber(db, values, 2027);
    expect(next.number).toBe("V-2027-0001");
  });
});

// --- Templates ------------------------------------------------------------------------

describe("contract templates", () => {
  it("has a template for every id", () => {
    expect(Object.keys(contractTemplates).sort()).toEqual([...templateIds].sort());
  });

  for (const id of templateIds) {
    const t = contractTemplates[id];
    const sample = samples[id];

    describe(t.name, () => {
      const doc = buildContractDocument({ template: id, data: { ...t.defaults, ...sample.data } }, sample.ctx);
      const text = docText(doc);

      it("defines every form field in the schema and the defaults", () => {
        const fieldNames = t.sections.flatMap((s) => s.fields.map((f) => f.name)).sort();
        expect(new Set(fieldNames).size).toBe(fieldNames.length);
        expect(fieldNames).toEqual(Object.keys(t.defaults).sort());
        expect(Object.keys((t.schema as unknown as { shape: Record<string, unknown> }).shape).sort()).toEqual(fieldNames);
        const parsed = parseForm(t.schema, asForm({ ...t.defaults, ...sample.data }));
        expect(parsed.ok ? null : parsed.state).toBeNull();
      });

      it("contains the parties and the contract number", () => {
        expect(text).toContain(kovaliParty().name);
        expect(text).toContain("V-2026-0042");
        for (const name of sample.names) expect(text).toContain(name);
        expect(doc.footer).toBe(`${kovaliParty().name} · V-2026-0042`);
      });

      it("uses Swiss spelling and makes no licence claim", () => {
        expect(text).not.toContain("ß");
        expect(forbiddenStatements(text)).toEqual([]);
      });

      it("numbers sections and clauses consecutively", () => {
        let section = 0;
        let clause = 0;
        for (const b of doc.blocks) {
          if (b.type === "heading" && b.number) {
            section += 1;
            clause = 0;
            expect(b.number).toBe(String(section));
          } else if (b.type === "paragraph" && b.number) {
            clause += 1;
            expect(b.number).toBe(`${section}.${clause}`);
          }
        }
        expect(section).toBeGreaterThan(4);
      });

      it("renders as PDF and Word", async () => {
        const [pdf, docx] = await Promise.all([renderPdf(doc), renderDocx(doc)]);
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        expect(docx.subarray(0, 2).toString()).toBe("PK");
        if (pdfOut) {
          mkdirSync(pdfOut, { recursive: true });
          writeFileSync(path.join(pdfOut, `${id}.pdf`), pdf);
          writeFileSync(path.join(pdfOut, `${id}.docx`), docx);
        }
      }, 60_000);

      it("builds from empty stored data without throwing", () => {
        const empty = buildContractDocument({ template: id, data: {} }, ctx({ company: null, contact: null, candidate: null, mandate: null, parent: null, validFrom: null, validUntil: null }));
        expect(empty.blocks.length).toBeGreaterThan(10);
        expect(contractIssues({ template: id, data: {} }, ctx({ company: null, candidate: null })).length).toBeGreaterThan(0);
      });
    });
  }

  it("keeps the cross-references of the Rahmenvertrag stable", () => {
    const doc = buildContractDocument({ template: "rahmenvertrag", data: { ...contractTemplates.rahmenvertrag.defaults, specialTerms: "Besonderes." } }, ctx());
    const h = headingNumbers(doc);
    expect(h.get("2")).toBe("Rechtsnatur der Zusammenarbeit");
    expect(h.get("5")).toBe("Vergütung und Rechnungsstellung");
    expect(h.get("10")).toBe("Haftung und Versicherung");
    expect(h.get("11")).toBe("Laufzeit und Beendigung");
    const spesen = doc.blocks.find((b) => b.type === "paragraph" && b.number === "5.5");
    expect(spesen && inlineText((spesen as { text: string }).text)).toMatch(/Spesen/);
    const text = docText(doc);
    expect(text).toContain("Art. 101 Abs. 2 OR");
    expect(text).toContain("Art. 404 Abs. 1 OR");
    expect(text).toContain("kein Entgelt");
  });

  it("keeps the cross-references of the Subunternehmervertrag and Beratungsvertrag stable", () => {
    const sub = headingNumbers(buildContractDocument({ template: "subunternehmer", data: samples.subunternehmer.data }, samples.subunternehmer.ctx));
    expect(sub.get("2")).toBe("Einsatz");
    expect(sub.get("6")).toBe("Vergütung, Zeitrapporte und Rechnungsstellung");
    expect(sub.get("9")).toBe("Kundenschutz");
    expect(sub.get("11")).toBe("Haftung und Versicherung");
    const ber = headingNumbers(buildContractDocument({ template: "beratung", data: samples.beratung.data }, samples.beratung.ctx));
    expect(ber.get("7")).toBe("Haftung");
  });

  it("asks a sole proprietorship for the AHV confirmation and a GmbH for proof of employment", () => {
    const gmbh = docText(buildContractDocument({ template: "subunternehmer", data: samples.subunternehmer.data }, samples.subunternehmer.ctx));
    expect(gmbh).not.toContain("AHV-Bestätigung");
    expect(gmbh).toContain("angestellt oder an ihm beteiligt");
    expect(gmbh).toContain("Arbeits- und Aufenthaltsbewilligungen");
    expect(gmbh).toContain("nicht davon ab, ob und wann die Kundin KOVALI bezahlt");
    const sole = docText(buildContractDocument({ template: "subunternehmer", data: samples.subunternehmer.data }, { ...samples.subunternehmer.ctx, company: soleFirm }));
    expect(sole).toContain("AHV-Bestätigung");
    expect(sole).toContain("Einzelunternehmen");
  });

  it("leaves out the penalty of an NDA without amount and reserves statutory secrecy", () => {
    const text = docText(buildContractDocument({ template: "nda", data: { mode: "einseitig_kovali", penaltyAmount: null } }, ctx({ company: null, contact: null, candidate: person })));
    expect(text).not.toContain("Konventionalstrafe von");
    expect(text).toContain("Art. 162 StGB");
    expect(text).toContain("Anna Beispiel");
    const withPenalty = docText(buildContractDocument({ template: "nda", data: { penaltyAmount: 25000 } }, ctx()));
    expect(withPenalty).toContain("CHF 25’000.00");
  });

  it("names mandate, recipient, revocation and the right of access in the consent", () => {
    const text = docText(buildContractDocument({ template: "einwilligung", data: samples.einwilligung.data }, samples.einwilligung.ctx));
    expect(text).toContain("M-0005");
    expect(text).toContain("Muster Consulting AG, Zürich");
    expect(text).toContain("Art. 25 DSG");
    expect(text).toContain(kovaliParty().email);
    expect(text).toContain("24 Monate");
    const electronic = buildContractDocument({ template: "einwilligung", data: { consentForm: "elektronisch" } }, samples.einwilligung.ctx);
    expect(electronic.blocks.some((b) => b.type === "signatures")).toBe(false);
  });

  it("requires a recipient and a mandate for the consent", () => {
    const t = getTemplate("einwilligung");
    expect(t?.validate?.({ recipients: null, mandateText: null }, { company: null, mandate: null })).toEqual({
      d_recipients: expect.any(String),
      d_mandateText: expect.any(String),
    });
    expect(t?.validate?.({ recipients: null, mandateText: null }, { company: 1, mandate: 2 })).toEqual({});
  });

  it("signs for KOVALI as owner of the sole proprietorship and with the title for a company", () => {
    const sole = { ...kovaliParty(), legalForm: "Einzelunternehmen", owner: "Max Muster", signatory: { name: "Max Muster", title: "Geschäftsführer" } };
    expect(kovaliSigners(sole)).toEqual([{ name: "Max Muster", role: "Inhaber" }]);
    const gmbh = { ...sole, legalForm: "Gesellschaft mit beschränkter Haftung (GmbH)" };
    expect(kovaliSigners(gmbh)).toEqual([{ name: "Max Muster", role: "Geschäftsführer" }]);
  });

  it("falls back to defaults for stored values that no longer validate", () => {
    const t = contractTemplates.rahmenvertrag;
    const data = parseStored(t.schema, t.defaults, { paymentDays: "viele", noticeMonths: 2 });
    expect(data.paymentDays).toBe(30);
    expect(data.noticeMonths).toBe(2);
  });

  it("suggests titles", () => {
    expect(suggestTitle("rahmenvertrag", { companyName: "Muster Consulting", data: {} })).toBe("Rahmenvertrag mit Muster Consulting");
    expect(suggestTitle("einzelauftrag", { companyName: "Muster Consulting", data: { role: "Test Manager" } })).toBe("Einzelauftrag Test Manager – Muster Consulting");
    expect(suggestTitle("subunternehmer", { companyName: "Beispiel Informatik", candidateName: "Anna Beispiel", data: {} })).toBe("Subunternehmervertrag Beispiel Informatik (Anna Beispiel)");
    expect(suggestTitle("einwilligung", { candidateName: "Anna Beispiel", mandateTitle: "SAP FI Consultant", data: {} })).toBe("Einwilligung Profilweitergabe Anna Beispiel – SAP FI Consultant");
  });
});
