import { describe, expect, it } from "vitest";
import { renderHtml, renderText } from "@/lib/contact/email";
import { contactSchema, fieldErrors, storageCopy, storedService } from "@/lib/contact/schema";

const valid = {
  requestType: "contracting",
  services: ["business-analysis", "test-management"],
  projectDescription: "Business Analysis und Testmanagement für die Ablösung einer Fachapplikation.",
  start: "1-monat",
  duration: "6-12-monate",
  workload: "80-100",
  workMode: "hybrid",
  location: "",
  requirements: "IREB CPRE, Jira, Deutsch und Französisch",
  company: "Beispiel Consulting AG",
  name: "Anna Muster",
  email: "anna.muster@example.com",
  phone: "",
  message: "",
  consent: "on",
};

describe("contact form schema", () => {
  it("requires the company", () => {
    const result = contactSchema.safeParse({ ...valid, company: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).company).toBe("Bitte geben Sie den Namen Ihres Unternehmens an.");
  });

  it("accepts several services and derives the stored single value", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.services).toEqual(["business-analysis", "test-management"]);
      expect(result.data.service).toBe("mehrere");
      expect(result.data.duration).toBe("6-12-monate");
      expect(result.data.workload).toBe("80-100");
      expect(result.data.location).toBeUndefined();
    }
  });

  it("accepts a single checkbox value and no selection", () => {
    const one = contactSchema.parse({ ...valid, services: "test-engineering" });
    expect(one.services).toEqual(["test-engineering"]);
    expect(one.service).toBe("test-engineering");
    const none = contactSchema.parse({ ...valid, services: [] });
    expect(none.service).toBe("offen");
  });

  it("rejects unknown services, durations and workloads", () => {
    const result = contactSchema.safeParse({ ...valid, services: ["personalverleih"], duration: "x", workload: "120" });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["duration", "services", "workload"]);
  });

  it("derives the stored service value", () => {
    expect(storedService([])).toBe("offen");
    expect(storedService(["offen"])).toBe("offen");
    expect(storedService(["application-management"])).toBe("application-management");
    expect(storedService(["application-management", "offen"])).toBe("application-management");
    expect(storedService(["business-analysis", "test-engineering"])).toBe("mehrere");
  });
});

describe("stored copy (contact_requests, store.ts)", () => {
  it("keeps the store fields and puts the new fields at the top of the message", () => {
    const input = contactSchema.parse({ ...valid, message: "Bitte um Rückruf." });
    const stored = storageCopy(input);
    expect(stored.service).toBe("mehrere");
    expect(stored.company).toBe("Beispiel Consulting AG");
    expect(stored.projectDescription).toBe(input.projectDescription);
    expect(stored.message).toBe(
      "Leistungen: Business Analysis & Requirements Engineering, Testmanagement\nLaufzeit: 6 bis 12 Monate\nPensum: 80 bis 100\u00a0%\n\nVoraussetzungen:\nIREB CPRE, Jira, Deutsch und Französisch\n\nNachricht:\nBitte um Rückruf.",
    );
  });

  it("leaves the message alone when there is nothing to add", () => {
    const input = contactSchema.parse({ ...valid, services: ["test-engineering"], duration: "", workload: "", requirements: "", message: "Hallo" });
    expect(storageCopy(input)).toBe(input);
  });
});

describe("contact e-mail", () => {
  it("lists every selected service and the new fields", () => {
    const input = contactSchema.parse(valid);
    const text = renderText(input, "KOV-20261014-TEST");
    expect(text).toContain("Leistungen: Business Analysis & Requirements Engineering, Testmanagement");
    expect(text).toContain("Unternehmen: Beispiel Consulting AG");
    expect(text).toContain("Laufzeit: 6 bis 12 Monate");
    expect(text).toContain("Pensum: 80 bis 100 %");
    expect(text).toContain("Voraussetzungen:\nIREB CPRE, Jira, Deutsch und Französisch");
    const html = renderHtml(input, "KOV-20261014-TEST");
    expect(html).toContain("Business Analysis &amp; Requirements Engineering, Testmanagement");
    expect(html).toContain("Voraussetzungen");
  });
});
