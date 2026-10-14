import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Vacancies (Vakanzen) and snippets (Textbausteine) against a real Postgres
 * (TEST_DATABASE_URL, wiped here): the Server Actions with their checks, history and audit
 * entries, and the list queries. The session check, refresh() and redirect() are stubbed;
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

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

/** The fields the vacancy form always sends. */
const vacancyDefaults = { kind: "ausschreibung", rateUnit: "stunde", status: "neu", priority: "normal", requiredSkills: "[]" };

describe.skipIf(!url)("vacancies and snippets (database)", () => {
  const client = new Client({ connectionString: url });
  const rows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await rows<T>(text, values))[0]!;
  let today: string;
  let formatDate: (value: string) => string;

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    const format = await import("@/lib/admin/format");
    today = format.todayIso();
    formatDate = format.formatDate;
    // Identity columns: a fresh schema numbers rows from 1.
    await client.query("insert into companies (name, kind) values ('Alpenblick Vermittlung AG', 'auftraggeber'), ('Seeblick Bank', 'endkunde')");
    await client.query("insert into contacts (company_id, first_name, last_name) values (1, 'Erika', 'Beispiel'), (2, 'Max', 'Muster')");
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("creates a vacancy: the contact sets the company, line breaks stay as typed", async () => {
    const { createVacancy } = await import("@/app/admin/(app)/vakanzen/actions");
    const result = await createVacancy(
      idle,
      form({
        ...vacancyDefaults,
        title: "Business Analyst Zahlungsverkehr",
        contactId: "1",
        url: "www.example.ch/stellen/42",
        rateSell: "125",
        workload: "80",
        requiredSkills: JSON.stringify(["SAP FI", "Scrum"]),
        applicationText: "Guten Tag\r\n\r\nGerne bewerbe ich mich.\r\n",
      }),
    );
    expect(result).toBeUndefined();
    const row = await one("select company_id, url, rate_sell, workload, required_skills, application_text, applied_at::text from mandates where id = 1");
    expect(row).toEqual({
      company_id: "1",
      url: "https://www.example.ch/stellen/42",
      rate_sell: "125.00",
      workload: 80,
      required_skills: ["SAP FI", "Scrum"],
      application_text: "Guten Tag\n\nGerne bewerbe ich mich.",
      applied_at: null,
    });
    // History on the vacancy and the company; the audit log only has the number.
    expect(await rows("select company_id, mandate_id, body from activities order by id")).toEqual([
      { company_id: "1", mandate_id: "1", body: "Vakanz erfasst: «Business Analyst Zahlungsverkehr» (M-0001), Status Entdeckt" },
    ]);
    expect(await rows("select action, entity, summary from audit_log")).toEqual([{ action: "create", entity: "mandate", summary: "Vakanz M-0001" }]);

    // A contact of another company is refused; a missing title too.
    const wrong = await createVacancy(idle, form({ ...vacancyDefaults, title: "Test", companyId: "2", contactId: "1" }));
    expect(wrong).toMatchObject({ status: "error", errors: { contactId: "Der Kontakt gehört nicht zur gewählten Firma." } });
    expect(await createVacancy(idle, form({ ...vacancyDefaults, title: " " }))).toMatchObject({ status: "error", errors: { title: expect.any(String) } });
    expect(await createVacancy(idle, form({ ...vacancyDefaults, title: "X", startDate: "2026-12-01", endDate: "2026-11-01" }))).toMatchObject({
      status: "error",
      errors: { endDate: "Das Ende liegt vor dem Start." },
    });
  });

  it("marks a vacancy as applied with today's date", async () => {
    const { setVacancyStatus } = await import("@/app/admin/(app)/vakanzen/actions");
    expect(await setVacancyStatus(1, "angeboten")).toEqual({ status: "success", message: "Status: Beworben." });
    expect(await one("select status, applied_at::text, closed_at from mandates where id = 1")).toEqual({ status: "angeboten", applied_at: today, closed_at: null });
    expect((await one<{ body: string }>("select body from activities where mandate_id = 1 order by id desc limit 1")).body).toBe(
      `Status geändert: Entdeckt → Beworben, beworben am ${formatDate(today)}`,
    );
    // The same status again changes nothing.
    expect(await setVacancyStatus(1, "angeboten")).toEqual({ status: "success" });
    expect(await rows("select 1 from activities where mandate_id = 1")).toHaveLength(2);
    expect(await setVacancyStatus(1, "unbekannt")).toMatchObject({ status: "error" });
    expect(await setVacancyStatus(999, "interview")).toMatchObject({ status: "error" });

    expect(await setVacancyStatus(1, "gewonnen")).toMatchObject({ status: "success" });
    const won = await one<{ closed_at: Date | null; applied_at: string }>("select closed_at, applied_at::text from mandates where id = 1");
    expect(won.closed_at).toBeInstanceOf(Date);
    expect(won.applied_at).toBe(today);
  });

  it("saves the form and keeps or fills the application date", async () => {
    const { updateVacancy } = await import("@/app/admin/(app)/vakanzen/actions");
    await client.query("insert into mandates (title, status, company_id) values ('Testmanager', 'in_bearbeitung', 2)");
    expect(await updateVacancy(2, idle, form({ ...vacancyDefaults, title: "Testmanager Bank", companyId: "2", status: "angeboten", appliedAt: "" }))).toBeUndefined();
    expect(await one("select title, status, applied_at::text from mandates where id = 2")).toEqual({ title: "Testmanager Bank", status: "angeboten", applied_at: today });
    expect((await one<{ body: string }>("select body from activities where mandate_id = 2 order by id desc limit 1")).body).toBe(
      "Status geändert: In Vorbereitung → Beworben",
    );
    // A date typed in the form wins.
    await updateVacancy(2, idle, form({ ...vacancyDefaults, title: "Testmanager Bank", companyId: "2", status: "angeboten", appliedAt: "2026-10-01" }));
    expect(await one("select applied_at::text from mandates where id = 2")).toEqual({ applied_at: "2026-10-01" });
    expect(await updateVacancy(999, idle, form({ ...vacancyDefaults, title: "Weg" }))).toMatchObject({ status: "error" });

    // Skills of the former version under «weitere Kompetenzen»: the form lists them with the
    // others, and after a save only that one list is left.
    const { getMandate } = await import("@/lib/admin/data/mandates");
    const { vacancySkills } = await import("@/lib/admin/vacancy-rules");
    await client.query("update mandates set required_skills = '{Jira}', nice_skills = '{jira, Confluence}' where id = 2");
    const old = await getMandate(2);
    expect(vacancySkills(old!)).toEqual(["Jira", "Confluence"]);
    const skills = JSON.stringify(vacancySkills(old!));
    await updateVacancy(2, idle, form({ ...vacancyDefaults, title: "Testmanager Bank", companyId: "2", status: "angeboten", appliedAt: "2026-10-01", requiredSkills: skills }));
    expect(await one("select required_skills, nice_skills from mandates where id = 2")).toEqual({ required_skills: ["Jira", "Confluence"], nice_skills: [] });
  });

  it("sets the next step and moves it into the history when done", async () => {
    const { completeNextStep, saveNextStep } = await import("@/app/admin/(app)/vakanzen/actions");
    expect(await saveNextStep(2, idle, form({ nextStep: "Bei Seeblick nachfragen", nextStepAt: "2026-10-20" }))).toMatchObject({ status: "success" });
    expect(await one("select next_step, next_step_at::text from mandates where id = 2")).toEqual({ next_step: "Bei Seeblick nachfragen", next_step_at: "2026-10-20" });
    expect(await saveNextStep(2, idle, form({ nextStep: "", nextStepAt: "2026-10-22" }))).toMatchObject({ status: "error", errors: { nextStep: expect.any(String) } });
    expect(await completeNextStep(2)).toMatchObject({ status: "success" });
    expect(await one("select next_step, next_step_at::text from mandates where id = 2")).toEqual({ next_step: null, next_step_at: null });
    const history = await rows<{ body: string }>("select body from activities where mandate_id = 2 order by id");
    expect(history.slice(-2).map((h) => h.body)).toEqual(["Nächster Schritt: Bei Seeblick nachfragen (bis 20.10.2026)", "Erledigt: Bei Seeblick nachfragen"]);
  });

  it("lists vacancies in pipeline order, counts them and finds due next steps", async () => {
    const data = await import("@/lib/admin/data/mandates");
    await client.query(
      `insert into mandates (title, status, priority, next_step, next_step_at, deadline, required_skills, company_id) values
         ('Cloud Architekt', 'neu', 'normal', 'CV anpassen', '2026-10-13', null, '{Azure}', 1),
         ('Scrum Master', 'neu', 'hoch', null, null, '2026-11-30', '{}', null),
         ('Data Engineer', 'interview', 'normal', 'Interview vorbereiten', '2026-10-16', null, '{Azure, Python}', 1),
         ('SAP Basis', 'verloren', 'normal', 'Alt', '2026-09-01', null, '{}', null)`,
    );
    // ids 3 to 6. Open ones by status, high priority first; decided ones after.
    const all = await data.listMandates({ statuses: null, page: 1 });
    expect(all.rows.map((r) => [r.id, r.status])).toEqual([
      [4, "neu"],
      [3, "neu"],
      [2, "angeboten"],
      [5, "interview"],
      [1, "gewonnen"],
      [6, "verloren"],
    ]);
    expect(await data.mandateStatusCounts({})).toEqual({ neu: 2, angeboten: 1, interview: 1, gewonnen: 1, verloren: 1 });
    expect(await data.mandateStatusCounts({ companyId: 1 })).toEqual({ neu: 1, interview: 1, gewonnen: 1 });
    // Skills are searchable, in the list and in the global search alike.
    expect((await data.listMandates({ q: "python", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([5]);
    const { searchAll } = await import("@/lib/admin/data/search");
    expect((await searchAll("python"))?.mandates.rows.map((r) => r.id)).toEqual([5]);

    // Due by 2026-10-16: the overdue step first; closed vacancies never.
    const due = await data.dueNextSteps({ today: "2026-10-14", days: 2 });
    expect(due.map((d) => [d.id, d.nextStep])).toEqual([
      [3, "CV anpassen"],
      [5, "Interview vorbereiten"],
    ]);
    expect((await data.dueNextSteps({ today: "2026-10-14", days: 0 })).map((d) => d.id)).toEqual([3]);
    expect(await data.skillSuggestions()).toEqual(["Azure", "Confluence", "Jira", "Python", "SAP FI", "Scrum"]);
  });

  it("shows the vacancy with its contact and the assignments made from it", async () => {
    const data = await import("@/lib/admin/data/mandates");
    await client.query("insert into assignments (title, mandate_id, company_id, start_date) values ('Business Analyst', 1, 1, '2026-11-01')");
    const vacancy = await data.getMandate(1);
    expect(vacancy).toMatchObject({ id: 1, companyName: "Alpenblick Vermittlung AG", contact: { firstName: "Erika", lastName: "Beispiel" } });
    expect(await data.vacancyAssignments(1)).toEqual([
      { id: 1, title: "Business Analyst", status: "laufend", startDate: "2026-11-01", endDate: null, companyName: "Alpenblick Vermittlung AG" },
    ]);
    expect(await data.mandateDeleteImpact(1)).toEqual({ assignments: 1, contracts: 0, documents: 0, legacy: 0 });
    expect(await data.getMandate(999)).toBeNull();
  });

  it("deletes a vacancy: assignments stay, the company keeps its history", async () => {
    const { deleteVacancy } = await import("@/app/admin/(app)/vakanzen/actions");
    expect(await deleteVacancy(1)).toBeUndefined();
    expect(await rows("select 1 from mandates where id = 1")).toEqual([]);
    expect(await one("select mandate_id from assignments where id = 1")).toEqual({ mandate_id: null });
    // Entries of the vacancy alone are gone; the shared one stays on the company.
    expect(await rows("select 1 from activities where mandate_id = 1")).toEqual([]);
    expect(await rows("select body from activities where company_id = 1 order by id")).toEqual([
      { body: "Vakanz erfasst: «Business Analyst Zahlungsverkehr» (M-0001), Status Entdeckt" },
      { body: "Vakanz gelöscht: «Business Analyst Zahlungsverkehr» (M-0001)" },
    ]);
    expect(await one("select action, summary from audit_log where entity = 'mandate' order by id desc limit 1")).toEqual({ action: "delete", summary: "Vakanz M-0001" });
    expect(await deleteVacancy(1)).toMatchObject({ status: "error" });
  });

  it("creates snippets, keeps an existing category spelling and lists pinned ones first", async () => {
    const { createSnippet } = await import("@/app/admin/(app)/texte/actions");
    const data = await import("@/lib/admin/data/snippets");
    expect(await createSnippet(idle, form({ title: "Kurzprofil", category: "Bewerbung", body: "Ferhat Demir\r\nBusiness Analyst\r\n", pinned: "on" }))).toBeUndefined();
    await createSnippet(idle, form({ title: "Absage höflich", category: "  bewerbung ", companyId: "1", body: "Danke für die Rückmeldung." }));
    await createSnippet(idle, form({ title: "Anfrage Stundensatz", category: "E-Mail", body: "Guten Tag" }));
    await createSnippet(idle, form({ title: "Notiz", body: "Ohne Kategorie" }));
    expect(await createSnippet(idle, form({ title: "Leer", body: " \r\n " }))).toMatchObject({ status: "error", errors: { body: "Bitte den Text eingeben." } });
    expect(await createSnippet(idle, form({ title: "Weg", body: "x", companyId: "999" }))).toMatchObject({ status: "error", errors: { companyId: expect.any(String) } });

    expect(await one("select category, body, pinned from snippets where id = 1")).toEqual({ category: "Bewerbung", body: "Ferhat Demir\nBusiness Analyst", pinned: true });
    expect(await one("select category from snippets where id = 2")).toEqual({ category: "Bewerbung" });
    expect((await data.listSnippets()).map((s) => s.title)).toEqual(["Kurzprofil", "Absage höflich", "Anfrage Stundensatz", "Notiz"]);
    expect(await data.snippetCategories()).toEqual([
      { category: "Bewerbung", count: 2 },
      { category: "E-Mail", count: 1 },
    ]);
    expect((await data.listSnippets({ category: "BEWERBUNG" })).map((s) => s.id)).toEqual([1, 2]);
    expect((await data.listSnippets({ q: "alpenblick" })).map((s) => s.id)).toEqual([2]);
    expect((await data.listSnippets({ q: "T-0003" })).map((s) => s.id)).toEqual([3]);
    expect((await data.listSnippets({ companyId: 1 })).map((s) => s.id)).toEqual([2]);
    // On a vacancy: the company's snippets first, then the pinned ones.
    expect((await data.snippetsForCompany(1)).map((s) => s.id)).toEqual([2, 1]);
    expect((await data.snippetsForCompany(null)).map((s) => s.id)).toEqual([1]);
    expect((await data.pinnedSnippets()).map((s) => s.id)).toEqual([1]);
    expect(await data.snippetCompanyOptions()).toEqual([{ value: 1, label: "Alpenblick Vermittlung AG" }]);
    expect(await rows("select summary from audit_log where entity = 'snippet' order by id")).toEqual([
      { summary: "Textbaustein T-0001" },
      { summary: "Textbaustein T-0002" },
      { summary: "Textbaustein T-0003" },
      { summary: "Textbaustein T-0004" },
    ]);
  });

  it("pins, edits and deletes a snippet", async () => {
    const { editSnippet, pinSnippet, removeSnippet } = await import("@/app/admin/(app)/texte/actions");
    const before = await one<{ updated_at: Date }>("select updated_at from snippets where id = 3");
    expect(await pinSnippet(3, true)).toEqual({ status: "success" });
    // Pinning is no edit: the date of the last change stays.
    expect(await one("select pinned, updated_at from snippets where id = 3")).toEqual({ pinned: true, updated_at: before.updated_at });
    expect(await editSnippet(3, idle, form({ title: "Anfrage Satz", category: "E-Mail", body: "Guten Tag\r\nNeu" }))).toBeUndefined();
    // The checkbox was not sent: the snippet is released again.
    expect(await one("select title, body, pinned from snippets where id = 3")).toEqual({ title: "Anfrage Satz", body: "Guten Tag\nNeu", pinned: false });
    expect(await removeSnippet(3)).toBeUndefined();
    expect(await rows("select 1 from snippets where id = 3")).toEqual([]);
    expect(await removeSnippet(3)).toMatchObject({ status: "error" });
    expect(await pinSnippet(3, false)).toMatchObject({ status: "error" });
    expect(await editSnippet(3, idle, form({ title: "x", body: "y" }))).toMatchObject({ status: "error" });
  });
});
