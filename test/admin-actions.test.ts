import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Server actions of the admin area against a real Postgres (TEST_DATABASE_URL, wiped here):
 * deleting a company, notes and encrypted documents of an assignment. The session check,
 * refresh() and redirect() are stubbed; everything else is the real code. Fictional sample
 * data only.
 */

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Documents are encrypted with a key derived from it; a fixed test value.
  process.env.ADMIN_SECRET = Buffer.alloc(32, 9).toString("base64url");
});

vi.mock("@/lib/admin/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/auth/session")>()),
  requireAdmin: vi.fn(async () => ({ id: "test", createdAt: new Date(), expiresAt: new Date() })),
}));
vi.mock("next/cache", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/cache")>()), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), redirect: vi.fn() }));

const url = process.env.TEST_DATABASE_URL;
const idle = { status: "idle" } as const;

function form(values: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

/** A tiny file that passes the content check as PDF. */
function pdf(name: string): File {
  return new File([Buffer.from("%PDF-1.4\n% Rapport Oktober\n%%EOF\n")], name, { type: "application/pdf" });
}

describe.skipIf(!url)("admin actions (database)", () => {
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

  it("stores documents of an assignment encrypted, with the kinds offered there", async () => {
    const { uploadDocument, deleteDocument } = await import("@/app/admin/(app)/_shared/actions");
    const { loadDocument } = await import("@/lib/admin/documents");
    const a = await one<{ id: string }>("insert into assignments (title, rate_amount) values ('Business Analyst', 125) returning id");
    const owner = { type: "assignment" as const, id: Number(a.id) };

    const result = await uploadDocument(owner, idle, form({ kind: "rapport", file: pdf("Rapport Oktober.pdf") }));
    expect(result).toMatchObject({ status: "success" });
    const doc = await one<{ id: string; kind: string; filename: string; content: Buffer; mandate_id: string | null }>(
      "select id, kind, filename, content, mandate_id from documents where assignment_id = $1",
      [a.id],
    );
    expect(doc).toMatchObject({ kind: "rapport", filename: "Rapport Oktober.pdf", mandate_id: null });
    // Encrypted in the database, readable through loadDocument.
    expect(doc.content.includes(Buffer.from("Rapport Oktober"))).toBe(false);
    expect((await loadDocument(Number(doc.id)))?.plain.toString()).toContain("Rapport Oktober");
    expect((await one<{ body: string }>("select body from activities where assignment_id = $1", [a.id])).body).toBe(
      "Dokument hochgeladen: Rapport (Rapport Oktober.pdf)",
    );

    // A posting belongs to a vacancy, not to an assignment.
    const wrongKind = await uploadDocument(owner, idle, form({ kind: "ausschreibung", file: pdf("Ausschreibung.pdf") }));
    expect(wrongKind).toMatchObject({ status: "error", errors: { kind: expect.any(String) } });
    // Only real PDF, Word and image files.
    const text = new File(["kein PDF"], "notiz.pdf", { type: "application/pdf" });
    expect(await uploadDocument(owner, idle, form({ kind: "rapport", file: text }))).toMatchObject({
      status: "error",
      errors: { file: "Erlaubt sind nur PDF-, DOCX-, PNG- und JPG-Dateien." },
    });
    const { kindList } = await import("@/lib/admin/documents");
    expect(kindList(["pdf"])).toBe("PDF");
    expect(kindList(["pdf", "docx"])).toBe("PDF- und DOCX");
    expect(await rows("select 1 from documents where assignment_id = $1", [a.id])).toHaveLength(1);

    expect(await deleteDocument(Number(doc.id))).toMatchObject({ status: "success" });
    expect(await rows("select 1 from documents where assignment_id = $1", [a.id])).toEqual([]);
    const audit = await rows<{ action: string; summary: string | null }>("select action, summary from audit_log where entity = 'document' order by id");
    expect(audit).toEqual([
      { action: "create", summary: `Dokument zu Auftrag A-${a.id.padStart(4, "0")}` },
      { action: "delete", summary: null },
    ]);
  });

  it("adds and deletes notes on an assignment", async () => {
    const { addNote, deleteNote } = await import("@/app/admin/(app)/_shared/actions");
    const a = await one<{ id: string }>("insert into assignments (title) values ('Test Manager') returning id");
    const owner = { type: "assignment" as const, id: Number(a.id) };
    expect(await addNote(owner, idle, form({ kind: "anruf", body: "Verlängerung bis März besprochen" }))).toMatchObject({ status: "success" });
    expect(await addNote(owner, idle, form({ kind: "system", body: "Nicht erlaubt" }))).toMatchObject({ status: "error" });
    const note = await one<{ id: string; kind: string }>("select id, kind from activities where assignment_id = $1", [a.id]);
    expect(note.kind).toBe("anruf");
    expect(await deleteNote(Number(note.id))).toMatchObject({ status: "success" });
    expect(await rows("select 1 from activities where assignment_id = $1", [a.id])).toEqual([]);
  });

  it("keeps history entries of other records when a company is deleted", async () => {
    const { deleteCompany } = await import("@/app/admin/(app)/firmen/actions");
    const { companyDeleteImpact } = await import("@/lib/admin/data/companies");
    const firm = await one<{ id: string }>("insert into companies (name, kind) values ('Muster Vermittlung AG', 'auftraggeber') returning id");
    const fid = Number(firm.id);
    const mandate = await one<{ id: string }>("insert into mandates (title, company_id) values ('SAP Basis', $1) returning id", [fid]);
    const assignment = await one<{ id: string }>("insert into assignments (title, company_id, mandate_id) values ('SAP Basis', $1, $2) returning id", [fid, mandate.id]);
    const contract = await one<{ id: string }>(
      "insert into contracts (number, template, title, company_id, assignment_id) values ('V-2026-0101', 'einzelauftrag', 'Einzelauftrag', $1, $2) returning id",
      [fid, assignment.id],
    );
    await client.query("insert into snippets (title, body, company_id) values ('Bewerbung', 'Text', $1)", [fid]);
    await client.query(
      `insert into activities (company_id, contract_id, mandate_id, assignment_id, kind, body) values
         ($1, null, null, null, 'notiz', 'Nur die Firma'),
         ($1, $2, null, $3, 'system', 'Vertrag V-2026-0101 abgelegt'),
         ($1, null, $4, null, 'system', 'Vakanz erfasst')`,
      [fid, contract.id, assignment.id, mandate.id],
    );
    expect(await companyDeleteImpact(fid)).toEqual({ mandates: 1, assignments: 1, contracts: 1 });

    expect(await deleteCompany(fid)).toBeUndefined();
    expect(await rows("select 1 from companies where id = $1", [fid])).toEqual([]);
    const acts = await rows<{ body: string; company_id: string | null }>(
      "select body, company_id from activities where body in ('Nur die Firma', 'Vertrag V-2026-0101 abgelegt', 'Vakanz erfasst') order by id",
    );
    expect(acts).toEqual([
      { body: "Vertrag V-2026-0101 abgelegt", company_id: null },
      { body: "Vakanz erfasst", company_id: null },
    ]);
    // The records stay, without the company.
    expect(await one("select company_id from assignments where id = $1", [assignment.id])).toEqual({ company_id: null });
    expect(await one("select company_id from contracts where id = $1", [contract.id])).toEqual({ company_id: null });
    expect(await one("select company_id from snippets where title = 'Bewerbung'")).toEqual({ company_id: null });
    expect(await deleteCompany(fid)).toMatchObject({ status: "error" });
  });
});
