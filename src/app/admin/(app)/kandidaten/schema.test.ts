import { describe, expect, it } from "vitest";
import { experienceField, languagesField, normalizeMonth, parseCandidateForm } from "./schema";

const minimal = { firstName: "Anna", lastName: "Beispiel", country: "Schweiz", engagement: "offen", status: "neu", source: "netzwerk" };

describe("repeatable sections (JSON in a hidden field)", () => {
  it("parses languages and drops rows left empty", () => {
    const json = JSON.stringify([
      { language: " Deutsch ", level: "muttersprache" },
      { language: "", level: "" },
      { language: "", level: "b2" },
    ]);
    expect(languagesField.parse(json)).toEqual([{ language: "Deutsch", level: "muttersprache" }]);
    expect(languagesField.parse("")).toEqual([]);
  });

  it("rejects unreadable JSON and invalid levels", () => {
    expect(languagesField.safeParse("[{").error?.issues[0]?.message).toBe("Die Einträge konnten nicht gelesen werden.");
    expect(languagesField.safeParse(JSON.stringify([{ language: "Englisch", level: "fliessend" }])).success).toBe(false);
  });

  it("normalises months and technologies of career entries", () => {
    const [entry] = experienceField.parse(
      JSON.stringify([{ role: "Business Analyst", client: "Grossbank, Zürich", from: "3.2021", to: "2024-1", technologies: ["s4hana", "Jira", "jira"] }]),
    );
    expect(entry).toEqual({
      role: "Business Analyst",
      client: "Grossbank, Zürich",
      industry: "",
      from: "2021-03",
      to: "2024-01",
      description: "",
      technologies: ["SAP S/4HANA", "Jira"],
    });
  });

  it("checks that a position ends after it started", () => {
    const result = experienceField.safeParse(JSON.stringify([{ role: "Tester", from: "2024-05", to: "2023-01" }]));
    expect(result.error?.issues[0]?.message).toBe("Das Ende liegt vor dem Beginn.");
  });

  it("accepts typed months from browsers without a month picker", () => {
    expect(normalizeMonth("03.2024")).toBe("2024-03");
    expect(normalizeMonth("3/2024")).toBe("2024-03");
    expect(normalizeMonth("2024-3")).toBe("2024-03");
    expect(normalizeMonth("März 2024")).toBe("März 2024");
  });
});

describe("candidate form", () => {
  it("accepts the minimal form and normalises skills", () => {
    const parsed = parseCandidateForm({ ...minimal, skills: JSON.stringify(["s4hana", "BPMN 2.0", "bpmn"]), disciplines: JSON.stringify(["sap"]) });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.skills).toEqual(["SAP S/4HANA", "BPMN"]);
      expect(parsed.data.disciplines).toEqual(["sap"]);
      expect(parsed.data.languages).toEqual([]);
      expect(parsed.data.retentionUntil).toBeNull();
    }
  });

  it("names the entry of a repeatable section in its error", () => {
    const parsed = parseCandidateForm({
      ...minimal,
      experience: JSON.stringify([
        { role: "Business Analyst", from: "2020-01" },
        { role: "", from: "2018-01", description: "ohne Rolle" },
      ]),
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok && parsed.state.status === "error") {
      expect(parsed.state.errors?.experience).toBe("Werdegang, Eintrag 2: Bitte die Rolle angeben.");
    }
  });

  it("requires names and the origin of the data", () => {
    const parsed = parseCandidateForm({ country: "Schweiz", engagement: "offen", status: "neu" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok && parsed.state.status === "error") {
      expect(Object.keys(parsed.state.errors ?? {})).toEqual(expect.arrayContaining(["firstName", "lastName", "source"]));
    }
  });

  it("checks workload range, rate unit and future consent", () => {
    const parsed = parseCandidateForm({ ...minimal, workloadMin: "100", workloadMax: "60", rateAmount: "120", rateUnit: "", consentAt: "2999-01-01" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok && parsed.state.status === "error") {
      expect(parsed.state.errors).toMatchObject({
        workloadMax: "Das maximale Pensum ist kleiner als das minimale.",
        rateUnit: "Bitte wählen: pro Stunde oder pro Tag.",
        consentAt: "Die Einwilligung kann nicht in der Zukunft liegen.",
      });
    }
  });
});
