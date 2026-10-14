import { describe, expect, it } from "vitest";
import {
  dueState,
  dueTone,
  filterStatuses,
  formatRate,
  groupCounts,
  groupOf,
  parseStatusFilter,
  quickActions,
  rechnerHref,
  sectionsByStatus,
  statusChange,
  statusParam,
} from "./vacancy-rules";

const now = new Date("2026-10-14T08:30:00Z");
const today = "2026-10-14";

describe("status filter", () => {
  it("shows the open vacancies by default", () => {
    expect(parseStatusFilter(undefined)).toEqual({ group: "offen", status: null });
    expect(parseStatusFilter("unbekannt")).toEqual({ group: "offen", status: null });
    expect(filterStatuses(parseStatusFilter(undefined))).toEqual(["neu", "in_bearbeitung", "angeboten", "interview"]);
  });

  it("takes a group or a single status", () => {
    expect(parseStatusFilter("alle")).toEqual({ group: "alle", status: null });
    expect(filterStatuses({ group: "alle", status: null })).toBeNull();
    expect(parseStatusFilter("angeboten")).toEqual({ group: "offen", status: "angeboten" });
    expect(filterStatuses(parseStatusFilter("angeboten"))).toEqual(["angeboten"]);
    expect(parseStatusFilter("pausiert")).toEqual({ group: "abgeschlossen", status: "pausiert" });
    // "Zusage" is a group of one status: no extra narrowing.
    expect(parseStatusFilter("gewonnen")).toEqual({ group: "zusage", status: null });
  });

  it("builds the ?status= value back", () => {
    expect(statusParam({ group: "offen", status: null })).toBeUndefined();
    expect(statusParam({ group: "offen", status: "interview" })).toBe("interview");
    expect(statusParam({ group: "alle", status: null })).toBe("alle");
    for (const value of [undefined, "alle", "zusage", "abgeschlossen", "neu", "verloren"]) {
      const filter = parseStatusFilter(value);
      expect(parseStatusFilter(statusParam(filter))).toEqual(filter);
    }
  });

  it("counts every status once per group", () => {
    expect(groupCounts({ neu: 2, interview: 1, gewonnen: 3, pausiert: 1, verloren: 2 })).toEqual({ offen: 3, zusage: 3, abgeschlossen: 3, alle: 9 });
    expect(groupOf("angeboten")).toBe("offen");
    expect(groupOf("zurueckgezogen")).toBe("abgeschlossen");
  });

  it("splits sorted rows into sections per status", () => {
    const rows = [
      { id: 1, status: "neu" },
      { id: 2, status: "neu" },
      { id: 3, status: "angeboten" },
    ];
    expect(sectionsByStatus(rows)).toEqual([
      { status: "neu", rows: [rows[0], rows[1]] },
      { status: "angeboten", rows: [rows[2]] },
    ]);
    expect(sectionsByStatus([])).toEqual([]);
  });
});

describe("due dates", () => {
  it("marks overdue dates red", () => {
    expect(dueState("2026-10-13", today)).toEqual({ level: "overdue", days: -1, label: "1 Tag überfällig" });
    expect(dueState("2026-10-09", today)?.label).toBe("5 Tage überfällig");
    expect(dueTone(dueState("2026-10-09", today))).toBe("red");
  });

  it("marks today and the next three days amber", () => {
    expect(dueState(today, today)).toMatchObject({ level: "today", label: "heute" });
    expect(dueState("2026-10-15", today)).toMatchObject({ level: "soon", label: "morgen" });
    expect(dueState("2026-10-17", today)).toMatchObject({ level: "soon", label: "in 3 Tagen" });
    expect(dueTone(dueState("2026-10-17", today))).toBe("amber");
  });

  it("does not highlight later dates, missing dates or closed vacancies", () => {
    expect(dueState("2026-10-18", today)).toMatchObject({ level: "later", days: 4 });
    expect(dueTone(dueState("2026-10-18", today))).toBeNull();
    expect(dueState(null, today)).toBeNull();
    expect(dueState("2026-10-01", today, false)).toBeNull();
  });

  it("counts calendar days across the change to winter time", () => {
    expect(dueState("2026-10-26", "2026-10-24")?.days).toBe(2);
  });
});

describe("status changes", () => {
  const earlier = new Date("2026-09-01T10:00:00Z");

  it("records today as application date when marked as applied", () => {
    expect(statusChange({ status: "in_bearbeitung", appliedAt: null, closedAt: null }, "angeboten", today, now)).toEqual({
      status: "angeboten",
      appliedAt: today,
      closedAt: null,
    });
  });

  it("keeps an application date that is already there", () => {
    expect(statusChange({ status: "neu", appliedAt: "2026-10-02", closedAt: null }, "angeboten", today, now).appliedAt).toBe("2026-10-02");
    // Only "Beworben" fills the date; an interview without a known application date stays without.
    expect(statusChange({ status: "neu", appliedAt: null, closedAt: null }, "interview", today, now).appliedAt).toBeNull();
  });

  it("sets closed_at when a decision is made and keeps the first one", () => {
    expect(statusChange({ status: "interview", appliedAt: "2026-10-01", closedAt: null }, "gewonnen", today, now).closedAt).toBe(now);
    expect(statusChange({ status: "verloren", appliedAt: null, closedAt: earlier }, "zurueckgezogen", today, now).closedAt).toBe(earlier);
  });

  it("clears closed_at when the vacancy reopens or pauses", () => {
    expect(statusChange({ status: "verloren", appliedAt: null, closedAt: earlier }, "interview", today, now).closedAt).toBeNull();
    expect(statusChange({ status: "gewonnen", appliedAt: null, closedAt: earlier }, "pausiert", today, now).closedAt).toBeNull();
  });

  it("changes nothing when the status stays", () => {
    const state = { status: "angeboten", appliedAt: null, closedAt: null };
    expect(statusChange(state, "angeboten", today, now)).toEqual(state);
  });

  it("offers the usual next steps per status", () => {
    expect(quickActions("neu", null).map((a) => a.status)).toEqual(["in_bearbeitung", "angeboten"]);
    expect(quickActions("in_bearbeitung", null)).toEqual([{ status: "angeboten", label: "Als beworben markieren", primary: true }]);
    expect(quickActions("interview", "2026-10-01").find((a) => a.primary)?.status).toBe("gewonnen");
    expect(quickActions("pausiert", "2026-10-01")).toEqual([{ status: "angeboten", label: "Wieder aufnehmen", primary: true }]);
    expect(quickActions("pausiert", null)[0].status).toBe("in_bearbeitung");
    expect(quickActions("gewonnen", null)).toEqual([]);
  });
});

describe("display", () => {
  it("formats the posted rate", () => {
    expect(formatRate(125, "stunde")).toBe("CHF 125.00 pro Stunde");
    expect(formatRate(125, "stunde", true)).toBe("CHF 125 / h");
    expect(formatRate(1100, "tag", true)).toBe("CHF 1’100 / Tag");
    expect(formatRate(null, "stunde")).toBe("–");
  });

  it("links to the calculator with rate, unit and workload", () => {
    expect(rechnerHref({ rateSell: 125, rateUnit: "stunde", workload: 80 })).toBe("/admin/rechner?satz=125&einheit=stunde&pensum=80");
    expect(rechnerHref({ rateSell: 1050.5, rateUnit: "tag", workload: null })).toBe("/admin/rechner?satz=1050.5&einheit=tag");
    expect(rechnerHref({ rateSell: null, rateUnit: "stunde", workload: 100 })).toBeNull();
    expect(rechnerHref({ rateSell: 0, rateUnit: "stunde", workload: 100 })).toBeNull();
  });
});
