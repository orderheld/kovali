import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Server actions of the admin area against a real Postgres (TEST_DATABASE_URL, wiped here):
 * sharing a vacancy, the retention date of the candidate form and deleting a company. The
 * session check, refresh() and redirect() are stubbed; everything else is the real code.
 * Fictional sample data only.
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

describe.skipIf(!url)("admin actions (database)", () => {
  const client = new Client({ connectionString: url });
  const rows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await rows<T>(text, values))[0]!;
  let today = "";
  let addMonthsIso: typeof import("@/lib/admin/format").addMonthsIso;

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    const format = await import("@/lib/admin/format");
    today = format.todayIso();
    addMonthsIso = format.addMonthsIso;
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("logs a vacancy share once per person, with the mandate and the candidate as owners", async () => {
    const { shareWithCandidates } = await import("@/app/admin/(app)/mandate/actions");
    const mandate = await one<{ id: string }>(
      "insert into mandates (title, portal_title, portal_description, portal_visibility) values ('Intern: BA', 'Business Analyst', 'Beschreibung', 'keine') returning id",
    );
    const people = await rows<{ id: string }>(
      "insert into candidates (first_name, last_name, status) values ('Lea', 'Beispiel', 'aktiv'), ('Max', 'Muster', 'aktiv') returning id",
    );
    const ids = people.map((p) => Number(p.id));
    const result = await shareWithCandidates(Number(mandate.id), idle, form({ candidateIds: JSON.stringify(ids) }));
    expect(result).toMatchObject({ status: "success" });

    const acts = await rows<{ candidate_id: string | null; body: string }>("select candidate_id, body from activities where mandate_id = $1 order by id", [mandate.id]);
    expect(acts.map((a) => Number(a.candidate_id))).toEqual(ids);
    expect(acts[0].body).toMatch(/^Vakanz im Kandidatenportal geteilt: «Business Analyst» \(M-\d{4}\) mit Lea Beispiel \(K-\d{4}\)$/);
    // No entry of the mandate alone that names people.
    expect(await rows("select 1 from activities where candidate_id is null")).toEqual([]);

    // Deleting a person takes the entry along; the mandate keeps the other one.
    const { deleteCandidatePermanently } = await import("@/lib/admin/privacy");
    expect(await deleteCandidatePermanently(ids[0])).toBe(true);
    const left = await rows<{ body: string }>("select body from activities where mandate_id = $1", [mandate.id]);
    expect(left.map((a) => a.body).join(" ")).not.toContain("Lea Beispiel");
    expect(left).toHaveLength(1);
  });

  describe("retention date in the candidate form", () => {
    const base = { firstName: "Nora", lastName: "Beispiel", country: "Schweiz", engagement: "offen", status: "neu", source: "netzwerk" };

    it("refuses a date beyond 6 months without consent when creating", async () => {
      const { createCandidate } = await import("@/app/admin/(app)/kandidaten/actions");
      const tooLate = await createCandidate(idle, form({ ...base, retentionUntil: addMonthsIso(today, 30) }));
      expect(tooLate).toMatchObject({ status: "error", errors: { retentionUntil: expect.stringMatching(/Ohne Einwilligung höchstens 6 Monate/) } });
      expect(await rows("select 1 from candidates where first_name = 'Nora'")).toEqual([]);
      // With consent, up to 24 months.
      await createCandidate(idle, form({ ...base, consentAt: today, retentionUntil: addMonthsIso(today, 24) }));
      expect((await one<{ retention_until: string }>("select retention_until::text from candidates where first_name = 'Nora'")).retention_until).toBe(addMonthsIso(today, 24));
    });

    it("checks only a changed date when updating", async () => {
      const { updateCandidate } = await import("@/app/admin/(app)/kandidaten/actions");
      // Extended earlier through the Datenschutz page beyond what the form would accept today.
      const extended = addMonthsIso(today, 30);
      const c = await one<{ id: string }>(
        "insert into candidates (first_name, last_name, source, consent_at, retention_until) values ('Ida', 'Muster', 'netzwerk', now(), $1) returning id",
        [extended],
      );
      const id = Number(c.id);
      const fields = { ...base, firstName: "Ida", lastName: "Muster", consentAt: today };
      expect(await updateCandidate(id, idle, form({ ...fields, city: "Bern", retentionUntil: extended }))).toBeUndefined();
      expect(await one("select city, retention_until::text from candidates where id = $1", [id])).toEqual({ city: "Bern", retention_until: extended });

      const changed = await updateCandidate(id, idle, form({ ...fields, retentionUntil: addMonthsIso(today, 25) }));
      expect(changed).toMatchObject({ status: "error", errors: { retentionUntil: expect.stringMatching(/Mit Einwilligung höchstens 24 Monate/) } });
      // Shortening is always possible.
      expect(await updateCandidate(id, idle, form({ ...fields, retentionUntil: addMonthsIso(today, 3) }))).toBeUndefined();
    });

    it("cuts the date to 6 months from creation when the consent is removed", async () => {
      const { updateCandidate } = await import("@/app/admin/(app)/kandidaten/actions");
      const c = await one<{ id: string; created: string }>(
        `insert into candidates (first_name, last_name, source, consent_at, retention_until, created_at)
         values ('Tim', 'Beispiel', 'netzwerk', now() - interval '300 days', $1, now() - interval '300 days') returning id, (created_at at time zone 'Europe/Zurich')::date::text as created`,
        [addMonthsIso(today, 20)],
      );
      const id = Number(c.id);
      const result = await updateCandidate(
        id,
        idle,
        form({ ...base, firstName: "Tim", consentNote: "Widerruf per E-Mail", retentionUntil: addMonthsIso(today, 20) }),
      );
      expect(result).toBeUndefined();
      const cap = addMonthsIso(c.created, 6);
      expect(await one("select consent_at, retention_until::text from candidates where id = $1", [id])).toEqual({ consent_at: null, retention_until: cap });
      // Already in the past, so the profile is overdue at once.
      expect(cap < today).toBe(true);
      const act = await one<{ body: string }>("select body from activities where candidate_id = $1 order by id desc limit 1", [id]);
      expect(act.body).toMatch(/^Einwilligung zur Speicherung entfernt \(Widerruf per E-Mail\)\. Aufbewahren bis \d{2}\.\d{2}\.\d{4}\.$/);
    });
  });

  it("keeps history entries of other records when a company is deleted", async () => {
    const { deleteCompany } = await import("@/app/admin/(app)/firmen/actions");
    const { companyDeleteImpact } = await import("@/lib/admin/data/companies");
    const firm = await one<{ id: string }>("insert into companies (name, kind) values ('Muster Daten GmbH', 'subunternehmer') returning id");
    const fid = Number(firm.id);
    const person = await one<{ id: string }>("insert into candidates (first_name, last_name, company_id) values ('Eva', 'Beispiel', $1) returning id", [fid]);
    const mandate = await one<{ id: string }>("insert into mandates (title) values ('SAP Basis') returning id");
    await client.query("insert into submissions (mandate_id, candidate_id, subcontractor_company_id) values ($1, $2, $3)", [mandate.id, person.id, fid]);
    const contract = await one<{ id: string }>(
      "insert into contracts (number, template, title, company_id, candidate_id) values ('V-2026-0101', 'subunternehmer', 'Subunternehmervertrag', $1, $2) returning id",
      [fid, person.id],
    );
    await client.query(
      `insert into activities (company_id, candidate_id, contract_id, mandate_id, kind, body) values
         ($1, null, null, null, 'notiz', 'Nur die Firma'),
         ($1, $2, $3, null, 'system', 'Vertrag V-2026-0101 unterzeichnet'),
         ($1, null, null, $4, 'system', 'Mandat erfasst')`,
      [fid, person.id, contract.id, mandate.id],
    );
    expect(await companyDeleteImpact(fid)).toEqual({ candidates: 1, submissions: 1 });

    expect(await deleteCompany(fid)).toBeUndefined();
    expect(await rows("select 1 from companies where id = $1", [fid])).toEqual([]);
    const acts = await rows<{ body: string; company_id: string | null }>("select body, company_id from activities where body in ('Nur die Firma', 'Vertrag V-2026-0101 unterzeichnet', 'Mandat erfasst') order by id");
    expect(acts).toEqual([
      { body: "Vertrag V-2026-0101 unterzeichnet", company_id: null },
      { body: "Mandat erfasst", company_id: null },
    ]);
    const note = await one<{ body: string }>("select body from activities where candidate_id = $1 order by id desc limit 1", [person.id]);
    expect(note.body).toMatch(/^Eigene Firma F-\d{4} gelöscht; Verknüpfung entfernt\.$/);
    expect(await deleteCompany(fid)).toMatchObject({ status: "error" });
  });
});
