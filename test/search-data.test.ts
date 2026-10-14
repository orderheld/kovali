import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The global search (/admin/suche) and the company pages against a real Postgres
 * (TEST_DATABASE_URL, wiped here): word-wise hits in every group, document file names with
 * a link to their record, display numbers, and the counts in the company list. Fictional
 * sample data only.
 */

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("search and company data", () => {
  const client = new Client({ connectionString: url });
  let search: typeof import("@/lib/admin/data/search");
  let companiesData: typeof import("@/lib/admin/data/companies");
  const id = async (text: string, values: unknown[] = []) => Number((await client.query<{ id: string }>(text, values)).rows[0]!.id);
  const ids = { ghr: 0, bank: 0, partner: 0, running: 0, done: 0, vacancy: 0, contract: 0, snippet: 0, doc: 0 };

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    process.env.DATABASE_URL = url;
    process.env.ADMIN_SECRET ??= Buffer.alloc(32, 5).toString("base64url");
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("@/lib/admin/db/client");
    await getDb();
    search = await import("@/lib/admin/data/search");
    companiesData = await import("@/lib/admin/data/companies");

    ids.ghr = await id("insert into companies (name, kind, uid, city) values ('Alpenblick Vermittlung AG', 'auftraggeber', 'CHE-123.456.789', 'Zürich') returning id");
    ids.bank = await id("insert into companies (name, kind, city) values ('Seeblick Bank', 'endkunde', 'Bern') returning id");
    ids.partner = await id("insert into companies (name, kind) values ('Beispiel Partner GmbH', 'partner') returning id");
    await client.query(
      `insert into contacts (company_id, first_name, last_name, email, phone, role) values
         ($1, 'Anna', 'Beispiel', 'anna@alpenblick.example', '+41 79 123 45 67', 'Recruiterin'),
         ($2, 'Ben', 'Muster', null, null, 'Teamleiter')`,
      [ids.ghr, ids.bank],
    );
    ids.running = await id("insert into assignments (title, company_id, end_client, status, start_date) values ('Business Analyst SAP', $1, 'Seeblick Bank', 'laufend', '2026-09-01') returning id", [
      ids.ghr,
    ]);
    ids.done = await id("insert into assignments (title, company_id, status) values ('Testmanager Migration', $1, 'beendet') returning id", [ids.ghr]);
    ids.vacancy = await id("insert into mandates (title, company_id, status) values ('Product Owner Zahlungsverkehr', $1, 'angeboten') returning id", [ids.ghr]);
    await client.query("insert into mandates (title, company_id, status) values ('Requirements Engineer', $1, 'verloren')", [ids.ghr]);
    ids.contract = await id(
      "insert into contracts (number, template, title, status, company_id, assignment_id) values ('V-2026-0001', 'rahmenvertrag', 'Rahmenvertrag', 'unterzeichnet', $1, $2) returning id",
      [ids.ghr, ids.running],
    );
    await client.query("insert into contracts (number, template, title, status, company_id) values ('V-2026-0002', 'nda', 'Geheimhaltung', 'storniert', $1)", [ids.bank]);
    ids.snippet = await id(
      "insert into snippets (title, category, body, company_id, pinned) values ('Bewerbung: Kurzprofil', 'Bewerbung', 'Grüezi\n\nMein Kurzprofil für Alpenblick: zwölf Jahre Business Analysis im Banking.', $1, true) returning id",
      [ids.ghr],
    );
    await client.query("insert into snippets (title, body) values ('Absage freundlich', 'Danke für die Rückmeldung.')");
    // Document content is not searched; it only has to be stored.
    ids.doc = await id(
      "insert into documents (assignment_id, kind, filename, mime_type, size_bytes, sha256, content) values ($1, 'lohnabrechnung', 'Lohnabrechnung September.pdf', 'application/pdf', 10, 'x', '\\x00') returning id",
      [ids.running],
    );
    await client.query(
      "insert into documents (company_id, kind, filename, mime_type, size_bytes, sha256, content) values ($1, 'korrespondenz', 'Konditionen 2026.pdf', 'application/pdf', 10, 'x', '\\x00')",
      [ids.ghr],
    );
  });

  afterAll(async () => {
    await client.end();
    const state = globalThis.__kovaliAdminDb;
    globalThis.__kovaliAdminDb = undefined;
    await state?.pool.end();
  });

  it("finds every word anywhere in a group", async () => {
    const r = (await search.searchAll("alpenblick kurzprofil"))!;
    expect(r.snippets).toMatchObject({ total: 1, rows: [{ id: ids.snippet, pinned: true }] });
    expect(r.snippets.rows[0]!.excerpt).toContain("Kurzprofil für Alpenblick");
    expect(r.assignments.total + r.contracts.total + r.companies.total + r.contacts.total + r.documents.total).toBe(0);

    // The company's name finds its assignments (running first), contracts and contacts' e-mail.
    const firm = (await search.searchAll("Alpenblick"))!;
    expect(firm.assignments.rows.map((a) => a.id)).toEqual([ids.running, ids.done]);
    expect(firm.contracts.rows.map((c) => c.id)).toEqual([ids.contract]);
    expect(firm.companies.rows.map((c) => c.id)).toEqual([ids.ghr]);
    expect(firm.contacts.rows.map((c) => c.firstName)).toEqual(["Anna"]);
    expect(firm.mandates.total).toBe(2);
    // The end client is searched in assignments as well.
    expect((await search.searchAll("seeblick sap"))!.assignments.rows.map((a) => a.id)).toEqual([ids.running]);
  });

  it("finds documents by file name or kind and links them to their record", async () => {
    const byName = (await search.searchAll("september"))!;
    expect(byName.documents.rows).toEqual([
      expect.objectContaining({ id: ids.doc, kind: "lohnabrechnung", owner: { label: `Auftrag A-${String(ids.running).padStart(4, "0")} Business Analyst SAP`, href: `/admin/auftraege/${ids.running}` } }),
    ]);
    const byKind = (await search.searchAll("Korrespondenz"))!;
    expect(byKind.documents.rows.map((d) => d.owner)).toEqual([{ label: "Firma Alpenblick Vermittlung AG", href: `/admin/firmen/${ids.ghr}` }]);
    expect((await search.searchAll("pdf"))!.documents.total).toBe(2);
  });

  it("finds contacts by phone and companies by UID digits", async () => {
    expect((await search.searchAll("079 123 45 67"))!.contacts.rows.map((c) => c.lastName)).toEqual(["Beispiel"]);
    expect((await search.searchAll("Muster Ben"))!.contacts.rows.map((c) => c.lastName)).toEqual(["Muster"]);
    expect((await search.searchAll("123456789"))!.companies.rows.map((c) => c.id)).toEqual([ids.ghr]);
    expect((await search.searchAll("Recruiterin"))!.contacts.total).toBe(1);
  });

  it("resolves display numbers of assignments and snippets", async () => {
    expect(await search.resolveJump({ kind: "assignment", id: ids.running })).toBe(`/admin/auftraege/${ids.running}`);
    expect(await search.resolveJump({ kind: "snippet", id: ids.snippet })).toBe(`/admin/texte/${ids.snippet}`);
    expect(await search.resolveJump({ kind: "snippet", id: 9999 })).toBeNull();
    expect(await search.resolveJump({ kind: "contract", number: "v-2026-0001" })).toBe(`/admin/vertraege/${ids.contract}`);
  });

  it("counts contacts, open vacancies, running assignments and contracts per company", async () => {
    const { rows } = await companiesData.listCompanies({ page: 1 });
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(ids.ghr)).toMatchObject({ contacts: 1, openMandates: 1, runningAssignments: 1, contracts: 1 });
    expect(byId.get(ids.bank)).toMatchObject({ contacts: 1, openMandates: 0, runningAssignments: 0, contracts: 1 });
    expect(byId.get(ids.partner)).toMatchObject({ contacts: 0, openMandates: 0, runningAssignments: 0, contracts: 0 });
    // The list search is the one of the global search: word by word.
    expect((await companiesData.listCompanies({ q: "Seeblick Bern", page: 1 })).rows.map((r) => r.id)).toEqual([ids.bank]);
  });

  it("lists everything linked to a company, the current things first", async () => {
    const records = await companiesData.companyRecords(ids.ghr);
    expect(records.assignments.map((a) => a.id)).toEqual([ids.running, ids.done]);
    expect(records.vacancies.map((m) => m.title)).toEqual(["Product Owner Zahlungsverkehr", "Requirements Engineer"]);
    expect(records.contracts.map((c) => c.number)).toEqual(["V-2026-0001"]);
    expect(records.snippets.map((s) => s.id)).toEqual([ids.snippet]);
    expect(await companiesData.companyRecords(ids.partner)).toEqual({ vacancies: [], assignments: [], contracts: [], snippets: [] });
  });
});
