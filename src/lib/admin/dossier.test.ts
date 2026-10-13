import { describe, expect, it } from "vitest";
import {
  availabilityText,
  buildDossier,
  CONDITIONS_ON_REQUEST,
  DRAFT_NOTICE,
  dossierFileName,
  dossierHref,
  dossierPeriod,
  formatWorkload,
  makeScrubber,
  sortExperience,
  type DossierCandidate,
} from "./dossier";
import { kovaliParty } from "./party";
import { inlineText, type Block, type DocModel } from "./render/model";
import { renderPdf } from "./render/pdf";

const TODAY = "2026-10-13";

/** Fictional sample candidate with every personal field filled. */
const anna: DossierCandidate & { notes: string; rating: number; salaryExpectation: number; rateAmount: number; rateUnit: string } = {
  id: 42,
  firstName: "Anna",
  lastName: "Beispiel",
  email: "anna.beispiel@example.org",
  phone: "+41 79 555 12 34",
  dateOfBirth: "1986-04-09",
  street: "Musterweg 12",
  postalCode: "3000",
  city: "Bern",
  nationality: "Deutschland",
  workPermit: "c",
  headline: "Senior Business Analyst Zahlungsverkehr",
  summary:
    "Anna Beispiel analysiert seit 12 Jahren Anforderungen im Banking. Annas Schwerpunkt ist ISO 20022. Erreichbar unter anna.beispiel@example.org oder 079 555 12 34, Musterweg 12.",
  disciplines: ["business-analysis", "requirements-engineering"],
  skills: ["Business Analysis", "BPMN", "Zahlungsverkehr"],
  sapModules: ["SAP FI"],
  certifications: ["IREB CPRE Foundation Level"],
  languages: [
    { language: "Deutsch", level: "muttersprache" },
    { language: "Englisch", level: "c1" },
  ],
  education: [{ title: "MSc Wirtschaftsinformatik", institution: "Hochschule Muster", year: "2012" }],
  experience: [
    { role: "Business Analyst", client: "Kantonalbank, Bern", industry: "Banking", from: "2014-01", to: "2019-12", description: "Anforderungen für das E-Banking.", technologies: ["Jira"] },
    { role: "Senior Business Analyst", client: "Grossbank, Zürich", industry: "Banking", from: "2020-01", to: "", description: "Migration auf ISO 20022, mit Anna Beispiel als Lead.", technologies: ["BPMN", "Confluence"] },
  ],
  seniority: "senior",
  availableFrom: "2026-12-01",
  workloadMin: 80,
  workloadMax: 100,
  remote: "hybrid",
  regions: "Bern, Zürich",
  // Internal fields that must never reach a firm.
  notes: "Vertraulich: will mehr Lohn, Kündigung läuft.",
  rating: 4,
  salaryExpectation: 145000,
  rateAmount: 98.5,
  rateUnit: "stunde",
};

/** Every visible string of a DocModel, as a firm would read it. */
function blockText(b: Block): string[] {
  switch (b.type) {
    case "title":
      return [b.text, b.subtitle ?? ""];
    case "heading":
      return [b.text];
    case "paragraph":
      return [inlineText(b.text)];
    case "list":
      return b.items.map(inlineText);
    case "facts":
      return b.rows.flatMap((r) => [r.label, inlineText(r.value)]);
    case "table":
      return [...b.columns.map((c) => c.label), ...b.rows.flat().map(inlineText)];
    case "parties":
      return b.parties.flatMap((p) => [p.role, ...p.lines]);
    case "signatures":
      return b.parties.flatMap((p) => [p.party, ...p.signers.flatMap((s) => [s.name ?? "", s.role ?? ""])]);
    case "tags":
      return b.items;
    case "box":
      return [b.title ?? "", inlineText(b.text)];
    case "timeline":
      return [b.period, b.title, b.subtitle ?? "", b.text ?? "", ...(b.tags ?? [])];
    default:
      return [];
  }
}

function docText(doc: DocModel): string {
  return [doc.docType, doc.title, doc.reference ?? "", doc.footer, ...doc.blocks.flatMap(blockText)].join("\n");
}

function factsOf(doc: DocModel): Record<string, string> {
  const facts = doc.blocks.find((b) => b.type === "facts");
  return facts?.type === "facts" ? Object.fromEntries(facts.rows.map((r) => [r.label, inlineText(r.value)])) : {};
}

const forbiddenEverywhere = [
  "anna.beispiel@example.org",
  "79 555 12 34",
  "555 12 34",
  "Musterweg",
  "1986-04-09",
  "09.04.1986",
  // internal fields
  "Vertraulich: will mehr Lohn",
  "145",
  "98.50",
  "★",
];

describe("anonymised dossier", () => {
  const doc = buildDossier(anna, { variant: "anonym", today: TODAY });
  const text = docText(doc);

  it("contains no name, contact data, birth date, street, city or nationality", () => {
    for (const s of [...forbiddenEverywhere, "Anna", "Beispiel", "3000", "Deutschland", "Niederlassung"]) {
      expect(text, s).not.toContain(s);
    }
    // The city appears only as part of a client as stored ("Kantonalbank, Bern"), never as residence.
    expect(Object.keys(factsOf(doc))).not.toContain("Wohnort");
    expect(text.toLowerCase()).not.toContain("anna");
  });

  it("uses the profile number instead of the name", () => {
    expect(doc.blocks.find((b) => b.type === "title")).toMatchObject({ text: "Profil K-0042", subtitle: "Senior Business Analyst Zahlungsverkehr" });
    expect(doc.title).toBe("Kandidatenprofil K-0042");
    expect(doc.reference).toBe("K-0042");
    expect(text).toContain("K-0042 analysiert seit 12 Jahren");
    expect(doc.docType).toBe("Kandidatenprofil");
    expect(doc.confidential).toBe(true);
  });

  it("shows the facts a firm needs", () => {
    expect(factsOf(doc)).toEqual({
      Schwerpunkte: "Business Analysis, Requirements Engineering",
      Seniorität: "Senior",
      "Verfügbar ab": "01.12.2026",
      Pensum: "80–100 %",
      "Einsatzort / Remote": "Hybrid",
      Region: "Bern, Zürich",
      Sprachen: "Deutsch (Muttersprache), Englisch (C1 – fliessend)",
    });
  });

  it("lists skills, SAP modules, career newest first, education and certificates", () => {
    const tags = doc.blocks.filter((b) => b.type === "tags").map((b) => (b.type === "tags" ? b.items : []));
    expect(tags).toEqual([["Business Analysis", "BPMN", "Zahlungsverkehr"], ["SAP FI"]]);
    const timeline = doc.blocks.filter((b) => b.type === "timeline");
    expect(timeline[0]).toMatchObject({ title: "Senior Business Analyst", subtitle: "Grossbank, Zürich · Banking", period: "01.2020 – heute" });
    expect(timeline[1]).toMatchObject({ title: "Business Analyst", period: "01.2014 – 12.2019" });
    expect(timeline[2]).toMatchObject({ title: "MSc Wirtschaftsinformatik", subtitle: "Hochschule Muster", period: "2012" });
    expect(text).toContain("IREB CPRE Foundation Level");
  });

  it("offers conditions on request without a proposal and never shows the candidate's own rate", () => {
    expect(text).toContain(CONDITIONS_ON_REQUEST);
    expect(text).not.toContain("CHF");
  });

  it("ends with the confidentiality footer", () => {
    expect(doc.footer).toBe(`Vertraulich. Vorgestellt durch KOVALI (${kovaliParty().name}). Weitergabe an Dritte nur mit Zustimmung von KOVALI.`);
  });

  it("has no draft notice without a mandate", () => {
    expect(text).not.toContain(DRAFT_NOTICE);
  });
});

describe("own firm", () => {
  const firm = { name: "Muster Analytics GmbH" };
  it("names the firm only in the named variant", () => {
    const anon = buildDossier(anna, { variant: "anonym", company: firm, today: TODAY });
    expect(factsOf(anon)["Einsatz über"]).toBe("eigene Firma (Subunternehmen)");
    expect(docText(anon)).toContain("Einsatz über\neigene Firma (Subunternehmen)");
    expect(docText(anon)).not.toContain("Muster Analytics");
    const named = buildDossier(anna, { variant: "namentlich", company: firm, today: TODAY });
    expect(factsOf(named)["Einsatz über"]).toBe("Muster Analytics GmbH");
  });

  it("leaves the line out without a firm", () => {
    expect(factsOf(buildDossier(anna, { variant: "anonym", today: TODAY }))).not.toHaveProperty("Einsatz über");
  });
});

describe("named dossier", () => {
  const doc = buildDossier(anna, { variant: "namentlich", today: TODAY });
  const text = docText(doc);

  it("shows name, city, work permit and nationality", () => {
    expect(doc.blocks.find((b) => b.type === "title")).toMatchObject({ text: "Anna Beispiel" });
    expect(factsOf(doc)).toMatchObject({ Wohnort: "Bern", Arbeitsbewilligung: "Niederlassung C", Nationalität: "Deutschland" });
    expect(doc.title).toBe("Kandidatenprofil Anna Beispiel (K-0042)");
  });

  it("never shows e-mail, phone, street, birth date or internal fields", () => {
    for (const s of forbiddenEverywhere) expect(text, s).not.toContain(s);
    expect(text).toContain("[entfernt]");
  });
});

describe("dossier for a mandate", () => {
  const mandate = { id: 7, title: "Business Analyst ISO 20022", reference: "GHR-4711" };
  const firm = { name: "Muster Analytics GmbH" };

  it("warns prominently while the consent for the mandate is missing", () => {
    for (const submission of [null, { consentAt: null, rateSell: 135, rateUnit: "stunde" }]) {
      const doc = buildDossier(anna, { variant: "anonym", mandate, submission, company: firm, today: TODAY });
      const first = doc.blocks[0];
      expect(first.type).toBe("box");
      expect(first.type === "box" && inlineText(first.text)).toBe(`Entwurf: ${DRAFT_NOTICE}`);
      expect(DRAFT_NOTICE).toBe("Einwilligung der Kandidatin/des Kandidaten für dieses Mandat fehlt. Nicht weitergeben.");
      expect(doc.reference).toBe("K-0042 · M-0007 · Entwurf");
    }
  });

  it("carries mandate number, client reference and the selling rate once consent is given", () => {
    const doc = buildDossier(anna, {
      variant: "anonym",
      mandate,
      submission: { consentAt: new Date("2026-10-10T08:00:00Z"), rateSell: 135, rateUnit: "stunde" },
      company: firm,
      today: TODAY,
    });
    const text = docText(doc);
    expect(doc.blocks[0].type).toBe("title");
    expect(text).not.toContain(DRAFT_NOTICE);
    expect(doc.reference).toBe("K-0042 · M-0007");
    expect(doc.title).toBe("Kandidatenprofil K-0042 – M-0007");
    expect(factsOf(doc).Mandat).toBe("Business Analyst ISO 20022 (Ihre Referenz: GHR-4711)");
    expect(text).toContain("CHF 135.00 pro Stunde, zzgl. MWST falls anwendbar");
    expect(text).not.toContain("98.50");
  });

  it("stays a draft while no own firm is linked, even with consent", () => {
    const doc = buildDossier(anna, { variant: "anonym", mandate, submission: { consentAt: new Date(), rateSell: 135, rateUnit: "tag" }, today: TODAY });
    const first = doc.blocks[0];
    expect(first.type === "box" && inlineText(first.text)).toBe("Entwurf: Keine eigene Firma (Subunternehmen) erfasst. Nicht weitergeben.");
    const both = buildDossier(anna, { variant: "anonym", mandate, submission: null, today: TODAY }).blocks[0];
    expect(both.type === "box" && inlineText(both.text)).toBe(
      "Entwurf: Einwilligung der Kandidatin/des Kandidaten für dieses Mandat fehlt. Keine eigene Firma (Subunternehmen) erfasst. Nicht weitergeben.",
    );
  });

  it("keeps conditions on request when the proposal has no selling rate", () => {
    const doc = buildDossier(anna, { variant: "anonym", mandate, submission: { consentAt: new Date(), rateSell: null, rateUnit: null }, today: TODAY });
    expect(docText(doc)).toContain(CONDITIONS_ON_REQUEST);
  });
});

describe("dossier helpers", () => {
  it("scrubs contact data in every spelling and names only when anonymised", () => {
    const anon = makeScrubber(anna, "anonym");
    expect(anon("Tel. 0041 79 555 12 34, 079/555'12'34, +41795551234")).toBe("Tel. [entfernt], [entfernt], [entfernt]");
    expect(anon("Kontakt: ANNA.BEISPIEL@example.org")).toBe("Kontakt: [entfernt]");
    expect(anon("Beispiel, Anna leitete das Team")).toBe("K-0042 leitete das Team");
    expect(anon("Annahme und Beispielrechnung")).toBe("Annahme und Beispielrechnung");
    const named = makeScrubber(anna, "namentlich");
    expect(named("Anna Beispiel, geboren am 9.4.1986")).toBe("Anna Beispiel, geboren am [entfernt]");
  });

  it("formats workload and availability", () => {
    expect(formatWorkload(80, 100)).toBe("80–100 %");
    expect(formatWorkload(100, 100)).toBe("100 %");
    expect(formatWorkload(60, null)).toBe("ab 60 %");
    expect(formatWorkload(null, null)).toBeNull();
    expect(availabilityText("2026-10-01", TODAY)).toBe("sofort");
    expect(availabilityText("2026-11-01", TODAY)).toBe("01.11.2026");
    expect(availabilityText(null, TODAY)).toBeNull();
    // Compact periods: they must fit the narrow PDF timeline column.
    expect(dossierPeriod("2014-09", "2019-09")).toBe("09.2014 – 09.2019");
    expect(dossierPeriod("2020-01", "")).toBe("01.2020 – heute");
    expect(dossierPeriod(null, null)).toBe("heute");
    expect(factsOf(buildDossier({ ...anna, availableFrom: null, workloadMin: null, workloadMax: null }, { variant: "anonym", today: TODAY }))).toMatchObject({
      "Verfügbar ab": "nach Absprache",
      Pensum: "nach Absprache",
    });
  });

  it("sorts current positions first", () => {
    const sorted = sortExperience([
      { from: "2010-01", to: "2012-06" },
      { from: "2018-03", to: "" },
      { from: "2013-01", to: "2018-02" },
    ]);
    expect(sorted.map((e) => e.from)).toEqual(["2018-03", "2013-01", "2010-01"]);
  });

  it("builds file names and download links", () => {
    expect(dossierFileName(anna, { variant: "anonym", mandate: { id: 7, title: "", reference: null } }, "pdf")).toBe("Kandidatenprofil_K-0042_anonym_M-0007.pdf");
    expect(dossierFileName(anna, { variant: "namentlich" }, "docx")).toBe("Kandidatenprofil_K-0042_Beispiel_Anna.docx");
    expect(dossierHref(42)).toBe("/admin/api/kandidaten/42/dossier?format=pdf&variante=anonym");
    expect(dossierHref(42, { format: "docx", variant: "namentlich", mandateId: 7 })).toBe("/admin/api/kandidaten/42/dossier?format=docx&variante=namentlich&mandat=7");
  });

  it("survives malformed JSON columns", () => {
    const broken = { ...anna, languages: null, education: "x", experience: [{ role: "" }, null] } as unknown as DossierCandidate;
    expect(() => buildDossier(broken, { variant: "anonym", today: TODAY })).not.toThrow();
  });
});

describe("rendered anonymised dossier", () => {
  it("has no name in the PDF text either", async () => {
    const pdf = await renderPdf(buildDossier(anna, { variant: "anonym", today: TODAY }));
    const { extractText, getDocumentProxy } = await import("unpdf");
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdf)), { mergePages: true });
    expect(text).toContain("K-0042");
    expect(text).not.toMatch(/Anna|Beispiel|example\.org|Musterweg/);
  }, 30_000);
});
