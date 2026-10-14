import { describe, expect, it } from "vitest";
import {
  applyValues,
  cardSection,
  cardValues,
  currentValues,
  diffSection,
  firmFromSource,
  mergeCard,
  normalizeMonth,
  parseSection,
  sameValues,
  type ProfileSource,
  type SectionValues,
} from "./profile";
import { rateExample, vacancyTitle, vacancyVisible } from "./vacancy-rules";

const source: ProfileSource = {
  headline: "Business Analyst",
  summary: "Zehn Jahre Banking.",
  disciplines: ["business-analysis"],
  skills: ["BPMN", "Jira"],
  sapModules: [],
  certifications: ["IREB CPRE"],
  experience: [
    { role: "Business Analyst", client: "Grossbank, Zürich", industry: "Banking", from: "2020-01", to: "", description: "Anforderungen", technologies: ["Jira"] },
  ],
  education: [{ title: "BSc Wirtschaftsinformatik", institution: "FHNW", year: "2014" }],
  languages: [{ language: "Deutsch", level: "muttersprache" }],
  availableFrom: "2026-11-01",
  workloadMin: 80,
  workloadMax: 100,
  rateAmount: 120,
  rateUnit: "stunde",
  remote: "hybrid",
  regions: "Bern, Solothurn",
  noticePeriod: "1 Monat",
  firm: null,
};

describe("change request payloads", () => {
  it("validates and normalises each section", () => {
    const k = parseSection("kompetenzen", { disciplines: '["sap","business-analysis"]', skills: '["s4hana","jira","Jira"]', sapModules: "fi, co", certifications: "[]" });
    expect(k.ok).toBe(true);
    if (k.ok) {
      expect(k.data.skills).toEqual(["SAP S/4HANA", "Jira"]);
      expect(k.data.sapModules).toEqual(["SAP FI", "SAP CO"]);
    }
    expect(parseSection("kompetenzen", { disciplines: '["hellsehen"]' }).ok).toBe(false);
  });

  it("checks experience entries and names the faulty entry", () => {
    const ok = parseSection("werdegang", {
      experience: JSON.stringify([
        { role: "Test Manager", client: "Versicherung", from: "03.2018", to: "12.2019", technologies: ["Xray"] },
        { role: "Business Analyst", client: "Bank", from: "2020-01", to: "" },
      ]),
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      // Current assignment first; months normalised; missing fields filled.
      expect(ok.data.experience[0]).toMatchObject({ role: "Business Analyst", from: "2020-01", to: "", industry: "", description: "", technologies: [] });
      expect(ok.data.experience[1]).toMatchObject({ from: "2018-03", to: "2019-12" });
    }
    const bad = parseSection("werdegang", { experience: [{ role: "PL", from: "2020-01" }, { role: "", from: "2021-01" }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.experience).toBe("Eintrag 2: Bitte die Funktion oder Rolle angeben.");
    const order = parseSection("werdegang", { experience: [{ role: "PL", from: "2021-05", to: "2020-01" }] });
    expect(order.ok).toBe(false);
    expect(parseSection("werdegang", { experience: "kein json" }).ok).toBe(false);
    expect(parseSection("werdegang", { experience: Array.from({ length: 41 }, () => ({ role: "x", from: "2020-01" })) }).ok).toBe(false);
  });

  it("validates availability, workload range and rate unit", () => {
    const bad = parseSection("verfuegbarkeit", { workloadMin: "100", workloadMax: "60", rateAmount: "120", rateUnit: "" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.workloadMax).toMatch(/maximale Pensum/);
      expect(bad.errors.rateUnit).toMatch(/pro Stunde oder pro Tag/);
    }
    const ok = parseSection("verfuegbarkeit", { availableFrom: "2026-12-01", workloadMin: "60", workloadMax: "80", rateAmount: "1'150.50", rateUnit: "tag", remote: "remote" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data).toMatchObject({ rateAmount: 1150.5, rateUnit: "tag", workloadMin: 60, firm: null });
    expect(parseSection("verfuegbarkeit", { remote: "mond" }).ok).toBe(false);
    expect(parseSection("sprachen", { languages: [{ language: "Deutsch", level: "c1" }, { language: "deutsch", level: "b1" }] }).ok).toBe(false);
  });

  it("validates the firm (GmbH or AG with UID) with field-level errors", () => {
    const firm = { name: "Muster Consulting GmbH", legalForm: "GmbH", uid: "che 123 456 789", street: "Hauptstrasse 1", postalCode: "4500", city: "Solothurn", country: "" };
    const ok = parseSection("verfuegbarkeit", { firm });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.firm).toMatchObject({ uid: "CHE-123.456.789", country: "Schweiz" });
    const bad = parseSection("verfuegbarkeit", { firm: { ...firm, legalForm: "Einzelunternehmen", uid: "123" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors["firm.legalForm"]).toMatch(/GmbH oder AG/);
      expect(bad.errors["firm.uid"]).toMatch(/CHE-123/);
    }
    expect(firmFromSource({ name: "X AG", legalForm: "Aktiengesellschaft", uid: "CHE-111.222.333", street: "A 1", postalCode: "3000", city: "Bern", country: "Schweiz" })).toMatchObject({ legalForm: "AG" });
  });

  it("recognises a proposal equal to the confirmed values", () => {
    const parsed = parseSection("profil", { headline: " Business Analyst ", summary: "Zehn Jahre Banking." });
    expect(parsed.ok && sameValues(currentValues("profil", source), parsed.data)).toBe(true);
    const changed = parseSection("profil", { headline: "Senior Business Analyst", summary: "Zehn Jahre Banking." });
    expect(changed.ok && sameValues(currentValues("profil", source), changed.data)).toBe(false);
    expect(sameValues({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
  });

  it("applies only the section's own columns", () => {
    const payload = { headline: "Neu", summary: null, notes: "darf nicht durch", status: "aktiv" } as unknown as SectionValues["profil"];
    expect(applyValues("profil", payload)).toEqual({ headline: "Neu", summary: null });
    const k = applyValues("kompetenzen", { disciplines: ["sap"], skills: ["s/4 hana", "SAP S/4HANA"], sapModules: ["mm"], certifications: ["A", "a"] });
    expect(k).toEqual({ disciplines: ["sap"], skills: ["SAP S/4HANA"], sapModules: ["SAP MM"], certifications: ["A"] });
    const v = parseSection("verfuegbarkeit", { workloadMin: "50", firm: { name: "F GmbH", legalForm: "GmbH", uid: "CHE-123.456.789", street: "A 1", postalCode: "1000", city: "Lausanne" } });
    expect(v.ok).toBe(true);
    // The firm goes to the company record, not to a candidate column.
    if (v.ok) expect(applyValues("verfuegbarkeit", v.data)).not.toHaveProperty("firm");
  });

  it("lets the firm card and the availability card share one request", () => {
    expect(cardSection("firma")).toBe("verfuegbarkeit");
    const base = currentValues("verfuegbarkeit", source) as Record<string, unknown>;
    const firm = { name: "F AG", legalForm: "AG", uid: "CHE-123.456.789", street: "A 1", postalCode: "1000", city: "Lausanne", country: "Schweiz" };
    const merged = mergeCard("firma", base, { firm });
    expect(merged).toMatchObject({ workloadMin: 80, rateAmount: 120, firm });
    expect(cardValues("verfuegbarkeit", merged)).not.toHaveProperty("firm");
    expect(cardValues("firma", merged)).toEqual({ firm });
    const back = mergeCard("firma", merged, base);
    expect(sameValues(back, base)).toBe(true);
  });

  it("describes changes readably for the review", () => {
    const before = currentValues("werdegang", source);
    const after = parseSection("werdegang", {
      experience: [
        { ...source.experience[0], description: "Anforderungen und Tests" },
        { role: "Test Analyst", client: "Versicherung", from: "2017-01", to: "2019-12" },
      ],
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    const diff = diffSection("werdegang", before, after.data);
    expect(diff).toHaveLength(2);
    expect(diff[0]).toMatchObject({ type: "entry", change: "changed", title: "Business Analyst", fields: [{ label: "Beschreibung", before: "Anforderungen", after: "Anforderungen und Tests" }] });
    expect(diff[1]).toMatchObject({ type: "entry", change: "added", title: "Test Analyst" });

    const skills = diffSection("kompetenzen", currentValues("kompetenzen", source), { ...currentValues("kompetenzen", source), skills: ["BPMN", "Confluence"] });
    expect(skills).toEqual([{ type: "list", label: "Kompetenzen und Tools", added: ["Confluence"], removed: ["Jira"] }]);

    const removedLang = diffSection("sprachen", currentValues("sprachen", source), { languages: [] });
    expect(removedLang[0]).toMatchObject({ change: "removed", title: "Deutsch" });

    const avail = diffSection("verfuegbarkeit", currentValues("verfuegbarkeit", source), { ...currentValues("verfuegbarkeit", source), workloadMax: 90, rateAmount: 130 });
    expect(avail).toEqual([
      { type: "field", label: "Pensum", before: "80–100 %", after: "80–90 %" },
      { type: "field", label: "Satzvorstellung", before: "CHF 120.00 pro Stunde", after: "CHF 130.00 pro Stunde" },
    ]);
  });

  it("normalises month input", () => {
    expect(normalizeMonth("3.2021")).toBe("2021-03");
    expect(normalizeMonth("03/2021")).toBe("2021-03");
    expect(normalizeMonth("2021-3")).toBe("2021-03");
    expect(normalizeMonth("März 2021")).toBe("März 2021");
  });
});

describe("vacancy visibility", () => {
  const open = { portalVisibility: "alle", status: "neu", closedAt: null };

  it("shows vacancies for all to candidates still in the pool", () => {
    for (const status of ["neu", "aktiv", "im_einsatz", "nicht_verfuegbar"]) expect(vacancyVisible(open, status, false)).toBe(true);
    expect(vacancyVisible(open, "archiviert", false)).toBe(false);
  });

  it("shows selected vacancies only to people they were shared with", () => {
    const selected = { ...open, portalVisibility: "ausgewaehlt" };
    expect(vacancyVisible(selected, "aktiv", false)).toBe(false);
    expect(vacancyVisible(selected, "aktiv", true)).toBe(true);
    expect(vacancyVisible(selected, "archiviert", true)).toBe(true);
  });

  it("hides vacancies not in the portal and closed mandates", () => {
    expect(vacancyVisible({ ...open, portalVisibility: "keine" }, "aktiv", true)).toBe(false);
    expect(vacancyVisible({ ...open, closedAt: new Date() }, "aktiv", true)).toBe(false);
    for (const status of ["gewonnen", "verloren", "zurueckgezogen", "pausiert"]) expect(vacancyVisible({ ...open, status }, "aktiv", true)).toBe(false);
    for (const status of ["in_bearbeitung", "angeboten", "interview"]) expect(vacancyVisible({ ...open, status }, "aktiv", false)).toBe(true);
  });

  it("never falls back to the internal title", () => {
    expect(vacancyTitle({ id: 7, portalTitle: null })).toBe("Projektmandat M-0007");
    expect(vacancyTitle({ id: 7, portalTitle: " SAP FI Consultant " })).toBe("SAP FI Consultant");
  });
});

describe("rate example", () => {
  it("multiplies hourly rate and hours for a month at 100 %", () => {
    const ex = rateExample(110, "stunde", null);
    expect(ex?.text).toBe(
      "Beispiel bei 100 %: 21 Arbeitstage × 8.4 h = 176.4 h × CHF 110.00 = CHF 19’404.00 pro Monat, die Ihre Firma KOVALI in Rechnung stellt (exkl. MWST)",
    );
    expect(ex?.amount).toBe(19404);
  });

  it("uses the vacancy's workload and daily rates", () => {
    expect(rateExample(110, "stunde", 80)?.text).toBe(
      "Beispiel bei 80 %: 16.8 Arbeitstage × 8.4 h = 141.1 h × CHF 110.00 = CHF 15’521.00 pro Monat, die Ihre Firma KOVALI in Rechnung stellt (exkl. MWST)",
    );
    const day = rateExample(924, "tag", 100);
    expect(day?.text).toBe("Beispiel bei 100 %: 21 Arbeitstage × CHF 924.00 = CHF 19’404.00 pro Monat, die Ihre Firma KOVALI in Rechnung stellt (exkl. MWST)");
    expect(day?.hourly).toBeCloseTo(110);
    expect(rateExample(null, "stunde")).toBeNull();
    expect(rateExample(0, "stunde")).toBeNull();
  });
});
