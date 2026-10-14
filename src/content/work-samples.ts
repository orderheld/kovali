/**
 * Fiktive Beispiele, von Ferhat Demir freizugeben. Keine Kunden, Projekte, Branchen, Daten,
 * Kennzahlen, Orte oder echten Postleitzahlen.
 *
 * One invented case runs through all artefacts: an address change in a customer account,
 * from the requirement to the test result. IDs and results must stay consistent between
 * the story, the test run and the traceability table (TC-034 has not run yet).
 */

export type TestStatus = "pass" | "fail" | "open";
export type Priority = "Muss" | "Soll" | "Kann";

export interface Defect {
  id: string;
  text: string;
}

export interface UserStorySample {
  id: string;
  title: string;
  /** "Als {role} möchte ich {want}, damit {benefit}." */
  role: string;
  want: string;
  benefit: string;
  /** Gherkin lines; leading spaces are kept, the first word is highlighted as keyword. */
  criteria: readonly string[];
  links: readonly string[];
}

export interface TestRunSample {
  id: string;
  kind: string;
  cases: readonly { id: string; title: string; status: TestStatus }[];
  defect: Defect;
}

export type ProcessNode =
  | { type: "start"; label?: string }
  | { type: "end"; label?: string }
  | { type: "task"; label: string; links?: readonly { label: string; href: string }[] }
  /** `yes` labels the outgoing flow that the strip shows (e.g. "ja"). */
  | { type: "gateway"; label: string; yes?: string };

export interface ProcessSample {
  id: string;
  kind: string;
  /** Read by screen readers as the figure caption. */
  caption: string;
  nodes: readonly ProcessNode[];
}

export interface PrioritySample {
  id: string;
  caption: string;
  items: readonly { id: string; title: string; value: string; effort: string; priority: Priority }[];
}

export interface TraceSample {
  id: string;
  caption: string;
  rows: readonly {
    requirement: { id: string; title: string };
    test: { id: string; title: string };
    status: TestStatus;
  }[];
  defect: Defect;
}

const defect: Defect = {
  id: "DEF-07",
  text: "PLZ-Feld verlangt 5 Ziffern. Schweizer Postleitzahlen haben 4.",
};

export const userStory: UserStorySample = {
  id: "US-112",
  title: "Adresse im Kundenkonto ändern",
  role: "Kundin",
  want: "meine Adresse selbst ändern",
  benefit: "Rechnungen an die neue Adresse gehen",
  criteria: [
    "Szenario: Postleitzahl mit vier Ziffern",
    "  Angenommen die Kundin ist angemeldet",
    "  Wenn sie eine vierstellige Postleitzahl eingibt",
    "  Und die Änderung speichert",
    "  Dann wird die neue Adresse übernommen",
    "  Und die Änderung erscheint im Verlauf",
  ],
  links: ["REQ-014", "REQ-015", "TC-031", "TC-032"],
};

export const testRun: TestRunSample = {
  id: "Testlauf",
  kind: "Regression",
  cases: [
    { id: "TC-031", title: "Adresse speichern", status: "pass" },
    { id: "TC-032", title: "PLZ mit 4 Ziffern", status: "fail" },
    { id: "TC-033", title: "Verlauf aktualisiert", status: "pass" },
  ],
  defect,
};

export const addressProcess: ProcessSample = {
  id: "BPMN",
  kind: "Prozess Adressänderung",
  caption: "Prozess Adressänderung als BPMN-Ablauf",
  nodes: [
    { type: "start" },
    { type: "task", label: "Änderung erfassen" },
    { type: "gateway", label: "PLZ gültig?", yes: "ja" },
    { type: "task", label: "Adresse speichern" },
    { type: "end" },
  ],
};

export const priorities: PrioritySample = {
  id: "Priorisierung",
  caption: "Priorisierte Anforderungen nach Nutzen und Aufwand",
  items: [
    { id: "REQ-014", title: "Adresse ändern", value: "hoch", effort: "mittel", priority: "Muss" },
    { id: "REQ-016", title: "Änderungsverlauf anzeigen", value: "mittel", effort: "gering", priority: "Soll" },
    { id: "REQ-018", title: "Adresse per App ändern", value: "mittel", effort: "hoch", priority: "Kann" },
  ],
};

export const traceability: TraceSample = {
  id: "Rückverfolgbarkeit",
  caption: "Rückverfolgbarkeit von der Anforderung über den Testfall zum Ergebnis",
  rows: [
    { requirement: { id: "REQ-014", title: "Adresse ändern" }, test: { id: "TC-031", title: "Adresse speichern" }, status: "pass" },
    { requirement: { id: "REQ-015", title: "PLZ prüfen" }, test: { id: "TC-032", title: "PLZ mit 4 Ziffern" }, status: "fail" },
    { requirement: { id: "REQ-016", title: "Änderungs\u00ADverlauf" }, test: { id: "TC-033", title: "Verlauf aktualisiert" }, status: "pass" },
    {
      requirement: { id: "REQ-017", title: "Bestätigung per E-Mail" },
      test: { id: "TC-034", title: "Bestätigung versendet" },
      status: "open",
    },
  ],
  defect,
};

/** The three rows of "So sieht die Arbeit aus": KO · VA · LI, each with its artefact. */
export const workSamples = {
  title: "So sieht die Arbeit aus",
  text: "Der Name KOVALI steht für Konzeption, Value Analysis und Lösungsintegration. Was in jedem Schritt entsteht, zeigt ein einfaches, erfundenes Beispiel: eine Adressänderung im Kundenkonto, von der Anforderung bis zum Testergebnis.",
  steps: [
    {
      code: "KO",
      name: "Konzeption",
      text: "Den Ablauf festhalten, bevor jemand programmiert.",
      artifact: "process",
    },
    {
      code: "VA",
      name: "Value Analysis",
      text: "Entscheiden, was zuerst kommt, nach Nutzen und Aufwand.",
      artifact: "priority",
    },
    {
      code: "LI",
      name: "Lösungsintegration",
      text: "Prüfen, ob die Lösung tut, was die Anforderung verlangt. Jede Anforderung ist mit Testfall und Ergebnis verknüpft.",
      artifact: "trace",
    },
  ],
} as const;
