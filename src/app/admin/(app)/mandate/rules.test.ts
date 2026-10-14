import { describe, expect, it } from "vitest";
import { monthlyExample } from "@/lib/admin/rates";
import {
  confidentialMentions,
  consentTimestamp,
  CONSENT_MISSING,
  CONSENT_WITHDRAWN,
  consentNoteText,
  deadlineUrgency,
  defaultSubmissionRates,
  formatRate,
  groupCounts,
  groupStatuses,
  isWithdrawn,
  marginInfo,
  monthlyExampleText,
  nextClosedAt,
  parseAmountInput,
  parseGroup,
  RECIPIENT_MISSING,
  renewedConsentError,
  submissionStatusChange,
  suggestedShareIds,
  topMatches,
  urgencyTone,
  withdrawalIsoDate,
  withdrawalNoteText,
} from "./rules";

const now = new Date("2026-10-13T08:30:00Z");
const today = "2026-10-13";

describe("list groups", () => {
  it("defaults to the open mandates", () => {
    expect(parseGroup(undefined)).toBe("offen");
    expect(parseGroup("unbekannt")).toBe("offen");
    expect(parseGroup("abgeschlossen")).toBe("abgeschlossen");
  });

  it("maps groups to statuses", () => {
    expect(groupStatuses("offen")).toEqual(["neu", "in_bearbeitung", "angeboten", "interview"]);
    expect(groupStatuses("abgeschlossen")).toEqual(["verloren", "zurueckgezogen", "pausiert"]);
    expect(groupStatuses("alle")).toBeNull();
  });

  it("counts every status once per group", () => {
    const counts = groupCounts({ neu: 2, interview: 1, gewonnen: 3, pausiert: 1, verloren: 2 });
    expect(counts).toEqual({ offen: 3, gewonnen: 3, abgeschlossen: 3, alle: 9 });
  });
});

describe("closed_at", () => {
  const earlier = new Date("2026-09-01T10:00:00Z");

  it("is set when a mandate is decided", () => {
    expect(nextClosedAt({ status: "interview", closedAt: null }, "gewonnen", now)).toBe(now);
    expect(nextClosedAt({ status: "neu", closedAt: null }, "zurueckgezogen", now)).toBe(now);
  });

  it("keeps the first date between closed statuses", () => {
    expect(nextClosedAt({ status: "verloren", closedAt: earlier }, "gewonnen", now)).toBe(earlier);
  });

  it("is cleared when the mandate reopens or pauses", () => {
    expect(nextClosedAt({ status: "verloren", closedAt: earlier }, "in_bearbeitung", now)).toBeNull();
    expect(nextClosedAt({ status: "gewonnen", closedAt: earlier }, "pausiert", now)).toBeNull();
  });
});

describe("deadline urgency", () => {
  it("marks overdue deadlines red", () => {
    const u = deadlineUrgency("2026-10-12", today);
    expect(u).toMatchObject({ level: "overdue", days: -1, label: "1 Tag überfällig" });
    expect(urgencyTone(u)).toBe("red");
    expect(deadlineUrgency("2026-10-08", today)?.label).toBe("5 Tage überfällig");
  });

  it("marks the next three days amber", () => {
    expect(deadlineUrgency("2026-10-13", today)).toMatchObject({ level: "soon", label: "heute" });
    expect(deadlineUrgency("2026-10-14", today)?.label).toBe("morgen");
    const in3 = deadlineUrgency("2026-10-16", today);
    expect(in3).toMatchObject({ level: "soon", days: 3, label: "in 3 Tagen" });
    expect(urgencyTone(in3)).toBe("amber");
  });

  it("leaves later deadlines and closed mandates alone", () => {
    const later = deadlineUrgency("2026-10-17", today);
    expect(later).toMatchObject({ level: "later", label: null });
    expect(urgencyTone(later)).toBeNull();
    expect(deadlineUrgency("2026-10-01", today, false)).toBeNull();
    expect(deadlineUrgency(null, today)).toBeNull();
  });

  it("counts calendar days across the change to winter time", () => {
    expect(deadlineUrgency("2026-10-26", "2026-10-24")?.days).toBe(2);
  });
});

describe("submission status changes", () => {
  const consent = new Date("2026-10-10T09:00:00Z");

  it("needs consent before the profile is proposed", () => {
    expect(submissionStatusChange({ consentAt: null, submittedAt: null }, "vorgeschlagen", now)).toEqual({ ok: false, error: CONSENT_MISSING });
    expect(submissionStatusChange({ consentAt: null, submittedAt: null }, "interview", now).ok).toBe(false);
  });

  it("records the submission date once", () => {
    expect(submissionStatusChange({ consentAt: consent, submittedAt: null }, "vorgeschlagen", now)).toEqual({ ok: true, submittedAt: now });
    const first = new Date("2026-10-11T09:00:00Z");
    expect(submissionStatusChange({ consentAt: consent, submittedAt: first }, "interview", now)).toEqual({ ok: true, submittedAt: first });
    expect(submissionStatusChange({ consentAt: consent, submittedAt: first }, "absage", now)).toEqual({ ok: true, submittedAt: first });
  });

  it("needs a recipient company for the first hand-over", () => {
    expect(submissionStatusChange({ consentAt: consent, submittedAt: null, recipientCompanyId: null }, "vorgeschlagen", now)).toEqual({
      ok: false,
      error: RECIPIENT_MISSING,
    });
    expect(submissionStatusChange({ consentAt: consent, submittedAt: null, recipientCompanyId: 4 }, "vorgeschlagen", now).ok).toBe(true);
  });

  it("allows internal statuses without consent", () => {
    expect(submissionStatusChange({ consentAt: null, submittedAt: null }, "einwilligung_offen", now)).toEqual({ ok: true, submittedAt: null });
    expect(submissionStatusChange({ consentAt: null, submittedAt: null }, "absage", now)).toEqual({ ok: true, submittedAt: null });
  });

  it("blocks every new hand-over after a withdrawal until consent is recorded again", () => {
    const withdrawn = withdrawalNoteText("14.10.2026", "e_mail", "Möchte nicht mehr vorgeschlagen werden");
    expect(withdrawn).toBe("Widerruf am 14.10.2026 (E-Mail): Möchte nicht mehr vorgeschlagen werden");
    expect(isWithdrawn(withdrawn)).toBe(true);
    const first = new Date("2026-10-11T09:00:00Z");
    expect(submissionStatusChange({ consentAt: null, consentNote: withdrawn, submittedAt: null }, "vorgeschlagen", now)).toEqual({
      ok: false,
      error: CONSENT_WITHDRAWN,
    });
    expect(submissionStatusChange({ consentAt: consent, consentNote: withdrawn, submittedAt: first }, "interview", now).ok).toBe(false);
    expect(submissionStatusChange({ consentAt: consent, consentNote: withdrawn, submittedAt: first }, "zurueckgezogen", now).ok).toBe(true);
    const renewed = consentNoteText("muendlich", "Telefon 20.10.2026");
    expect(renewed).toBe("Mündlich: Telefon 20.10.2026");
    expect(isWithdrawn(renewed)).toBe(false);
    expect(submissionStatusChange({ consentAt: consent, consentNote: renewed, submittedAt: null }, "vorgeschlagen", now).ok).toBe(true);
  });

  it("writes the form of consent into the note", () => {
    expect(consentNoteText("e_mail", "")).toBe("E-Mail");
    expect(consentNoteText("schriftlich", " unterschriebenes Formular ")).toBe("Schriftlich: unterschriebenes Formular");
    expect(isWithdrawn("Im Kandidatenportal bestätigt")).toBe(false);
    expect(isWithdrawn(null)).toBe(false);
  });

  it("accepts a renewed consent only on or after the withdrawal date", () => {
    const withdrawn = withdrawalNoteText("14.10.2026", "muendlich", null);
    expect(withdrawalIsoDate(withdrawn)).toBe("2026-10-14");
    expect(withdrawalIsoDate("E-Mail")).toBeNull();
    expect(renewedConsentError("2026-10-13", withdrawn)).toBe("Die Einwilligung muss am oder nach dem Widerruf vom 14.10.2026 liegen.");
    expect(renewedConsentError("2026-10-14", withdrawn)).toBeNull();
    expect(renewedConsentError("2026-10-01", undefined)).toBeNull();
  });

  it("dates consent on the chosen day, never in the future", () => {
    expect(consentTimestamp(today, today, now)).toBe(now);
    expect(consentTimestamp("2026-10-01", today, now)).toEqual(new Date("2026-10-01T12:00:00Z"));
    expect(consentTimestamp("2026-10-14", today, now)).toEqual({ error: "Das Datum liegt in der Zukunft." });
  });
});

describe("rates and margins", () => {
  it("starts a submission with the mandate's selling rate and the candidate's rate", () => {
    expect(defaultSubmissionRates({ rateSell: 150, rateUnit: "stunde" }, { rateAmount: 120, rateUnit: "stunde" })).toEqual({
      rateSell: 150,
      rateBuy: 120,
      rateUnit: "stunde",
    });
    expect(defaultSubmissionRates({ rateSell: 1200, rateUnit: "tag" }, { rateAmount: 110, rateUnit: "stunde" })).toEqual({
      rateSell: 1200,
      rateBuy: 924,
      rateUnit: "tag",
    });
    expect(defaultSubmissionRates({ rateSell: null, rateUnit: null }, { rateAmount: 1000, rateUnit: "tag" })).toEqual({
      rateSell: null,
      rateBuy: 1000,
      rateUnit: "tag",
    });
    expect(defaultSubmissionRates({ rateSell: 140, rateUnit: "stunde" }, { rateAmount: 1000, rateUnit: "tag" }).rateBuy).toBe(119.05);
  });

  it("shows the margin per hour with a warning colour", () => {
    expect(marginInfo(150, 120, "stunde")).toMatchObject({ amount: 30, percent: 20, tone: "green" });
    expect(marginInfo(150, 120, "stunde")?.text).toBe("CHF 30.00 pro Stunde · 20 %");
    expect(marginInfo(1260, 1176, "tag")).toMatchObject({ amount: 10, tone: "amber" });
    expect(marginInfo(120, 130, "stunde")).toMatchObject({ amount: -10, tone: "red" });
    expect(marginInfo(null, 120, "stunde")).toBeNull();
    expect(marginInfo(150, null, "stunde")).toBeNull();
  });

  it("compares a daily selling rate with an hourly portal rate", () => {
    expect(marginInfo(1260, 120, "tag", "stunde")).toMatchObject({ amount: 30, percent: 20, tone: "green" });
  });

  it("formats rates with their unit", () => {
    expect(formatRate(145, "stunde")).toBe("CHF 145.00 pro Stunde");
    expect(formatRate(1200, "tag", true)).toBe("CHF 1’200 / Tag");
    expect(formatRate(132.5, "stunde", true)).toBe("CHF 132.50 / h");
    expect(formatRate(null, "tag")).toBe("–");
  });

  it("explains the monthly example for hourly and daily rates", () => {
    expect(monthlyExampleText(monthlyExample(120, "stunde")!, "stunde")).toBe(
      "Beispiel 100 %: 21 Tage × 8.4 h = 176.4 h × CHF 120.00 = CHF 21’168.00 pro Monat",
    );
    expect(monthlyExampleText(monthlyExample(1000, "tag")!, "tag")).toBe("Beispiel 100 %: 21 Tage × CHF 1’000.00 = CHF 21’000.00 pro Monat");
    expect(monthlyExampleText(monthlyExample(100, "stunde", 80)!, "stunde")).toBe(
      "Beispiel 80 %: 16.8 Tage × 8.4 h = 141.1 h × CHF 100.00 = CHF 14’110.00 pro Monat",
    );
  });

  it("reads amounts as typed in Switzerland", () => {
    expect(parseAmountInput("1'250.50")).toBe(1250.5);
    expect(parseAmountInput("1’250,5")).toBe(1250.5);
    expect(parseAmountInput(" 120 ")).toBe(120);
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("12.345")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });
});

describe("portal texts", () => {
  it("finds the end client or company in a text", () => {
    const text = "Für die Muster Bank in Zürich suchen wir eine erfahrene Business Analystin.";
    expect(confidentialMentions(text, ["Muster Bank AG", "GHR Group", null])).toEqual(["Muster Bank AG"]);
    expect(confidentialMentions("Einsatz bei GHR Group, Basel", ["GHR Group"])).toEqual(["GHR Group"]);
  });

  it("ignores names inside other words and very short names", () => {
    expect(confidentialMentions("Abacus-Migration", ["Aba"])).toEqual([]);
    expect(confidentialMentions("SBB-Projekt", ["SB"])).toEqual([]);
    expect(confidentialMentions("Projekt für die Post", ["Post AG"])).toEqual(["Post AG"]);
    expect(confidentialMentions("Postfinance", ["Post AG"])).toEqual([]);
  });
});

describe("matching list", () => {
  const ranked = [1, 2, 3, 4, 5].map((id, i) => ({ candidate: { id }, match: { score: 90 - i * 15 } }));

  it("takes the best entries", () => {
    expect(topMatches(ranked, 3).items.map((r) => r.candidate.id)).toEqual([1, 2, 3]);
  });

  it("moves a highlighted candidate to the top", () => {
    const top = topMatches(ranked, 3, 5);
    expect(top.items.map((r) => r.candidate.id)).toEqual([5, 1, 2]);
    expect(top.highlighted?.candidate.id).toBe(5);
    expect(topMatches(ranked, 3, 2).items.map((r) => r.candidate.id)).toEqual([2, 1, 3]);
    expect(topMatches(ranked, 3, 99).highlighted).toBeNull();
  });

  it("suggests good matches that were not shared yet", () => {
    expect(suggestedShareIds(ranked, new Set([1]))).toEqual([2, 3]);
    expect(suggestedShareIds(ranked, new Set(), { max: 1 })).toEqual([1]);
  });
});
