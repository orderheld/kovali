import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Interest in a vacancy against a real Postgres (TEST_DATABASE_URL, wiped here): the portal
 * consent covers the anonymised dossier only, and the new submission starts with the rate
 * published to the candidate. Fictional data only.
 */

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("vacancy interest (database)", () => {
  let vac: typeof import("./vacancies");
  let sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  const ids = { anna: 0, hourly: 0, daily: 0, unpublished: 0 };

  beforeAll(async () => {
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    await client.end();
    process.env.DATABASE_URL = url;
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    sql = async (text, params = []) => (await globalThis.__kovaliAdminDb!.pool.query(text, params)).rows;
    vac = await import("./vacancies");
    const [anna] = await sql<{ id: string }>(
      "insert into candidates (first_name, last_name, status, rate_amount, rate_unit) values ('Anna', 'Beispiel', 'aktiv', 130, 'stunde') returning id",
    );
    ids.anna = Number(anna.id);
    const rows = await sql<{ id: string }>(
      `insert into mandates (title, status, portal_visibility, portal_title, rate_sell, rate_unit, portal_rate, portal_rate_unit) values
        ('Intern: BA', 'neu', 'alle', 'Business Analyst', 150, 'stunde', 115, 'stunde'),
        ('Intern: SAP', 'neu', 'alle', 'SAP FI Consultant', 1200, 'tag', 110, 'stunde'),
        ('Intern: PM', 'neu', 'alle', 'Projektleiter', 160, 'stunde', null, null)
       returning id`,
    );
    [ids.hourly, ids.daily, ids.unpublished] = rows.map((r) => Number(r.id));
  }, 60_000);

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
  });

  const submission = async (mandateId: number) =>
    (
      await sql<{ consent_method: string | null; consent_scope: string | null; rate_sell: string | null; rate_buy: string | null; rate_unit: string | null }>(
        "select consent_method, consent_scope, rate_sell, rate_buy, rate_unit from submissions where mandate_id = $1 and candidate_id = $2",
        [mandateId, ids.anna],
      )
    )[0];

  it("records the portal consent for the anonymised dossier only, with the published rate", async () => {
    expect(await vac.answerVacancy(ids.anna, ids.hourly, { response: "interessiert", consent: true, message: null })).toMatchObject({ ok: true, submissionCreated: true });
    expect(await submission(ids.hourly)).toMatchObject({ consent_method: "portal", consent_scope: "anonym", rate_unit: "stunde" });
    const s = await submission(ids.hourly);
    expect([Number(s.rate_sell), Number(s.rate_buy)]).toEqual([150, 115]);
  });

  it("converts the published rate to the mandate's unit and falls back to the candidate's rate", async () => {
    await vac.answerVacancy(ids.anna, ids.daily, { response: "interessiert", consent: true, message: null });
    const daily = await submission(ids.daily);
    expect([Number(daily.rate_sell), Number(daily.rate_buy), daily.rate_unit]).toEqual([1200, 924, "tag"]);
    await vac.answerVacancy(ids.anna, ids.unpublished, { response: "interessiert", consent: true, message: null });
    expect(Number((await submission(ids.unpublished)).rate_buy)).toBe(130);
  });

  it("clears the scope with «kein Interesse» and sets it again with renewed interest", async () => {
    expect(await vac.answerVacancy(ids.anna, ids.hourly, { response: "kein_interesse", message: null })).toMatchObject({ ok: true, withdrawn: true });
    expect(await submission(ids.hourly)).toMatchObject({ consent_scope: null });
    expect(await vac.answerVacancy(ids.anna, ids.hourly, { response: "interessiert", consent: true, message: null })).toMatchObject({ ok: true, consentRecorded: true });
    expect(await submission(ids.hourly)).toMatchObject({ consent_method: "portal", consent_scope: "anonym" });
  });
});
