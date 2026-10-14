import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Queries of the Mandate module against a real Postgres (TEST_DATABASE_URL, wiped here):
 * list filters and counts, the subcontractor rule, consent, withdrawals per mandate, the
 * candidate's objection and the consent constraint.
 * Fictional sample data only.
 */

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("mandate data", () => {
  const client = new Client({ connectionString: url });
  // Loaded after DATABASE_URL points at the test database (the env is read on import).
  let mandatesData: typeof import("@/lib/admin/data/mandates");
  let submissionsData: typeof import("@/lib/admin/data/submissions");
  let getDb: typeof import("@/lib/admin/db/client").getDb;
  let schema: typeof import("@/lib/admin/db/schema");

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    process.env.DATABASE_URL = url;
    ({ getDb } = await import("@/lib/admin/db/client"));
    mandatesData = await import("@/lib/admin/data/mandates");
    submissionsData = await import("@/lib/admin/data/submissions");
    schema = await import("@/lib/admin/db/schema");
    const db = await getDb();
    // Identity columns: a freshly created schema numbers rows from 1 in insertion order.
    const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
    expect(
      ids(
        await db
          .insert(schema.companies)
          .values([
            { name: "Alpenblick Consulting AG", kind: "auftraggeber", legalForm: "AG" },
            { name: "Muster Daten GmbH", kind: "subunternehmer", legalForm: "GmbH" },
            { name: "Beispiel Informatik", kind: "subunternehmer", legalForm: "Einzelunternehmen" },
          ])
          .returning({ id: schema.companies.id }),
      ),
    ).toEqual([1, 2, 3]);
    expect(
      ids(
        await db
          .insert(schema.candidates)
          .values([
            { firstName: "Lea", lastName: "Probst", companyId: 2 },
            { firstName: "Jonas", lastName: "Fiktiv", companyId: 3 },
            { firstName: "Mia", lastName: "Ohnefirma" },
            { firstName: "Tim", lastName: "Kunde", companyId: 1 },
          ])
          .returning({ id: schema.candidates.id }),
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(
      ids(
        await db
          .insert(schema.mandates)
          .values([
            { title: "Cloud Architekt", companyId: 1, status: "neu", priority: "hoch", deadline: "2026-10-20", rateUnit: "stunde" },
            { title: "Testmanager Bank", companyId: 1, status: "gewonnen", closedAt: new Date("2026-10-01T10:00:00Z"), rateUnit: "stunde" },
            { title: "SAP Basis", endClient: "Seeblick Versicherung", status: "pausiert", rateUnit: "tag" },
            { title: "Scrum Master", companyId: 1, status: "interview", priority: "tief", rateUnit: "stunde" },
          ])
          .returning({ id: schema.mandates.id }),
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  afterAll(async () => {
    await client.end();
    const state = globalThis.__kovaliAdminDb;
    globalThis.__kovaliAdminDb = undefined;
    await state?.pool.end();
  });

  it("counts statuses and filters by company, priority and search", async () => {
    expect(await mandatesData.mandateStatusCounts({})).toEqual({ neu: 1, gewonnen: 1, pausiert: 1, interview: 1 });
    expect(await mandatesData.mandateStatusCounts({ companyId: 1 })).toEqual({ neu: 1, gewonnen: 1, interview: 1 });
    const open = await mandatesData.listMandates({ statuses: ["neu", "in_bearbeitung", "angeboten", "interview"], page: 1 });
    // Open mandates by urgency: high priority first.
    expect(open.rows.map((r) => r.id)).toEqual([1, 4]);
    expect((await mandatesData.listMandates({ priority: "tief", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([4]);
    expect((await mandatesData.listMandates({ q: "seeblick", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([3]);
    expect((await mandatesData.listMandates({ q: "M-0002", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([2]);
    expect((await mandatesData.listMandates({ q: "alpenblick", statuses: ["gewonnen"], page: 1 })).total).toBe(1);
    expect(await mandatesData.mandateCompanyOptions()).toEqual([{ value: 1, label: "Alpenblick Consulting AG" }]);
  });

  it("finds the same mandates in the list as in the global search", async () => {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const { searchAll } = await import("@/lib/admin/data/search");
    await db.update(schema.mandates).set({ description: "Migration auf S/4HANA im Finanzbereich" }).where(eq(schema.mandates.id, 2));
    // The description of a won mandate: "Alle anzeigen" opens the list with status "alle".
    expect((await searchAll("s/4hana"))?.mandates).toMatchObject({ total: 1, rows: [{ id: 2 }] });
    expect((await mandatesData.listMandates({ q: "s/4hana", statuses: null, page: 1 })).rows.map((r) => r.id)).toEqual([2]);
    // The client's name finds its mandates in both.
    const list = await mandatesData.listMandates({ q: "alpenblick", statuses: null, page: 1 });
    const global = await searchAll("alpenblick");
    expect(list.total).toBe(3);
    expect(global?.mandates.total).toBe(3);
    expect(global?.mandates.rows.map((r) => r.id).sort()).toEqual(list.rows.map((r) => r.id).sort());
  });

  it("counts contacts and open mandates per company in the company list", async () => {
    const db = await getDb();
    // Contact ids deliberately differ from company ids: an unqualified "id" in the subquery would match wrongly.
    await db.insert(schema.contacts).values([
      { companyId: 2, firstName: "Erste", lastName: "Person" },
      { companyId: 1, firstName: "Zweite", lastName: "Person" },
      { companyId: 1, firstName: "Dritte", lastName: "Person" },
    ]);
    const { listCompanies } = await import("@/lib/admin/data/companies");
    const { rows } = await listCompanies({ page: 1 });
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(1)).toMatchObject({ contacts: 2, openMandates: 2 });
    expect(byId.get(2)).toMatchObject({ contacts: 1, openMandates: 0 });
    expect(byId.get(3)).toMatchObject({ contacts: 0, openMandates: 0 });
  });

  it("passes candidates on only through their own subcontractor firm", async () => {
    const { candidateFirm, subcontractorCheck, NO_OWN_FIRM, SOLE_PROPRIETOR_WARNING } = submissionsData;
    expect(subcontractorCheck(await candidateFirm(1))).toMatchObject({ ok: true, warning: null, firm: { name: "Muster Daten GmbH" } });
    expect(subcontractorCheck(await candidateFirm(2))).toMatchObject({ ok: true, warning: SOLE_PROPRIETOR_WARNING });
    expect(subcontractorCheck(await candidateFirm(3))).toEqual({ ok: false, error: NO_OWN_FIRM });
    // A client company is not the candidate's own firm.
    expect(subcontractorCheck(await candidateFirm(4))).toEqual({ ok: false, error: NO_OWN_FIRM });
  });

  it("refuses a hand-over without consent in the database itself", async () => {
    const db = await getDb();
    const error = await db
      .insert(schema.submissions)
      .values({ mandateId: 1, candidateId: 1, status: "vorgeschlagen", submittedAt: new Date() })
      .then(() => null)
      .catch((e: unknown) => e);
    // The actions detect the violation by its constraint name somewhere in the cause chain.
    const constraints: unknown[] = [];
    for (let e: unknown = error, depth = 0; e && typeof e === "object" && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
      constraints.push((e as { constraint?: unknown }).constraint);
    }
    expect(constraints).toContain("submissions_consent_before_submit");
  });

  it("lists submissions with their firm and finds the latest withdrawal", async () => {
    const db = await getDb();
    await db.insert(schema.submissions).values([
      {
        mandateId: 1,
        candidateId: 1,
        consentAt: new Date("2026-10-02T12:00:00Z"),
        consentMethod: "email",
        submittedAt: new Date("2026-10-03T08:00:00Z"),
        subcontractorCompanyId: 2,
        status: "vorgeschlagen",
        matchScore: 80,
      },
      { mandateId: 1, candidateId: 2, withdrawnAt: new Date("2026-10-05T12:00:00Z"), withdrawalNote: "E-Mail", status: "zurueckgezogen", matchScore: 60 },
      { mandateId: 4, candidateId: 2, status: "einwilligung_offen" },
    ]);
    const list = await submissionsData.listMandateSubmissions(1);
    expect(list.map((s) => [s.candidateId, s.firmName, s.subcontractorName])).toEqual([
      [1, "Muster Daten GmbH", "Muster Daten GmbH"],
      [2, "Beispiel Informatik", null],
    ]);
    const withdrawals = await submissionsData.candidateWithdrawals([1, 2, 3]);
    expect([...withdrawals.keys()]).toEqual([2]);
    expect(withdrawals.get(2)).toEqual({
      objection: null,
      latestWithdrawal: { at: new Date("2026-10-05T12:00:00Z"), mandateId: 1, note: "E-Mail" },
    });
    expect((await submissionsData.listCandidateSubmissions(2)).length).toBe(2);
  });

  /** Inserts a submission and returns its id (identity values skip after failed inserts). */
  async function addSubmission(values: Omit<typeof import("@/lib/admin/db/schema").submissions.$inferInsert, "id">): Promise<number> {
    const db = await getDb();
    const [row] = await db.insert(schema.submissions).values(values).returning({ id: schema.submissions.id });
    return row.id;
  }

  async function submissionRow(id: number) {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    return row;
  }

  async function objectionOf(candidateId: number) {
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ at: schema.candidates.objectionAt, note: schema.candidates.objectionNote })
      .from(schema.candidates)
      .where(eq(schema.candidates.id, candidateId));
    return row;
  }

  const consent = new Date("2026-10-06T12:00:00Z");
  let leaOpen = 0;
  let leaOther = 0;

  it("withdraws consent for one mandate only and keeps the consent date", async () => {
    // Lea (1) is already proposed for M-0001; here she withdraws for M-0004 only.
    leaOpen = await addSubmission({ mandateId: 4, candidateId: 1, consentAt: consent, consentMethod: "schriftlich", status: "vorgemerkt" });
    leaOther = await addSubmission({ mandateId: 3, candidateId: 1, status: "vorgemerkt" });
    const at = new Date("2026-10-07T12:00:00Z");
    expect(await submissionsData.withdrawSubmission(leaOpen, { at, note: "E-Mail: möchte nicht", allMandates: false })).toEqual({ others: [] });
    expect(await submissionRow(leaOpen)).toMatchObject({
      withdrawnAt: at,
      withdrawalNote: "E-Mail: möchte nicht",
      status: "zurueckgezogen",
      consentAt: consent,
      consentMethod: "schriftlich",
    });
    // Recorded once; the other mandates and the candidate stay untouched.
    expect(await submissionsData.withdrawSubmission(leaOpen, { at, note: null, allMandates: false })).toBeNull();
    expect(await submissionRow(leaOther)).toMatchObject({ withdrawnAt: null, status: "vorgemerkt" });
    expect((await submissionsData.listCandidateSubmissions(1)).filter((s) => s.withdrawnAt).map((s) => s.mandateId)).toEqual([4]);
    expect((await objectionOf(1)).at).toBeNull();
    expect((await submissionsData.candidateWithdrawals([1])).get(1)).toEqual({ objection: null, latestWithdrawal: { at, mandateId: 4, note: "E-Mail: möchte nicht" } });
    // No hand-over of the withdrawn submission, even if the page was open before.
    expect(await submissionsData.markSubmissionStatus(leaOpen, { status: "vorgeschlagen", submittedAt: new Date(), toClient: true })).toBe(false);
    expect((await submissionRow(leaOpen)).submittedAt).toBeNull();
  });

  it("renews consent after a withdrawal and stores the firm at the hand-over", async () => {
    const at = new Date("2026-10-08T12:00:00Z");
    expect(await submissionsData.giveSubmissionConsent(leaOpen, { at, method: "muendlich", note: "Telefon 08.10.2026", scope: "anonym" })).toEqual({
      status: "vorgemerkt",
      withdrawalLifted: { at: new Date("2026-10-07T12:00:00Z"), note: "E-Mail: möchte nicht" },
      objectionLifted: null,
    });
    expect(await submissionRow(leaOpen)).toMatchObject({
      consentAt: at,
      consentMethod: "muendlich",
      consentNote: "Telefon 08.10.2026",
      consentScope: "anonym",
      withdrawnAt: null,
      withdrawalNote: null,
    });
    const submittedAt = new Date("2026-10-09T08:00:00Z");
    expect(await submissionsData.markSubmissionStatus(leaOpen, { status: "vorgeschlagen", submittedAt, subcontractorCompanyId: 2, toClient: true })).toBe(true);
    expect(await submissionRow(leaOpen)).toMatchObject({ status: "vorgeschlagen", submittedAt, subcontractorCompanyId: 2 });
  });

  it("blocks every mandate while the candidate objects, until a new consent or lifting", async () => {
    // Jonas (2): withdrawn for M-0001, waiting for consent on M-0004; proposed for M-0003 and
    // declined by the client for M-0002.
    const proposed = await addSubmission({
      mandateId: 3,
      candidateId: 2,
      consentAt: consent,
      consentMethod: "email",
      submittedAt: new Date("2026-10-06T14:00:00Z"),
      status: "interview",
    });
    const declined = await addSubmission({ mandateId: 2, candidateId: 2, consentAt: consent, consentMethod: "email", status: "absage" });
    const at = new Date("2026-10-10T12:00:00Z");
    const changed = await submissionsData.recordObjection(2, at, "E-Mail: keine Weitergabe mehr");
    expect(changed?.map((c) => [c.mandateId, c.previousStatus, c.status, Boolean(c.submittedAt)]).sort()).toEqual([
      [3, "interview", "interview", true],
      [4, "einwilligung_offen", "zurueckgezogen", false],
    ]);
    expect(await objectionOf(2)).toEqual({ at, note: "E-Mail: keine Weitergabe mehr" });
    expect(await submissionsData.recordObjection(999, at, null)).toBeNull();
    // The earlier withdrawal keeps its own date; the decided submission is left alone.
    expect((await submissionsData.listCandidateSubmissions(2)).map((s) => [s.mandateId, s.withdrawnAt?.toISOString() ?? null]).sort()).toEqual([
      [1, "2026-10-05T12:00:00.000Z"],
      [2, null],
      [3, at.toISOString()],
      [4, at.toISOString()],
    ]);
    // No hand-over anywhere, not even of a submission that is not withdrawn itself.
    expect(await submissionsData.markSubmissionStatus(proposed, { status: "angebot", submittedAt: new Date("2026-10-06T14:00:00Z"), toClient: true })).toBe(
      false,
    );
    expect(await submissionsData.markSubmissionStatus(declined, { status: "vorgeschlagen", submittedAt: new Date(), toClient: true })).toBe(false);
    // Internal statuses stay possible, e.g. closing the submission.
    expect(await submissionsData.markSubmissionStatus(proposed, { status: "zurueckgezogen", submittedAt: new Date("2026-10-06T14:00:00Z"), toClient: false })).toBe(
      true,
    );
    expect((await submissionsData.candidateWithdrawals([2])).get(2)?.objection).toEqual({ at, note: "E-Mail: keine Weitergabe mehr" });
    // The shortlist sees the objection, so the candidate cannot be reserved anywhere.
    expect((await mandatesData.matchCandidateRow(2))?.objectionAt).toEqual(at);

    // A consent dated before the objection does not lift it.
    const pending = (await submissionsData.listCandidateSubmissions(2)).find((s) => s.mandateId === 4)!.id;
    const early = await submissionsData.giveSubmissionConsent(pending, { at: new Date("2026-10-09T12:00:00Z"), method: "email", note: null, scope: "anonym" });
    expect(early?.objectionLifted).toBeNull();
    expect((await objectionOf(2)).at).toEqual(at);
    // An explicit new consent for a mandate on or after the objection lifts it; the other
    // withdrawn submissions stay withdrawn until consent is given there too.
    const renewed = await submissionsData.giveSubmissionConsent(pending, { at: new Date("2026-10-10T15:00:00Z"), method: "schriftlich", note: null, scope: "anonym" });
    expect(renewed).toMatchObject({ status: "vorgemerkt", objectionLifted: { at, note: "E-Mail: keine Weitergabe mehr" } });
    expect(await objectionOf(2)).toEqual({ at: null, note: null });
    expect((await submissionRow(proposed)).withdrawnAt).toEqual(at);
  });

  it("lifts an objection by hand and keeps the withdrawals", async () => {
    const at = new Date("2026-10-11T12:00:00Z");
    const changed = await submissionsData.recordObjection(2, at, "Mündlich: Telefon");
    // Only the submission that was open again (renewed consent on M-0004) is withdrawn now.
    expect(changed?.map((c) => c.mandateId)).toEqual([4]);
    expect(await submissionsData.liftObjection(2)).toEqual({ at, note: "Mündlich: Telefon" });
    expect(await submissionsData.liftObjection(2)).toBeNull();
    expect(await objectionOf(2)).toEqual({ at: null, note: null });
    const pending = (await submissionsData.listCandidateSubmissions(2)).find((s) => s.mandateId === 4)!.id;
    expect((await submissionRow(pending)).withdrawnAt).toEqual(at);
    expect(await submissionsData.markSubmissionStatus(pending, { status: "vorgeschlagen", submittedAt: new Date(), toClient: true })).toBe(false);
  });

  it("records an objection from the withdrawal form for all mandates", async () => {
    const at = new Date("2026-10-12T12:00:00Z");
    // Lea: proposed for M-0001 and M-0004 (after the renewed consent), open for M-0003.
    const first = (await submissionsData.listCandidateSubmissions(1)).find((s) => s.mandateId === 1)!.id;
    const result = await submissionsData.withdrawSubmission(first, { at, note: "Schriftlich", allMandates: true });
    expect(result?.others.map((o) => [o.mandateId, o.status]).sort()).toEqual([
      [3, "zurueckgezogen"],
      [4, "vorgeschlagen"],
    ]);
    expect(await submissionRow(first)).toMatchObject({ withdrawnAt: at, status: "zurueckgezogen" });
    expect(await objectionOf(1)).toEqual({ at, note: "Schriftlich" });
    expect(await submissionRow(leaOther)).toMatchObject({ withdrawnAt: at, status: "zurueckgezogen" });
    // The objection clears what the consents covered.
    expect(await submissionRow(leaOpen)).toMatchObject({ withdrawnAt: at, consentScope: null });
  });

  it("hands over a named dossier only with a consent that covers the name", async () => {
    // Mia (3) said yes in the portal: that covers the anonymised dossier only.
    const portal = new Date("2026-10-06T09:00:00Z");
    const id = await addSubmission({
      mandateId: 1,
      candidateId: 3,
      consentAt: portal,
      consentMethod: "portal",
      consentScope: "anonym",
      profileVariant: "namentlich",
      status: "vorgemerkt",
    });
    expect(await submissionsData.markSubmissionStatus(id, { status: "vorgeschlagen", submittedAt: new Date(), toClient: true })).toBe(false);
    expect((await submissionRow(id)).submittedAt).toBeNull();
    // A scope without consent is refused by the database.
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const error = await db
      .update(schema.submissions)
      .set({ consentAt: null, consentMethod: null, consentNote: null })
      .where(eq(schema.submissions.id, id))
      .then(() => null)
      .catch((e: unknown) => String((e as { cause?: unknown }).cause ?? e));
    expect(error).toContain("submissions_consent_scope_needs_consent");

    // Asked again, she agrees to the name as well.
    const named = new Date("2026-10-07T10:00:00Z");
    expect(await submissionsData.giveSubmissionConsent(id, { at: named, method: "email", note: null, scope: "namentlich" })).toMatchObject({ status: "vorgemerkt" });
    expect(await submissionRow(id)).toMatchObject({ consentAt: named, consentMethod: "email", consentScope: "namentlich" });
    const submittedAt = new Date("2026-10-08T08:00:00Z");
    expect(await submissionsData.markSubmissionStatus(id, { status: "vorgeschlagen", submittedAt, toClient: true })).toBe(true);
    // Later steps of a hand-over already made are not blocked by the scope.
    await db.update(schema.submissions).set({ consentScope: "anonym" }).where(eq(schema.submissions.id, id));
    expect(await submissionsData.markSubmissionStatus(id, { status: "interview", submittedAt, toClient: true })).toBe(true);

    // Withdrawing clears the scope and keeps the consent date as record.
    expect(await submissionsData.withdrawSubmission(id, { at: new Date("2026-10-09T12:00:00Z"), note: null, allMandates: false })).toEqual({ others: [] });
    expect(await submissionRow(id)).toMatchObject({ consentAt: named, consentScope: null, status: "zurueckgezogen" });
  });
});
