import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The contract filing cabinet against a real Postgres (TEST_DATABASE_URL, wiped here): filing
 * with a file in one step, the checks of company, contact and Rahmenvertrag, prefilled forms,
 * status changes, deleting, and the list filters. The session check, refresh() and redirect()
 * are stubbed; everything else is the real code. Fictional sample data only.
 */

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Documents are encrypted with a key derived from it; a fixed test value.
  process.env.ADMIN_SECRET = Buffer.alloc(32, 7).toString("base64url");
});

vi.mock("@/lib/admin/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/auth/session")>()),
  requireAdmin: vi.fn(async () => ({ id: "test", createdAt: new Date(), expiresAt: new Date() })),
}));
vi.mock("next/cache", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/cache")>()), refresh: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), redirect }));

const url = process.env.TEST_DATABASE_URL;
const idle = { status: "idle" } as const;

function form(values: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

function pdf(name: string): File {
  return new File([Buffer.from("%PDF-1.4\n% Rahmenvertrag unterzeichnet\n%%EOF\n")], name, { type: "application/pdf" });
}

const empty = () => new File([], "", { type: "application/octet-stream" });

describe.skipIf(!url)("contract filing (database)", () => {
  const client = new Client({ connectionString: url });
  const rows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await rows<T>(text, values))[0]!;
  let actions: typeof import("@/app/admin/(app)/vertraege/actions");
  let data: typeof import("@/lib/admin/contracts/data");
  let today: string;
  let year: string;
  let addDays: (iso: string, days: number) => string;
  const ids = { ghr: 0, bank: 0, anna: 0, ben: 0, payroll: 0, invoice: 0, framework: 0 };

  /** The id of the contract the last successful create redirected to. */
  const createdId = () => Number(String(redirect.mock.lastCall?.[0]).split("/").pop());

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    actions = await import("@/app/admin/(app)/vertraege/actions");
    data = await import("@/lib/admin/contracts/data");
    const format = await import("@/lib/admin/format");
    today = format.todayIso();
    year = today.slice(0, 4);
    addDays = format.addDaysIso;

    ids.ghr = Number((await one<{ id: string }>("insert into companies (name, kind) values ('Alpenblick Vermittlung AG', 'auftraggeber') returning id")).id);
    ids.bank = Number((await one<{ id: string }>("insert into companies (name, kind) values ('Seeblick Bank', 'endkunde') returning id")).id);
    ids.anna = Number(
      (await one<{ id: string }>("insert into contacts (company_id, first_name, last_name, is_signatory) values ($1, 'Anna', 'Beispiel', true) returning id", [ids.ghr])).id,
    );
    ids.ben = Number((await one<{ id: string }>("insert into contacts (company_id, first_name, last_name) values ($1, 'Ben', 'Muster') returning id", [ids.bank])).id);
    ids.payroll = Number(
      (
        await one<{ id: string }>(
          "insert into assignments (title, company_id, contact_id, end_client, billing, start_date, end_date) values ('Business Analyst', $1, $2, 'Seeblick Bank', 'lohn', '2026-11-01', '2027-04-30') returning id",
          [ids.ghr, ids.anna],
        )
      ).id,
    );
    ids.invoice = Number((await one<{ id: string }>("insert into assignments (title, company_id, billing) values ('Test Manager', $1, 'rechnung') returning id", [ids.ghr])).id);
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("files a contract with its signed PDF in one step", async () => {
    const result = await actions.createContract(
      idle,
      form({
        title: "Rahmenvertrag Alpenblick",
        kind: "rahmenvertrag",
        status: "unterzeichnet",
        companyId: String(ids.ghr),
        contactId: String(ids.anna),
        validFrom: "2026-01-01",
        signedAt: "2025-12-15",
        noticePeriod: "3 Monate auf Monatsende",
        file: pdf("Rahmenvertrag signiert.pdf"),
      }),
    );
    expect(result).toBeUndefined();
    ids.framework = createdId();
    const contract = await one("select number, template, status, company_id, contact_id, notice_period, signed_at::text from contracts where id = $1", [ids.framework]);
    expect(contract).toEqual({
      number: `V-${year}-0001`,
      template: "rahmenvertrag",
      status: "unterzeichnet",
      company_id: String(ids.ghr),
      contact_id: String(ids.anna),
      notice_period: "3 Monate auf Monatsende",
      signed_at: "2025-12-15",
    });
    const doc = await one<{ kind: string; filename: string; content: Buffer }>("select kind, filename, content from documents where contract_id = $1", [ids.framework]);
    expect(doc).toMatchObject({ kind: "vertrag", filename: "Rahmenvertrag signiert.pdf" });
    expect(doc.content.includes(Buffer.from("Rahmenvertrag unterzeichnet"))).toBe(false);
    // The history shows on the contract and on the company; the audit log has numbers only.
    expect(await one("select company_id, contract_id, body from activities where contract_id = $1", [ids.framework])).toEqual({
      company_id: String(ids.ghr),
      contract_id: String(ids.framework),
      body: `Vertrag V-${year}-0001 abgelegt: Rahmenvertrag Alpenblick (Rahmenvertrag, mit Datei Rahmenvertrag signiert.pdf)`,
    });
    expect(await rows("select action, entity, summary from audit_log order by id")).toEqual([
      { action: "create", entity: "document", summary: `Dokument zu Vertrag #${ids.framework}` },
      { action: "create", entity: "contract", summary: `Vertrag V-${year}-0001` },
    ]);
  });

  it("checks contact, Rahmenvertrag, kind and file before anything is stored", async () => {
    const base = { title: "Einzelauftrag", kind: "einzelauftrag", status: "entwurf", file: empty() };
    expect(await actions.createContract(idle, form({ ...base, companyId: String(ids.bank), parentId: String(ids.framework) }))).toMatchObject({
      status: "error",
      errors: { parentId: "Dieser Rahmenvertrag gehört zu einer anderen Firma." },
    });
    expect(await actions.createContract(idle, form({ ...base, companyId: String(ids.ghr), contactId: String(ids.ben) }))).toMatchObject({
      status: "error",
      errors: { contactId: "Diese Person gehört nicht zur gewählten Firma." },
    });
    expect(await actions.createContract(idle, form({ ...base, kind: "beratung" }))).toMatchObject({ status: "error", errors: { kind: "Diese Art wird nicht mehr angeboten." } });
    const text = new File(["kein PDF"], "vertrag.pdf", { type: "application/pdf" });
    expect(await actions.createContract(idle, form({ ...base, title: "", file: text }))).toMatchObject({
      status: "error",
      errors: { title: expect.any(String), file: expect.any(String) },
    });
    expect(await actions.createContract(idle, form({ ...base, validFrom: "2026-05-01", validUntil: "2026-04-30" }))).toMatchObject({
      status: "error",
      errors: { validUntil: "Das Ende liegt vor dem Beginn." },
    });
    expect(await rows("select 1 from contracts")).toHaveLength(1);
  });

  it("takes the company from the Rahmenvertrag and numbers on", async () => {
    await actions.createContract(
      idle,
      form({ title: "Einzelauftrag Test Manager", kind: "einzelauftrag", status: "entwurf", parentId: String(ids.framework), assignmentId: String(ids.invoice), file: empty() }),
    );
    const id = createdId();
    expect(await one("select number, company_id, parent_id, assignment_id from contracts where id = $1", [id])).toEqual({
      number: `V-${year}-0002`,
      company_id: String(ids.ghr),
      parent_id: String(ids.framework),
      assignment_id: String(ids.invoice),
    });
    // Filed for an assignment: the entry shows there too.
    expect(await rows("select 1 from activities where assignment_id = $1 and contract_id = $2", [ids.invoice, id])).toHaveLength(1);
    expect((await data.listChildContracts(ids.framework)).map((c) => c.id)).toEqual([id]);
  });

  it("prefills the form from an assignment, a company or a Rahmenvertrag", async () => {
    expect(await data.contractPrefill({ auftrag: ids.payroll })).toMatchObject({
      title: "Business Analyst, Seeblick Bank",
      kind: "arbeitsvertrag",
      companyId: ids.ghr,
      contactId: ids.anna,
      assignmentId: ids.payroll,
      parentId: null,
      validFrom: "2026-11-01",
      validUntil: "2027-04-30",
    });
    // Invoiced through the Einzelfirma: an Einzelauftrag under the company's Rahmenvertrag.
    expect(await data.contractPrefill({ auftrag: ids.invoice })).toMatchObject({ kind: "einzelauftrag", companyId: ids.ghr, contactId: ids.anna, parentId: ids.framework });
    expect(await data.contractPrefill({ firma: ids.bank })).toMatchObject({ kind: null, companyId: ids.bank, contactId: null, parentId: null });
    expect(await data.contractPrefill({ rahmen: ids.framework })).toMatchObject({ kind: "einzelauftrag", companyId: ids.ghr, parentId: ids.framework, contactId: ids.anna });
    expect(await data.contractPrefill({ auftrag: 999, firma: 999 })).toEqual(data.emptyContractValues);
  });

  it("keeps an old kind on edit and logs status changes", async () => {
    const legacy = await one<{ id: string }>(
      "insert into contracts (number, template, title, status, company_id) values ('V-2025-0007', 'beratung', 'Beratung alt', 'entwurf', $1) returning id",
      [ids.ghr],
    );
    const id = Number(legacy.id);
    const values = { title: "Beratung alt", kind: "beratung", status: "unterzeichnet", companyId: String(ids.ghr), signedAt: "2025-03-01" };
    expect(await actions.updateContract(id, idle, form(values))).toBeUndefined();
    expect(await one("select template, status from contracts where id = $1", [id])).toEqual({ template: "beratung", status: "unterzeichnet" });
    expect((await one<{ body: string }>("select body from activities where contract_id = $1 order by id desc limit 1", [id])).body).toBe(
      "Vertrag V-2025-0007: In Prüfung → Unterzeichnet",
    );
    // Another contract cannot take the old kind, and a signing date lies in the past.
    expect(await actions.updateContract(ids.framework, idle, form({ ...values, title: "Rahmenvertrag" }))).toMatchObject({ errors: { kind: expect.any(String) } });
    expect(await actions.updateContract(id, idle, form({ ...values, signedAt: addDays(today, 1) }))).toMatchObject({ errors: { signedAt: "Das Datum liegt in der Zukunft." } });
    // A contract cannot be its own Rahmenvertrag.
    expect(await actions.updateContract(id, idle, form({ ...values, kind: "einzelauftrag", parentId: String(id) }))).toMatchObject({ errors: { parentId: expect.any(String) } });
  });

  it("moves through the statuses with one click and a signing date", async () => {
    const id = Number((await one<{ id: string }>("select id from contracts where number = $1", [`V-${year}-0002`])).id);
    expect(await actions.setContractStatus(id, "beendet")).toMatchObject({ status: "error" });
    expect(await actions.setContractStatus(id, "versendet")).toMatchObject({ status: "success" });
    expect(await one<{ sent: boolean }>("select sent_at is not null as sent from contracts where id = $1", [id])).toEqual({ sent: true });
    expect(await actions.signContract(id, idle, form({ signedAt: addDays(today, 2) }))).toMatchObject({ errors: { signedAt: expect.any(String) } });
    expect(await actions.signContract(id, idle, form({ signedAt: today }))).toMatchObject({ status: "success" });
    expect(await one("select status, signed_at::text from contracts where id = $1", [id])).toEqual({ status: "unterzeichnet", signed_at: today });
    expect(await actions.signContract(id, idle, form({ signedAt: today }))).toMatchObject({ status: "error" });
    expect(await actions.setContractStatus(id, "beendet")).toMatchObject({ status: "success" });
  });

  it("lists, filters and counts, with contracts ending soon", async () => {
    await client.query("update contracts set valid_until = $1 where id = $2", [addDays(today, 20), ids.framework]);
    await client.query(
      `insert into contracts (number, template, title, status, company_id, valid_until) values
         ('V-2024-0001', 'nda', 'Geheimhaltung Seeblick', 'unterzeichnet', $1, $2),
         ('V-2024-0002', 'nda', 'NDA alt', 'beendet', $1, $3)`,
      [ids.bank, addDays(today, 90), addDays(today, 5)],
    );
    // Word by word, also over the company's name.
    const hits = await data.listContracts({ q: "Rahmenvertrag Alpenblick", page: 1 }, today);
    expect(hits.rows.map((r) => r.id)).toEqual([ids.framework]);
    expect(hits.rows[0]).toMatchObject({ files: 1, companyName: "Alpenblick Vermittlung AG", kind: "rahmenvertrag" });
    // "Seeblick" is in one title and is the company of both NDAs.
    expect((await data.listContracts({ q: "seeblick", page: 1 }, today)).total).toBe(2);
    expect((await data.listContracts({ q: "geheimhaltung", page: 1 }, today)).rows.map((r) => r.title)).toEqual(["Geheimhaltung Seeblick"]);
    expect((await data.listContracts({ kind: "nda", page: 1 }, today)).total).toBe(2);
    expect(await data.contractStatusCounts({ kind: "nda" }, today)).toEqual({ unterzeichnet: 1, beendet: 1 });
    // Ending within 60 days and still open: the framework (20 days), not the closed NDA (5 days) or the one in 90 days.
    expect((await data.listContracts({ ending: true, page: 1 }, today)).rows.map((r) => r.id)).toEqual([ids.framework]);
    expect(await data.countEndingContracts(today)).toBe(1);
    expect((await data.listEndingContracts(today)).map((r) => r.number)).toEqual([`V-${year}-0001`]);
    expect(await data.upcomingContractNumber(Number(year))).toBe(`V-${year}-0003`);
    expect((await data.usedContractKinds()).sort()).toEqual(["beratung", "einzelauftrag", "nda", "rahmenvertrag"]);
  });

  it("deletes a contract with its files and own notes, keeping shared history", async () => {
    const child = Number((await one<{ id: string }>("select id from contracts where number = $1", [`V-${year}-0002`])).id);
    await client.query("insert into activities (contract_id, kind, body) values ($1, 'notiz', 'Nur der Vertrag')", [ids.framework]);
    expect(await actions.deleteContract(ids.framework)).toBeUndefined();
    expect(redirect).toHaveBeenLastCalledWith("/admin/vertraege");
    expect(await rows("select 1 from contracts where id = $1", [ids.framework])).toEqual([]);
    expect(await rows("select 1 from documents where contract_id is not null")).toEqual([]);
    expect(await rows("select 1 from activities where body = 'Nur der Vertrag'")).toEqual([]);
    // "abgelegt" also belonged to the company: it stays there, without the contract.
    expect(await one("select contract_id, company_id from activities where body like $1", [`Vertrag V-${year}-0001 abgelegt%`])).toEqual({
      contract_id: null,
      company_id: String(ids.ghr),
    });
    expect(await one("select body from activities where company_id = $1 order by id desc limit 1", [ids.ghr])).toEqual({ body: `Vertrag V-${year}-0001 gelöscht.` });
    // The Einzelauftrag stays, without its Rahmenvertrag.
    expect(await one("select parent_id from contracts where id = $1", [child])).toEqual({ parent_id: null });
    expect(await one("select summary from audit_log where action = 'delete' and entity = 'contract'")).toEqual({ summary: `Vertrag V-${year}-0001` });
    expect(await actions.deleteContract(ids.framework)).toMatchObject({ status: "error" });
  });
});
