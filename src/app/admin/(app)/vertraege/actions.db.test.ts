import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Contract actions against a real Postgres (TEST_DATABASE_URL, wiped here): a sent contract
 * keeps its number for good, and an Einwilligung names the mandate's client and is only taken
 * over when it covers the submission. The session and the request are stubbed. Fictional data.
 */

vi.mock("@/lib/admin/auth/session", () => ({ requireAdmin: vi.fn(async () => ({ id: "test" })) }));
vi.mock("@/lib/admin/request", () => ({
  requestIp: async () => "127.0.0.1",
  requestIpHash: async () => "test",
  requestUserAgent: async () => null,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  notFound: vi.fn(),
}));

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("contract actions (database)", () => {
  let actions: typeof import("./actions");
  let sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  const idle = { status: "idle" } as const;

  const form = (values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fd;
  };

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
    actions = await import("./actions");
    await sql(`insert into companies (name, kind) values ('Muster Consulting', 'auftraggeber'), ('Andere Beispiel AG', 'auftraggeber')`);
    await sql(`insert into candidates (first_name, last_name) values ('Lea', 'Probst')`);
    await sql(`insert into mandates (title, company_id) values ('Cloud Architekt', 1), ('Ohne Firma', null)`);
  }, 60_000);

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
  });

  let seq = 100;
  async function draft(template = "nda", extra: Record<string, unknown> = {}): Promise<number> {
    seq += 1;
    const [row] = await sql<{ id: string }>(
      `insert into contracts (number, template, title, status, data, company_id, candidate_id, mandate_id)
       values ($1, $2, 'Test', 'entwurf', $3, $4, $5, $6) returning id`,
      [`V-2025-0${seq}`, template, JSON.stringify(extra.data ?? {}), extra.companyId ?? null, extra.candidateId ?? null, extra.mandateId ?? null],
    );
    return Number(row.id);
  }

  const sentAt = async (id: number) => (await sql<{ sent_at: Date | null }>("select sent_at from contracts where id = $1", [id]))[0]?.sent_at;

  it("remembers the first dispatch and never deletes a contract that was sent", async () => {
    const id = await draft();
    expect(await actions.markContract(id, "versendet")).toMatchObject({ status: "success" });
    const first = await sentAt(id);
    expect(first).toBeInstanceOf(Date);
    // Reopened as a draft and sent again: the first date stays.
    expect(await actions.markContract(id, "entwurf")).toMatchObject({ status: "success" });
    expect(await sentAt(id)).toEqual(first);
    expect(await actions.markContract(id, "versendet")).toMatchObject({ status: "success" });
    expect(await sentAt(id)).toEqual(first);
    expect(await actions.markContract(id, "entwurf")).toMatchObject({ status: "success" });
    expect(await actions.deleteContract(id)).toEqual({
      status: "error",
      message: "Ein bereits versendeter Vertrag kann nicht gelöscht werden. Storniere ihn stattdessen.",
      errors: undefined,
    });
    expect(await sql("select id from contracts where id = $1", [id])).toHaveLength(1);
    expect(await actions.markContract(id, "storniert")).toMatchObject({ status: "success" });
  });

  it("deletes a draft that never left KOVALI", async () => {
    const id = await draft();
    await expect(actions.deleteContract(id)).rejects.toThrow("NEXT_REDIRECT /admin/vertraege");
    expect(await sql("select id from contracts where id = $1", [id])).toHaveLength(0);
  });

  it("names the mandate's client as recipient of an Einwilligung", async () => {
    const base = { title: "Einwilligung Test", candidateId: "1", d_variant: "anonym", d_retentionMonths: "24", d_consentForm: "unterschrift" };
    const other = await actions.createContract("einwilligung", idle, form({ ...base, mandateId: "1", companyId: "2" }));
    expect(other).toMatchObject({ status: "error", errors: { companyId: "Die Empfängerin muss die Auftraggeberin des Mandats sein." } });
    const noFirm = await actions.createContract("einwilligung", idle, form({ ...base, mandateId: "2" }));
    expect(noFirm).toMatchObject({ status: "error", errors: { mandateId: expect.stringContaining("Ordne dem Mandat zuerst eine Firma zu") } });
    // Without a recipient chosen, the mandate's client is it.
    await expect(actions.createContract("einwilligung", idle, form({ ...base, mandateId: "1" }))).rejects.toThrow(/NEXT_REDIRECT \/admin\/vertraege\/\d+/);
    const [created] = await sql<{ company_id: string }>("select company_id from contracts where title = 'Einwilligung Test'");
    expect(Number(created.company_id)).toBe(1);
  });

  it("does not take over a signed Einwilligung that does not cover the submission", async () => {
    const [{ id: sid }] = await sql<{ id: string }>(
      "insert into submissions (mandate_id, candidate_id, status, profile_variant) values (1, 1, 'einwilligung_offen', 'namentlich') returning id",
    );
    const anonymous = await draft("einwilligung", { data: { variant: "anonym" }, companyId: 1, candidateId: 1, mandateId: 1 });
    const result = await actions.signContract(anonymous, idle, form({ date: "2026-10-05" }));
    expect(result).toMatchObject({ status: "success" });
    expect(result.status === "success" && result.message).toContain("deckt den Vorschlag");
    expect(result.status === "success" && result.message).toContain("nur für das anonymisierte Dossier");
    expect((await sql("select consent_at, consent_scope from submissions where id = $1", [sid]))[0]).toEqual({ consent_at: null, consent_scope: null });

    const named = await draft("einwilligung", { data: { variant: "namentlich" }, companyId: 1, candidateId: 1, mandateId: 1 });
    expect(await actions.signContract(named, idle, form({ date: "2026-10-06" }))).toEqual({ status: "success", message: "Als unterzeichnet erfasst." });
    expect((await sql("select consent_method, consent_scope from submissions where id = $1", [sid]))[0]).toEqual({ consent_method: "vertrag", consent_scope: "namentlich" });
  });
});
