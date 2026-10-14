import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Assignments, the earnings settings and the dashboard queries against a real Postgres
 * (TEST_DATABASE_URL, wiped here). The session check, refresh() and redirect() are stubbed;
 * everything else is the real code. Fictional sample data only.
 */

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

vi.mock("@/lib/admin/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/auth/session")>()),
  requireAdmin: vi.fn(async () => ({ id: "test", createdAt: new Date(), expiresAt: new Date() })),
}));
vi.mock("next/cache", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/cache")>()), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), redirect: vi.fn() }));

const url = process.env.TEST_DATABASE_URL;
const idle = { status: "idle" } as const;

function form(values: Record<string, string | number | boolean>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === false) continue;
    fd.set(key, value === true ? "on" : String(value));
  }
  return fd;
}

describe.skipIf(!url)("assignments, earnings settings and dashboard (database)", () => {
  const client = new Client({ connectionString: url });
  const rows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await rows<T>(text, values))[0]!;

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("creates an assignment from a vacancy, checks the links and deletes it without losing the vacancy history", async () => {
    const { createAssignment, deleteAssignment, updateAssignment } = await import("@/app/admin/(app)/auftraege/actions");
    const { vacancyPrefill, assignmentsOfVacancy, assignmentDeleteImpact, getAssignment } = await import("@/lib/admin/data/assignments");
    const { redirect } = await import("next/navigation");

    const firm = await one<{ id: string }>("insert into companies (name, kind) values ('Muster Vermittlung AG', 'auftraggeber') returning id");
    const other = await one<{ id: string }>("insert into companies (name, kind) values ('Andere AG', 'auftraggeber') returning id");
    const contact = await one<{ id: string }>("insert into contacts (company_id, first_name, last_name) values ($1, 'Erika', 'Muster') returning id", [firm.id]);
    const vacancy = await one<{ id: string }>(
      `insert into mandates (title, company_id, contact_id, end_client, rate_sell, rate_unit, workload, start_date, end_date, location, remote, status)
       values ('Business Analyst', $1, $2, 'Beispielbank', 125, 'stunde', 80, '2026-11-01', '2027-04-30', 'Bern', 'hybrid', 'gewonnen') returning id`,
      [firm.id, contact.id],
    );
    const vid = Number(vacancy.id);

    const prefill = await vacancyPrefill(vid);
    expect(prefill).toEqual({
      title: "Business Analyst",
      companyId: Number(firm.id),
      contactId: Number(contact.id),
      mandateId: vid,
      endClient: "Beispielbank",
      rateAmount: 125,
      rateUnit: "stunde",
      workload: 80,
      startDate: "2026-11-01",
      endDate: "2027-04-30",
      location: "Bern",
      remote: "hybrid",
    });
    expect(await vacancyPrefill(999_999)).toBeNull();

    const base = {
      title: "Business Analyst",
      status: "laufend",
      companyId: firm.id,
      contactId: contact.id,
      mandateId: vacancy.id,
      endClient: "Beispielbank",
      startDate: "2026-11-01",
      endDate: "2027-04-30",
      workload: 80,
      rateAmount: "125.00",
      rateUnit: "stunde",
      billing: "rechnung",
      rateBasis: "brutto",
      hoursPerMonth: "",
      expensesMonthly: "",
      location: "Bern",
      remote: "hybrid",
      notes: "",
    };

    // The contact must belong to the company, the end must not be before the start.
    expect(await createAssignment(idle, form({ ...base, companyId: other.id }))).toMatchObject({ status: "error", errors: { contactId: expect.any(String) } });
    expect(await createAssignment(idle, form({ ...base, endDate: "2026-10-01" }))).toMatchObject({ status: "error", errors: { endDate: expect.any(String) } });
    expect(await rows("select 1 from assignments")).toEqual([]);

    expect(await createAssignment(idle, form(base))).toBeUndefined();
    const created = await one<{ id: string; rate_amount: string; expenses_monthly: string; hours_per_month: string | null; mandate_id: string }>(
      "select id, rate_amount, expenses_monthly, hours_per_month, mandate_id from assignments",
    );
    const aid = Number(created.id);
    expect(created).toMatchObject({ rate_amount: "125.00", expenses_monthly: "0.00", hours_per_month: null, mandate_id: vacancy.id });
    expect(redirect).toHaveBeenLastCalledWith(`/admin/auftraege/${aid}`);
    expect(await assignmentsOfVacancy(vid)).toEqual([{ id: aid, title: "Business Analyst" }]);

    // One history entry, shown on the assignment and on the vacancy; the audit log holds numbers only.
    const no = `A-${String(aid).padStart(4, "0")}`;
    expect(await rows("select body, assignment_id, mandate_id from activities")).toEqual([{ body: `Auftrag ${no} erfasst`, assignment_id: created.id, mandate_id: vacancy.id }]);
    expect(await rows("select action, entity, summary from audit_log where entity = 'assignment'")).toEqual([{ action: "create", entity: "assignment", summary: `Auftrag ${no}` }]);

    // Payroll at an all-in rate; the status change is logged.
    expect(await updateAssignment(aid, idle, form({ ...base, status: "beendet", billing: "lohn", rateBasis: "kostensatz", hoursPerMonth: "150" }))).toBeUndefined();
    const detail = await getAssignment(aid);
    expect(detail?.assignment).toMatchObject({ status: "beendet", billing: "lohn", rateBasis: "kostensatz", hoursPerMonth: 150 });
    expect(detail).toMatchObject({ companyName: "Muster Vermittlung AG", contactFirstName: "Erika", mandateTitle: "Business Analyst" });
    expect(await rows("select body from activities where assignment_id = $1 and mandate_id is null", [aid])).toEqual([{ body: "Status: Laufend → Beendet" }]);

    // Deleting: the contract stays without the link, the vacancy keeps its history.
    await client.query("insert into contracts (number, template, title, assignment_id) values ('V-2026-0201', 'einzelauftrag', 'Einzelauftrag', $1)", [aid]);
    expect(await assignmentDeleteImpact(aid)).toEqual({ documents: 0, contracts: 1 });
    expect(await deleteAssignment(aid)).toBeUndefined();
    expect(redirect).toHaveBeenLastCalledWith("/admin/auftraege");
    expect(await rows("select 1 from assignments")).toEqual([]);
    expect(await one("select assignment_id from contracts where number = 'V-2026-0201'")).toEqual({ assignment_id: null });
    expect(await rows("select body, assignment_id from activities where mandate_id = $1 order by id", [vid])).toEqual([
      { body: `Auftrag ${no} erfasst`, assignment_id: null },
      { body: `Auftrag ${no} gelöscht`, assignment_id: null },
    ]);
    expect(await rows("select 1 from activities where body like 'Status:%'")).toEqual([]);
    expect(await deleteAssignment(aid)).toMatchObject({ status: "error" });
  });

  it("saves the earnings settings, reads them back and resets them", async () => {
    const { saveEarningsSettings, clearEarningsSettings } = await import("@/app/admin/(app)/rechner/actions");
    const { loadEarningsSettings } = await import("@/lib/admin/data/earnings");
    const { EARNINGS_DEFAULTS, flatFromSettings } = await import("@/lib/admin/earnings");

    expect(await loadEarningsSettings()).toMatchObject({ saved: false, savedAt: null, settings: { ktgPercent: EARNINGS_DEFAULTS.ktgPercent } });

    const values = { ...flatFromSettings(EARNINGS_DEFAULTS), ktgPercent: "1.3", "payroll.alv": "1.1", fakEnabled: false };
    expect(await saveEarningsSettings(idle, form(values))).toMatchObject({ status: "success" });
    const loaded = await loadEarningsSettings();
    expect(loaded.saved).toBe(true);
    expect(loaded.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(loaded.settings).toMatchObject({ ktgPercent: 1.3, fakEnabled: false, payroll: { alv: 1.1 } });

    // Invalid values are refused and leave the stored ones alone.
    expect(await saveEarningsSettings(idle, form({ ...values, ktgPercent: "viel" }))).toMatchObject({ status: "error", errors: { ktgPercent: expect.any(String) } });
    expect((await loadEarningsSettings()).settings.ktgPercent).toBe(1.3);

    expect(await clearEarningsSettings()).toMatchObject({ status: "success" });
    expect(await loadEarningsSettings()).toMatchObject({ saved: false, settings: { ktgPercent: EARNINGS_DEFAULTS.ktgPercent, fakEnabled: true } });
    expect(await rows("select summary from audit_log where entity = 'settings' order by id")).toEqual([
      { summary: "Rechner: Annahmen gespeichert" },
      { summary: "Rechner: Annahmen zurückgesetzt" },
    ]);
  });

  it("collects the dashboard figures", async () => {
    const data = await import("@/lib/admin/data/dashboard");
    const { runningAssignments } = await import("@/lib/admin/data/assignments");
    const { listEndingContracts } = await import("@/lib/admin/contracts/data");
    const { pinnedSnippets } = await import("@/lib/admin/data/snippets");
    const today = "2026-10-14";

    await client.query("delete from activities; delete from contracts; delete from assignments; delete from mandates; delete from snippets;");
    expect(await data.nextBestStep()).toEqual({ kind: "keine" });

    const open = await one<{ id: string }>("insert into mandates (title, status, next_step, next_step_at) values ('Testmanager', 'angeboten', 'Nachfassen', '2026-10-13') returning id");
    await client.query("insert into mandates (title, status, next_step, next_step_at) values ('Später', 'neu', 'Lesen', '2026-12-01')");
    expect(await data.nextBestStep()).toMatchObject({ kind: "vakanz", id: Number(open.id), nextStep: "Nachfassen" });

    const won = await one<{ id: string }>("insert into mandates (title, status) values ('Requirements Engineer', 'gewonnen') returning id");
    expect(await data.nextBestStep()).toMatchObject({ kind: "zusage", id: Number(won.id) });
    await client.query("insert into assignments (title, mandate_id, status) values ('Requirements Engineer', $1, 'geplant')", [won.id]);
    expect(await data.nextBestStep()).toMatchObject({ kind: "geplant", title: "Requirements Engineer" });

    expect(await data.vacancyPipeline()).toEqual({ angeboten: 1, neu: 1, gewonnen: 1 });
    await client.query(
      `insert into mandates (title, status, deadline, applied_at) values
         ('Frist offen', 'in_bearbeitung', '2026-10-17', null),
         ('Schon beworben', 'angeboten', '2026-10-17', '2026-10-12')`,
    );
    const agenda = await data.dashboardAgenda(today);
    expect(agenda.nextSteps.map((m) => m.title)).toEqual(["Testmanager"]);
    // The deadline of a vacancy he has applied for is no longer shown.
    expect(agenda.deadlines.map((m) => m.title)).toEqual(["Frist offen"]);
    await client.query("delete from mandates where title in ('Frist offen', 'Schon beworben')");

    await client.query(
      `insert into assignments (title, status, end_date, rate_amount) values ('Läuft länger', 'laufend', '2027-06-30', 120), ('Läuft kürzer', 'laufend', '2026-12-31', 110), ('Vorbei', 'beendet', '2026-01-31', 100)`,
    );
    expect((await runningAssignments()).map((a) => a.title)).toEqual(["Läuft kürzer", "Läuft länger"]);

    await client.query(
      `insert into contracts (number, title, status, valid_until) values
         ('V-1', 'Endet bald', 'unterzeichnet', '2026-11-30'),
         ('V-2', 'Endet heute', 'unterzeichnet', '2026-10-14'),
         ('V-3', 'Endet später', 'unterzeichnet', '2027-01-31'),
         ('V-4', 'Schon vorbei', 'unterzeichnet', '2026-10-01'),
         ('V-5', 'Hinfällig', 'storniert', '2026-11-01')`,
    );
    expect((await listEndingContracts(today)).map((c) => c.number)).toEqual(["V-2", "V-1"]);

    await client.query("insert into snippets (title, body, pinned) values ('Kurzprofil', 'Text A', true), ('Anschreiben', 'Text B', false)");
    expect((await pinnedSnippets(6)).map((s) => s.title)).toEqual(["Kurzprofil"]);
  });
});
