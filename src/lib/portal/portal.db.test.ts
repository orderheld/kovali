import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The candidate portal against a real Postgres (TEST_DATABASE_URL, wiped by this test):
 * change requests and their confirmation, the firm, documents, vacancies, consent and
 * accounts, with attempts to reach another candidate's data (IDOR). Fictional data only.
 */

const url = process.env.TEST_DATABASE_URL;

type Mods = {
  db: Awaited<ReturnType<typeof import("@/lib/admin/db/client").getDb>>;
  schema: typeof import("@/lib/admin/db/schema");
  cr: typeof import("./change-requests");
  data: typeof import("./data");
  vac: typeof import("./vacancies");
  acc: typeof import("./accounts");
  admin: typeof import("./admin");
  docs: typeof import("@/lib/admin/documents");
};

let m: Mods;
const ids = { anna: 0, beat: 0, carla: 0, open: 0, selected: 0, closed: 0, hidden: 0, won: 0 };

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const { pool } = globalThis.__kovaliAdminDb!;
  const res = await pool.query(text, params);
  return res.rows as T[];
}

describe.skipIf(!url)("candidate portal (database)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.ADMIN_SECRET = randomBytes(32).toString("base64url");
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    await client.end();
    globalThis.__kovaliAdminDb = undefined;

    const { getDb } = await import("@/lib/admin/db/client");
    m = {
      db: await getDb(),
      schema: await import("@/lib/admin/db/schema"),
      cr: await import("./change-requests"),
      data: await import("./data"),
      vac: await import("./vacancies"),
      acc: await import("./accounts"),
      admin: await import("./admin"),
      docs: await import("@/lib/admin/documents"),
    };

    const people = await sql<{ id: number }>(
      `insert into candidates (first_name, last_name, email, status, skills) values
        ('Anna', 'Beispiel', 'anna@example.ch', 'aktiv', '{BPMN}'),
        ('Beat', 'Muster', 'beat@example.ch', 'aktiv', '{}'),
        ('Carla', 'Test', 'carla@example.ch', 'archiviert', '{}')
       returning id`,
    );
    [ids.anna, ids.beat, ids.carla] = people.map((p) => Number(p.id));
    const mandates = await sql<{ id: number }>(
      `insert into mandates (title, status, portal_visibility, portal_title, portal_rate, portal_rate_unit, workload, closed_at) values
        ('Intern: BA bei Kunde X', 'neu', 'alle', 'Business Analyst Zahlungsverkehr', 110, 'stunde', 80, null),
        ('Intern: Testmanager', 'in_bearbeitung', 'ausgewaehlt', 'Testmanager SAP', 900, 'tag', 100, null),
        ('Intern: geschlossen', 'neu', 'alle', 'Geschlossen', 100, 'stunde', 100, now()),
        ('Intern: nicht im Portal', 'neu', 'keine', 'Versteckt', 100, 'stunde', 100, null),
        ('Intern: gewonnen', 'gewonnen', 'alle', 'Gewonnen', 100, 'stunde', 100, null)
       returning id`,
    );
    [ids.open, ids.selected, ids.closed, ids.hidden, ids.won] = mandates.map((r) => Number(r.id));
    await sql("insert into vacancy_shares (mandate_id, candidate_id) values ($1, $2)", [ids.selected, ids.anna]);
  }, 60_000);

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
  });

  // --- Vacancies ------------------------------------------------------------------

  it("shows open vacancies for everyone and selected ones only with a share", async () => {
    const anna = (await m.vac.listVisibleVacancies(ids.anna)).map((v) => v.id).sort();
    const beat = (await m.vac.listVisibleVacancies(ids.beat)).map((v) => v.id);
    const carla = await m.vac.listVisibleVacancies(ids.carla);
    expect(anna).toEqual([ids.open, ids.selected].sort());
    expect(beat).toEqual([ids.open]);
    expect(carla).toEqual([]);
    expect(await m.vac.getVisibleVacancy(ids.beat, ids.selected)).toBeNull();
    expect(await m.vac.getVisibleVacancy(ids.anna, ids.closed)).toBeNull();
    expect(await m.vac.getVisibleVacancy(ids.anna, ids.hidden)).toBeNull();
    expect(await m.vac.getVisibleVacancy(ids.anna, ids.won)).toBeNull();
  });

  it("never selects internal mandate fields", async () => {
    const v = await m.vac.getVisibleVacancy(ids.anna, ids.open);
    expect(v?.portalTitle).toBe("Business Analyst Zahlungsverkehr");
    expect(JSON.stringify(v)).not.toContain("Intern");
    expect(v).not.toHaveProperty("title");
    expect(v).not.toHaveProperty("companyId");
  });

  it("marks a vacancy as seen once and does not open hidden ones", async () => {
    expect(await m.vac.countNewVacancies(ids.beat)).toBe(1);
    await m.vac.markVacancySeen(ids.beat, ids.open);
    expect(await m.vac.countNewVacancies(ids.beat)).toBe(0);
    await m.vac.markVacancySeen(ids.beat, ids.selected);
    const rows = await sql("select 1 from vacancy_shares where candidate_id = $1 and mandate_id = $2", [ids.beat, ids.selected]);
    expect(rows).toHaveLength(0);
  });

  it("records interest with consent as a submission, only for visible vacancies", async () => {
    const denied = await m.vac.answerVacancy(ids.beat, ids.selected, { response: "interessiert", consent: true, message: null });
    expect(denied.ok).toBe(false);
    expect(await sql("select 1 from submissions where candidate_id = $1", [ids.beat])).toHaveLength(0);

    const result = await m.vac.answerVacancy(ids.anna, ids.open, { response: "interessiert", consent: true, message: "Ab Januar verfügbar." });
    expect(result).toMatchObject({ ok: true, submissionCreated: true, withdrawalLifted: false, withdrawn: false });
    const [sub] = await sql<{ status: string; consent_at: Date | null; consent_method: string; consent_note: string; withdrawn_at: Date | null }>(
      "select status, consent_at, consent_method, consent_note, withdrawn_at from submissions where candidate_id = $1 and mandate_id = $2",
      [ids.anna, ids.open],
    );
    expect(sub).toMatchObject({ status: "vorgemerkt", consent_method: "portal", withdrawn_at: null });
    expect(sub.consent_at).not.toBeNull();
    expect(sub.consent_note).toMatch(/^Im Kandidatenportal bestätigt am /);
    const [share] = await sql<{ response: string; reviewed_at: Date | null; response_message: string }>(
      "select response, reviewed_at, response_message from vacancy_shares where candidate_id = $1 and mandate_id = $2",
      [ids.anna, ids.open],
    );
    expect(share).toMatchObject({ response: "interessiert", reviewed_at: null, response_message: "Ab Januar verfügbar." });
    expect((await m.admin.portalCounts()).interest).toBe(1);
    expect((await m.admin.openInterests()).map((s) => s.candidateId)).toEqual([ids.anna]);
    expect((await m.admin.openInterests())[0]).toMatchObject({ consentMethod: "portal", withdrawnAt: null, objectionAt: null });
  });

  type ConsentRow = { status: string; consent_at: Date | null; consent_method: string | null; withdrawn_at: Date | null; withdrawal_note: string | null };
  const consentRow = async (candidateId: number) =>
    (
      await sql<ConsentRow>("select status, consent_at, consent_method, withdrawn_at, withdrawal_note from submissions where candidate_id = $1 and mandate_id = $2", [
        candidateId,
        ids.open,
      ])
    )[0];

  it("withdraws in the portal and lifts the withdrawal with new interest while the profile is not sent", async () => {
    const withdrawn = await m.vac.answerVacancy(ids.anna, ids.open, { response: "kein_interesse", message: null });
    expect(withdrawn).toMatchObject({ ok: true, withdrawn: true, alreadySubmitted: false });
    let sub = await consentRow(ids.anna);
    // The consent date stays as record; withdrawn_at blocks the hand-over.
    expect(sub).toMatchObject({ status: "zurueckgezogen", consent_method: "portal", withdrawal_note: m.vac.PORTAL_WITHDRAWAL_NOTE });
    expect(sub.consent_at).not.toBeNull();
    expect(sub.withdrawn_at).not.toBeNull();
    expect((await m.vac.getVisibleVacancy(ids.anna, ids.open))?.withdrawnAt).not.toBeNull();
    // Answering "kein Interesse" twice changes nothing.
    expect(await m.vac.answerVacancy(ids.anna, ids.open, { response: "kein_interesse", message: null })).toMatchObject({ ok: true, withdrawn: false });

    const again = await m.vac.answerVacancy(ids.anna, ids.open, { response: "interessiert", consent: true, message: null });
    expect(again).toMatchObject({ ok: true, submissionCreated: false, consentRecorded: true, withdrawalLifted: true, withdrawalKept: false });
    sub = await consentRow(ids.anna);
    expect(sub).toMatchObject({ status: "vorgemerkt", consent_method: "portal", withdrawn_at: null, withdrawal_note: null });
  });

  it("keeps used consent on record and blocks any further hand-over after a late withdrawal", async () => {
    // Ferhat submits the profile, then the candidate withdraws in the portal.
    await sql("update submissions set submitted_at = now(), status = 'vorgeschlagen' where candidate_id = $1", [ids.anna]);
    const late = await m.vac.answerVacancy(ids.anna, ids.open, { response: "kein_interesse", message: null });
    expect(late).toMatchObject({ ok: true, withdrawn: true, alreadySubmitted: true });
    let sub = await consentRow(ids.anna);
    expect(sub).toMatchObject({ status: "vorgeschlagen", consent_method: "portal", withdrawal_note: "Im Kandidatenportal zurückgezogen" });
    expect(sub.consent_at).not.toBeNull();
    expect(sub.withdrawn_at).not.toBeNull();
    expect((await m.admin.openWithdrawals()).map((s) => s.candidateId)).toEqual([ids.anna]);
    // The withdrawal needs a look: it counts in the badge, the Interesse tab and the candidate card.
    const counts = await m.admin.portalCounts();
    expect(counts).toMatchObject({ interest: 0, withdrawals: 1, answers: 1 });
    expect(counts.total).toBe(counts.changes + counts.uploads + 1);
    expect(await m.admin.portalCounts(ids.anna)).toMatchObject({ interest: 0, withdrawals: 1 });
    expect(await m.admin.portalCounts(ids.beat)).toMatchObject({ interest: 0, withdrawals: 0 });

    // The admin side refuses the next step towards the client.
    const { markSubmissionStatus } = await import("@/lib/admin/data/submissions");
    const [{ id }] = await sql<{ id: number }>("select id from submissions where candidate_id = $1 and mandate_id = $2", [ids.anna, ids.open]);
    expect(await markSubmissionStatus(Number(id), { status: "interview", submittedAt: sub.consent_at, toClient: true })).toBe(false);
    expect((await consentRow(ids.anna)).status).toBe("vorgeschlagen");

    // New interest does not lift a withdrawal once the profile was sent: Ferhat decides.
    const again = await m.vac.answerVacancy(ids.anna, ids.open, { response: "interessiert", consent: true, message: null });
    expect(again).toMatchObject({ ok: true, withdrawalKept: true, withdrawalLifted: false, consentRecorded: false });
    sub = await consentRow(ids.anna);
    expect(sub.withdrawn_at).not.toBeNull();
  });

  it("blocks interest while KOVALI has recorded an objection", async () => {
    await sql("update candidates set objection_at = now(), objection_note = 'E-Mail' where id = $1", [ids.beat]);
    expect((await m.vac.getVisibleVacancy(ids.beat, ids.open))?.objection).toBe(true);
    const blocked = await m.vac.answerVacancy(ids.beat, ids.open, { response: "interessiert", consent: true, message: null });
    expect(blocked).toEqual({ ok: false, reason: "objection" });
    expect(await sql("select 1 from submissions where candidate_id = $1", [ids.beat])).toHaveLength(0);
    // "Kein Interesse" is still possible; there is nothing to withdraw.
    expect(await m.vac.answerVacancy(ids.beat, ids.open, { response: "kein_interesse", message: null })).toMatchObject({ ok: true, withdrawn: false });
    await sql("update candidates set objection_at = null, objection_note = null where id = $1", [ids.beat]);
    expect((await m.vac.getVisibleVacancy(ids.beat, ids.open))?.objection).toBe(false);
  });

  // --- Change requests --------------------------------------------------------------

  it("keeps one open request per section and withdraws when nothing changed", async () => {
    const first = await m.cr.saveSectionRequest(ids.anna, "profil", { headline: "Senior BA", summary: null }, null);
    const second = await m.cr.saveSectionRequest(ids.anna, "profil", { headline: "Senior Business Analyst", summary: "Banking" }, "Neu");
    expect(first.status).toBe("saved");
    expect(second.status).toBe("saved");
    if (first.status !== "saved" || second.status !== "saved") return;
    expect(second.id).toBe(first.id);
    const open = await sql<{ payload: { headline: string } }>("select payload from change_requests where candidate_id = $1 and section = 'profil' and status = 'offen'", [ids.anna]);
    expect(open).toHaveLength(1);
    expect(open[0].payload.headline).toBe("Senior Business Analyst");

    const state = await m.cr.sectionState(ids.anna, "profil");
    expect(state?.pending?.headline).toBe("Senior Business Analyst");
    expect(state?.current.headline).toBeNull();

    const unchanged = await m.cr.saveSectionRequest(ids.anna, "profil", { headline: null, summary: null }, null);
    expect(unchanged).toEqual({ status: "unchanged", withdrawn: true });
  });

  it("does not let a candidate touch another candidate's request", async () => {
    const saved = await m.cr.saveSectionRequest(ids.anna, "sprachen", { languages: [{ language: "Deutsch", level: "muttersprache" }] }, null);
    if (saved.status !== "saved") throw new Error("not saved");
    expect(await m.cr.withdrawRequest(ids.beat, saved.id)).toBeNull();
    expect(await m.cr.withdrawCard(ids.beat, "sprachen", saved.id)).toBeNull();
    expect(await m.cr.withdrawCard(ids.anna, "profil", saved.id)).toBeNull();
    const [row] = await sql<{ status: string }>("select status from change_requests where id = $1", [saved.id]);
    expect(row.status).toBe("offen");
    expect(await m.cr.withdrawCard(ids.anna, "sprachen", saved.id)).toEqual({ section: "sprachen" });
  });

  it("confirms a request in one step and normalises skills", async () => {
    const parsed = m.cr && (await import("./profile")).parseSection("kompetenzen", {
      disciplines: '["business-analysis"]',
      skills: '["bpmn","jira","s4hana"]',
      sapModules: "[]",
      certifications: '["IREB CPRE Foundation Level"]',
    });
    if (!parsed?.ok) throw new Error("invalid");
    const saved = await m.cr.saveSectionRequest(ids.anna, "kompetenzen", parsed.data, null);
    if (saved.status !== "saved") throw new Error("not saved");
    const result = await m.cr.confirmRequest(saved.id);
    expect(result).toMatchObject({ ok: true, candidateId: ids.anna, section: "kompetenzen" });
    const [cand] = await sql<{ skills: string[]; disciplines: string[] }>("select skills, disciplines from candidates where id = $1", [ids.anna]);
    expect(cand.disciplines).toEqual(["business-analysis"]);
    expect(cand.skills).toContain("BPMN");
    expect(cand.skills).toContain("Jira");
    expect(cand.skills.some((s) => /S\/4HANA/i.test(s))).toBe(true);
    expect(await m.cr.confirmRequest(saved.id)).toMatchObject({ ok: false });
  });

  it("creates the firm on confirmation and updates it the next time", async () => {
    const { parseSection } = await import("./profile");
    const firm = { name: "Beispiel Consulting GmbH", legalForm: "GmbH", uid: "CHE123456789", street: "Musterweg 1", postalCode: "4500", city: "Solothurn", country: "" };
    const base = (await m.cr.sectionState(ids.anna, "verfuegbarkeit"))!.current;
    const parsed = parseSection("verfuegbarkeit", { ...base, rateAmount: "120", rateUnit: "stunde", firm });
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    expect(parsed.data.firm?.uid).toBe("CHE-123.456.789");
    const saved = await m.cr.saveSectionRequest(ids.anna, "verfuegbarkeit", parsed.data, null);
    if (saved.status !== "saved") throw new Error("not saved");

    // Withdrawing only the firm card keeps the availability part of the request.
    expect(await m.cr.withdrawCard(ids.anna, "firma", saved.id)).toEqual({ section: "verfuegbarkeit" });
    let state = await m.cr.sectionState(ids.anna, "verfuegbarkeit");
    expect(state?.pending?.firm).toBeNull();
    expect(state?.pending?.rateAmount).toBe(120);

    await m.cr.saveSectionRequest(ids.anna, "verfuegbarkeit", parsed.data, null);
    const reviews = await m.admin.openChangeReviews();
    const review = reviews.find((r) => r.id === saved.id);
    expect(review?.firmProposed).toBe(true);
    expect(review?.diff?.map((d) => d.label)).toEqual(expect.arrayContaining(["Satzvorstellung", "Firma", "UID"]));

    const confirmed = await m.cr.confirmRequest(saved.id);
    expect(confirmed).toMatchObject({ ok: true, firm: { created: true, name: "Beispiel Consulting GmbH" } });
    const [cand] = await sql<{ company_id: number; engagement: string; rate_amount: string }>("select company_id, engagement, rate_amount from candidates where id = $1", [ids.anna]);
    const [company] = await sql<{ kind: string; uid: string; city: string }>("select kind, uid, city from companies where id = $1", [cand.company_id]);
    expect(company).toEqual({ kind: "subunternehmer", uid: "CHE-123.456.789", city: "Solothurn" });
    expect(cand.engagement).toBe("selbstaendig");
    expect(await m.data.hasConfirmedFirm(ids.anna)).toBe(true);
    expect(await m.data.hasConfirmedFirm(ids.beat)).toBe(false);

    state = await m.cr.sectionState(ids.anna, "verfuegbarkeit");
    expect(state?.pending).toBeNull();
    const moved = parseSection("verfuegbarkeit", { ...state!.current, firm: { ...firm, city: "Grenchen" } });
    if (!moved.ok) throw new Error("invalid");
    const again = await m.cr.saveSectionRequest(ids.anna, "verfuegbarkeit", moved.data, null);
    if (again.status !== "saved") throw new Error("not saved");
    expect(await m.cr.confirmRequest(again.id)).toMatchObject({ ok: true, firm: { created: false, companyId: Number(cand.company_id) } });
    expect((await sql("select 1 from companies"))).toHaveLength(1);
  });

  it("never overwrites another firm's record when a firm is confirmed", async () => {
    const { parseSection } = await import("./profile");
    type CompanyRow = { name: string; uid: string | null; city: string | null; kind: string };
    const company = async (id: number) => (await sql<CompanyRow>("select name, uid, city, kind from companies where id = $1", [id]))[0];
    const companyOf = async (candidateId: number) => Number((await sql<{ company_id: string }>("select company_id from candidates where id = $1", [candidateId]))[0].company_id);
    const propose = async (candidateId: number, firm: Record<string, string>) => {
      const base = (await m.cr.sectionState(candidateId, "verfuegbarkeit"))!.current;
      const parsed = parseSection("verfuegbarkeit", { ...base, firm });
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
      const saved = await m.cr.saveSectionRequest(candidateId, "verfuegbarkeit", parsed.data, null);
      if (saved.status !== "saved") throw new Error("not saved");
      return saved.id;
    };
    const annaFirm = await companyOf(ids.anna);
    const before = await company(annaFirm);
    expect(before).toMatchObject({ name: "Beispiel Consulting GmbH", uid: "CHE-123.456.789", city: "Grenchen" });

    // Beat proposes a firm with the (public) UID of Anna's firm: linked only, Anna's record stays.
    const other = { name: "Fremde Consulting GmbH", legalForm: "GmbH", uid: "CHE-123.456.789", street: "Andere Strasse 9", postalCode: "4000", city: "Basel", country: "" };
    const beatRequest = await propose(ids.beat, other);
    const review = (await m.admin.openChangeReviews()).find((r) => r.id === beatRequest);
    expect(review?.firmPlan).toEqual({ action: "link", target: { id: annaFirm, name: "Beispiel Consulting GmbH" }, others: 1, previous: null });
    expect(await m.cr.confirmRequest(beatRequest)).toMatchObject({ ok: true, firm: { companyId: annaFirm, created: false, reused: true, others: 1 } });
    expect(await company(annaFirm)).toEqual(before);
    expect(await companyOf(ids.beat)).toBe(annaFirm);

    // Anna corrects the address of her firm, which is now shared with Beat: not applied in place.
    const moved = await propose(ids.anna, { ...other, name: "Beispiel Consulting GmbH", city: "Olten" });
    expect((await m.cr.confirmRequest(moved)).ok).toBe(true);
    expect(await company(annaFirm)).toEqual(before);

    // Anna proposes a different firm (another UID): the old record stays, a new one is created and linked.
    const newFirm = { name: "Neue Beispiel GmbH", legalForm: "GmbH", uid: "CHE-987.654.321", street: "Neuweg 2", postalCode: "4500", city: "Solothurn", country: "" };
    const changed = await propose(ids.anna, newFirm);
    expect((await m.admin.openChangeReviews()).find((r) => r.id === changed)?.firmPlan).toEqual({
      action: "create",
      target: null,
      others: 0,
      previous: { id: annaFirm, name: "Beispiel Consulting GmbH" },
    });
    const created = await m.cr.confirmRequest(changed);
    expect(created).toMatchObject({ ok: true, firm: { created: true, reused: false, name: "Neue Beispiel GmbH" } });
    expect(await company(annaFirm)).toEqual(before);
    const annaNow = await companyOf(ids.anna);
    expect(annaNow).not.toBe(annaFirm);
    expect(await company(annaNow)).toEqual({ name: "Neue Beispiel GmbH", uid: "CHE-987.654.321", city: "Solothurn", kind: "subunternehmer" });
    expect(await companyOf(ids.beat)).toBe(annaFirm);

    // A candidate wrongly linked to a client: the client's record is never touched.
    const [client] = await sql<{ id: string }>("insert into companies (name, kind) values ('Kundin AG', 'auftraggeber') returning id");
    await sql("update candidates set company_id = $1 where id = $2", [client.id, ids.carla]);
    const carla = await propose(ids.carla, { ...newFirm, name: "Carla Test GmbH", uid: "CHE-555.444.333" });
    expect(await m.cr.confirmRequest(carla)).toMatchObject({ ok: true, firm: { created: true } });
    expect(await company(Number(client.id))).toEqual({ name: "Kundin AG", uid: null, city: null, kind: "auftraggeber" });
    expect(await companyOf(ids.carla)).not.toBe(Number(client.id));
  });

  it("lets the availability card save when the linked firm is incomplete", async () => {
    const [firm] = await sql<{ id: string }>("insert into companies (name, kind, legal_form) values ('Unvollständig Einzelfirma', 'subunternehmer', 'Einzelfirma') returning id");
    const [person] = await sql<{ id: string }>("insert into candidates (first_name, last_name, status, company_id, workload_min) values ('Dora', 'Beispiel', 'aktiv', $1, 60) returning id", [firm.id]);
    const id = Number(person.id);
    const { mergeCard, parseSection } = await import("./profile");
    const state = await m.cr.sectionState(id, "verfuegbarkeit");
    expect(state?.current.firm).toBeNull();
    expect(state?.firmDraft).toMatchObject({ name: "Unvollständig Einzelfirma", legalForm: "Einzelfirma" });
    const parsed = parseSection("verfuegbarkeit", mergeCard("verfuegbarkeit", state!.current as Record<string, unknown>, { availableFrom: "2026-12-01", workloadMin: "60" }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.firm).toBeNull();
    const saved = await m.cr.saveSectionRequest(id, "verfuegbarkeit", parsed.data, null);
    expect(saved.status).toBe("saved");
    const cards = await m.cr.profileCards(id);
    expect(cards?.cards.firma.draft).toMatchObject({ firm: { name: "Unvollständig Einzelfirma" } });
    expect(cards?.cards.verfuegbarkeit.pending).toMatchObject({ availableFrom: "2026-12-01" });
    // Confirming the availability leaves the company alone.
    if (saved.status !== "saved") return;
    expect(await m.cr.confirmRequest(saved.id)).toMatchObject({ ok: true, firm: undefined });
    expect((await sql<{ name: string }>("select name from companies where id = $1", [firm.id]))[0].name).toBe("Unvollständig Einzelfirma");
  });

  it("shows the rejection note on the card", async () => {
    const saved = await m.cr.saveSectionRequest(ids.beat, "ausbildung", { education: [{ title: "Dr. Unbekannt", institution: "", year: "" }] }, null);
    if (saved.status !== "saved") throw new Error("not saved");
    expect(await m.cr.rejectRequest(saved.id, "Bitte mit Institution erfassen.")).toMatchObject({ ok: true });
    const cards = await m.cr.profileCards(ids.beat);
    expect(cards?.cards.ausbildung.pending).toBeNull();
    expect(cards?.cards.ausbildung.rejected?.note).toBe("Bitte mit Institution erfassen.");
  });

  it("collects master-data messages in one open request", async () => {
    const a = await m.cr.saveStammdatenRequest(ids.beat, "Neue Adresse: Musterweg 3");
    const b = await m.cr.saveStammdatenRequest(ids.beat, "Und neue Telefonnummer");
    expect(b).toBe(a);
    const [row] = await sql<{ message: string }>("select message from change_requests where id = $1", [a]);
    expect(row.message).toMatch(/Musterweg 3[\s\S]*Nachtrag vom [\s\S]*Telefonnummer/);
    expect(await m.cr.confirmRequest(a)).toMatchObject({ ok: false });
    expect(await m.cr.completeStammdatenRequest(a, "Erledigt.")).toMatchObject({ ok: true, candidateId: ids.beat });
  });

  // --- Documents ------------------------------------------------------------------

  it("serves and deletes only the candidate's own unconfirmed uploads", async () => {
    const file = { ok: true as const, content: Buffer.from("%PDF-1.4 fiktives Zeugnis"), kind: "pdf" as const, mimeType: "application/pdf", filename: "zeugnis.pdf" };
    const own = await m.docs.storeDocument({ owner: { candidateId: ids.anna }, kind: "zeugnis", file, uploadedBy: "kandidat" });
    const byAdmin = await m.docs.storeDocument({ owner: { candidateId: ids.anna }, kind: "zeugnis", file: { ...file, filename: "intern.pdf" } });
    expect((await m.admin.portalCounts()).uploads).toBe(1);

    expect((await m.data.ownUploads(ids.anna)).map((d) => d.id)).toEqual([own.id]);
    expect(await m.data.loadOwnUpload(ids.beat, own.id)).toBeNull();
    expect(await m.data.loadOwnUpload(ids.anna, byAdmin.id)).toBeNull();
    expect((await m.data.loadOwnUpload(ids.anna, own.id))?.plain.toString()).toContain("fiktives Zeugnis");
    expect(await m.data.deleteOwnUpload(ids.beat, own.id)).toBeNull();
    expect(await m.data.deleteOwnUpload(ids.anna, byAdmin.id)).toBeNull();

    await sql("update documents set confirmed_at = now() where id = $1", [own.id]);
    expect(await m.data.deleteOwnUpload(ids.anna, own.id)).toBeNull();
    expect(await m.data.pendingUploadCount(ids.anna)).toBe(0);

    const second = await m.docs.storeDocument({ owner: { candidateId: ids.anna }, kind: "zeugnis", file, uploadedBy: "kandidat" });
    expect(await m.data.deleteOwnUpload(ids.anna, second.id)).toMatchObject({ id: second.id });
  });

  // --- Accounts ---------------------------------------------------------------------

  it("runs invitation, login, reset and lock", async () => {
    const invite = await m.acc.createInvitation(ids.beat, "Beat.Muster@Example.ch");
    if (!invite.ok) throw new Error(invite.error);
    expect(invite.link.email).toBe("beat.muster@example.ch");
    expect(await m.acc.createInvitation(ids.beat, "anders@example.ch")).toEqual({ ok: false, error: "account_exists" });
    expect(await m.acc.createInvitation(ids.anna, "beat.muster@example.ch")).toEqual({ ok: false, error: "email_taken" });

    // Only the hash is stored.
    const [stored] = await sql<{ token_hash: string }>("select token_hash from candidate_accounts where id = $1", [invite.link.accountId]);
    expect(stored.token_hash).not.toBe(invite.link.token);
    expect(stored.token_hash).toHaveLength(64);

    expect(await m.acc.findLinkAccount(invite.link.token, "reset")).toBeNull();
    expect(await m.acc.findLinkAccount(invite.link.token, "einladung")).toMatchObject({ candidateId: ids.beat });
    expect(await m.acc.authenticate("beat.muster@example.ch", "irgendwas-langes")).toBeNull();
    expect(await m.acc.createResetLink("beat.muster@example.ch")).toBeNull();

    const password = "Sonnige Tage am Weissenstein";
    expect(await m.acc.redeemLink(invite.link.token, "einladung", password)).toEqual({ accountId: invite.link.accountId, candidateId: ids.beat });
    expect(await m.acc.redeemLink(invite.link.token, "einladung", password)).toBeNull();
    const [cand] = await sql<{ privacy_info_at: Date | null }>("select privacy_info_at from candidates where id = $1", [ids.beat]);
    expect(cand.privacy_info_at).not.toBeNull();

    expect(await m.acc.authenticate(" BEAT.muster@example.ch ", password)).toMatchObject({ candidateId: ids.beat });
    expect(await m.acc.authenticate("beat.muster@example.ch", "falsches Passwort 123")).toBeNull();
    expect(await m.acc.authenticate("niemand@example.ch", password)).toBeNull();

    const reset = await m.acc.createResetLink("beat.muster@example.ch");
    expect(reset).not.toBeNull();
    expect(await m.acc.createResetLink("beat.muster@example.ch")).toBeNull(); // throttled
    await sql("insert into candidate_sessions (id, account_id, expires_at) values ('s1', $1, now() + interval '1 day')", [invite.link.accountId]);
    const newPassword = "Neues Passwort fuer Beat";
    expect(await m.acc.redeemLink(reset!.token, "reset", newPassword)).toMatchObject({ candidateId: ids.beat });
    expect(await sql("select 1 from candidate_sessions where account_id = $1", [invite.link.accountId])).toHaveLength(0);
    expect(await m.acc.authenticate("beat.muster@example.ch", password)).toBeNull();
    expect(await m.acc.authenticate("beat.muster@example.ch", newPassword)).not.toBeNull();

    // An expired link does not work.
    const renewed = await m.acc.renewLink(invite.link.accountId);
    await sql("update candidate_accounts set token_expires_at = now() - interval '1 minute' where id = $1", [invite.link.accountId]);
    expect(await m.acc.redeemLink(renewed!.token, "einladung", "Noch ein Passwort 123")).toBeNull();

    // Locking ends sessions and blocks login, reset and new links.
    await sql("insert into candidate_sessions (id, account_id, expires_at) values ('s2', $1, now() + interval '1 day')", [invite.link.accountId]);
    expect(await m.acc.setAccountLocked(invite.link.accountId, true)).toMatchObject({ status: "gesperrt" });
    expect(await sql("select 1 from candidate_sessions where account_id = $1", [invite.link.accountId])).toHaveLength(0);
    expect(await m.acc.authenticate("beat.muster@example.ch", newPassword)).toBeNull();
    expect(await m.acc.createResetLink("beat.muster@example.ch")).toBeNull();
    expect(await m.acc.renewLink(invite.link.accountId)).toBeNull();
    expect(await m.acc.setAccountLocked(invite.link.accountId, false)).toMatchObject({ status: "aktiv" });
    expect(await m.acc.authenticate("beat.muster@example.ch", newPassword)).not.toBeNull();

    expect((await m.admin.listAccounts()).map((a) => a.candidateId)).toEqual([ids.beat]);
    expect(await m.acc.deleteAccount(invite.link.accountId)).toMatchObject({ candidateId: ids.beat });
    expect(await m.acc.authenticate("beat.muster@example.ch", newPassword)).toBeNull();
  }, 30_000);
});
