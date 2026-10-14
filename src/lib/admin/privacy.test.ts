import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The database client reads DATABASE_URL when it is first imported, so the test database has
// to be set before the imports below run (vi.hoisted runs first).
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

import {
  addDaysIso,
  anonymiseCandidate,
  anonymisedCandidateValues,
  anonymiseEducation,
  anonymiseExperience,
  buildDisclosure,
  deleteCandidatePermanently,
  disclosureDocModel,
  isAnonymised,
  maxRetentionDate,
  privacyCounts,
  retentionDue,
  retentionExtensionError,
  retentionState,
} from "./privacy";

/** Fictional sample data only. */
const experience = [
  {
    role: "Business Analyst",
    client: "Beispielbank AG, Zürich",
    industry: "Banken",
    from: "2021-03",
    to: "2024-06",
    description: "Anforderungen für das Kreditsystem erhoben, Team von 5 Personen geführt",
    technologies: ["SAP FI", "Jira"],
  },
];
const education = [{ title: "MSc Wirtschaftsinformatik", institution: "Musterhochschule Bern", year: "2016" }];

describe("retention rules", () => {
  const today = "2026-10-13";

  it("classifies retention dates", () => {
    expect(retentionState(null, today)).toBe("none");
    expect(retentionState("2026-10-12", today)).toBe("overdue");
    expect(retentionState("2026-10-13", today)).toBe("due");
    expect(retentionState("2026-11-12", today)).toBe("due");
    expect(retentionState("2026-11-13", today)).toBe("ok");
  });

  it("adds days across month and year ends", () => {
    expect(addDaysIso("2026-10-13", 30)).toBe("2026-11-12");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("limits extensions to 6 months without and 24 months with consent", () => {
    expect(maxRetentionDate(false, today)).toBe("2027-04-13");
    expect(maxRetentionDate(true, today)).toBe("2028-10-13");
    expect(retentionExtensionError("2027-04-13", false, today)).toBeNull();
    expect(retentionExtensionError("2027-04-14", false, today)).toMatch(/Ohne Einwilligung höchstens 6 Monate, also bis 13\.04\.2027/);
    expect(retentionExtensionError("2028-10-13", true, today)).toBeNull();
    expect(retentionExtensionError("2028-10-14", true, today)).toMatch(/höchstens 24 Monate/);
    expect(retentionExtensionError("2026-10-13", true, today)).toMatch(/Zukunft/);
    expect(retentionExtensionError("13.10.2027", true, today)).toMatch(/gültiges Datum/);
  });
});

describe("anonymisation values", () => {
  it("keeps role, industry, period and technologies, but no client or description", () => {
    expect(anonymiseExperience(experience)).toEqual([
      { role: "Business Analyst", client: "", industry: "Banken", from: "2021-03", to: "2024-06", description: "", technologies: ["SAP FI", "Jira"] },
    ]);
    expect(anonymiseEducation(education)).toEqual([{ title: "MSc Wirtschaftsinformatik", institution: "", year: "2016" }]);
  });

  it("clears every identifying field and archives the profile", () => {
    const v = anonymisedCandidateValues({ id: 42, experience, education });
    expect(v.firstName).toBe("Anonymisiert");
    expect(v.lastName).toBe("K-0042");
    for (const key of [
      "email",
      "phone",
      "dateOfBirth",
      "street",
      "postalCode",
      "city",
      "nationality",
      "summary",
      "notes",
      "consentAt",
      "consentNote",
      "salaryExpectation",
      "rating",
      "regions",
      "companyId",
      "lastContactAt",
      "retentionUntil",
    ] as const) {
      expect(v[key], key).toBeNull();
    }
    expect(v.status).toBe("archiviert");
    expect(isAnonymised({ id: 42, firstName: v.firstName, lastName: v.lastName })).toBe(true);
    // A real person called "Anonymisiert" with another number is not mistaken for one.
    expect(isAnonymised({ id: 43, firstName: "Anonymisiert", lastName: "K-0042" })).toBe(false);
  });
});

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("anonymise and delete in the database", () => {
  const client = new Client({ connectionString: url });
  const today = new Date().toISOString().slice(0, 10);
  let personId = 0;
  let otherId = 0;
  let contractId = 0;

  const one = async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows[0]!;
  const n = async (text: string, values: unknown[] = []) => Number((await one<{ n: string }>(text, values)).n);

  beforeAll(async () => {
    await client.connect();
    await client.query("drop schema public cascade; create schema public;");
    // Fresh pool: the app migrates the empty database on first access.
    globalThis.__kovaliAdminDb = undefined;
    const { getDb } = await import("./db/client");
    await getDb();

    await client.query("insert into companies (name, kind) values ('Beispiel Consulting AG', 'auftraggeber'), ('Muster IT GmbH', 'subunternehmer')");
    const person = await one<{ id: string }>(
      `insert into candidates (first_name, last_name, email, phone, date_of_birth, street, postal_code, city, nationality, headline, summary, notes,
         consent_at, consent_note, salary_expectation, rating, regions, company_id, last_contact_at, skills, sap_modules, experience, education,
         source, status, retention_until)
       values ('Lea', 'Beispiel', 'lea.beispiel@example.com', '079 000 00 00', '1990-01-01', 'Musterweg 1', '3000', 'Bern', 'Schweiz',
         'Business Analyst', 'Kurzprofil mit Namen', 'Interne Notiz', now() - interval '2 years', 'per E-Mail', 120000, 4, 'Bern, Zürich', 2,
         now(), '{BPMN,Jira}', '{FI}', $1, $2, 'linkedin', 'aktiv', $3)
       returning id`,
      [JSON.stringify(experience), JSON.stringify(education), addDaysIso(today, -3)],
    );
    personId = Number(person.id);
    const other = await one<{ id: string }>(
      "insert into candidates (first_name, last_name, email, retention_until) values ('Max', 'Muster', 'max.muster@example.com', $1) returning id",
      [addDaysIso(today, 10)],
    );
    otherId = Number(other.id);
    await client.query("insert into mandates (title, company_id) values ('Business Analyst Kreditsystem', 1)");
    await client.query(
      "insert into submissions (mandate_id, candidate_id, status, consent_at, consent_note, submitted_at, notes, feedback) values (1, $1, 'vorgeschlagen', now(), 'Telefon', now(), 'gute Wahl', 'Kunde will Interview')",
      [personId],
    );
    await client.query("insert into submissions (mandate_id, candidate_id) values (1, $1)", [otherId]);
    for (const id of [personId, otherId]) {
      await client.query(
        "insert into documents (candidate_id, kind, filename, mime_type, size_bytes, sha256, content) values ($1, 'cv', 'Lebenslauf.pdf', 'application/pdf', 3, 'abc', '\\x010203')",
        [id],
      );
      await client.query("insert into activities (candidate_id, mandate_id, kind, body) values ($1, 1, 'anruf', 'Telefonat über das Mandat')", [id]);
      await client.query("insert into vacancy_shares (mandate_id, candidate_id) values (1, $1)", [id]);
      await client.query("insert into change_requests (candidate_id, section) values ($1, 'profil')", [id]);
    }
    await client.query("insert into candidate_accounts (candidate_id, email) values ($1, 'lea.beispiel@example.com')", [personId]);
    const contract = await one<{ id: string }>(
      "insert into contracts (number, template, title, candidate_id, company_id) values ('V-2026-0001', 'einsatzvertrag', 'Einsatzvertrag', $1, 2) returning id",
      [otherId],
    );
    contractId = Number(contract.id);
    await client.query(
      "insert into documents (contract_id, kind, filename, mime_type, size_bytes, sha256, content) values ($1, 'vertrag', 'Vertrag.pdf', 'application/pdf', 3, 'def', '\\x010203')",
      [contractId],
    );
  });

  afterAll(async () => {
    await globalThis.__kovaliAdminDb?.pool.end();
    globalThis.__kovaliAdminDb = undefined;
    await client.end();
  });

  it("lists overdue and soon due profiles", async () => {
    const due = await retentionDue(today);
    expect(due.overdue.map((r) => r.id)).toEqual([personId]);
    expect(due.overdue[0]).toMatchObject({ documents: 1, contracts: 0 });
    expect(due.dueSoon.map((r) => r.id)).toEqual([otherId]);
    expect(due.dueSoon[0]).toMatchObject({ documents: 1, contracts: 1 });
    expect(await privacyCounts(today)).toMatchObject({ overdue: 1, dueSoon: 1 });
  });

  it("builds an access report with recipients, processors and the matching note", async () => {
    const report = await buildDisclosure(personId);
    expect(report).not.toBeNull();
    expect(report!.person).toMatchObject({ nummer: `K-${String(personId).padStart(4, "0")}`, vorname: "Lea", eigeneFirma: "Muster IT GmbH" });
    expect(report!.empfaenger.weitergaben).toHaveLength(1);
    expect(report!.empfaenger.weitergaben[0]).toMatchObject({ empfaengerFirma: "Beispiel Consulting AG" });
    expect(report!.empfaenger.auftragsbearbeiter.map((p) => p.name.split(" ")[0])).toEqual(["Vercel", "Neon", "Resend"]);
    expect(report!.herkunft).toBe("LinkedIn");
    expect(report!.dokumente).toHaveLength(1);
    expect(report!.kandidatenportal.konto).toMatchObject({ email: "lea.beispiel@example.com" });
    expect(report!.automatisierteEntscheide).toMatch(/von einer Person getroffen/);
    const doc = disclosureDocModel(report!);
    expect(doc.title).toMatch(/^Auskunft K-\d{4} \d{4}-\d{2}-\d{2}$/);
    expect(doc.confidential).toBe(true);
  });

  it("anonymises a candidate and removes everything that identifies the person", async () => {
    const result = await anonymiseCandidate(personId);
    expect(result).toEqual({ documents: 1, changeRequests: 1, portalAccount: true, vacancyShares: 1, activities: 1, submissions: 1 });

    const c = await one<Record<string, unknown>>("select * from candidates where id = $1", [personId]);
    expect(c.first_name).toBe("Anonymisiert");
    expect(c.last_name).toBe(`K-${String(personId).padStart(4, "0")}`);
    for (const col of ["email", "phone", "date_of_birth", "street", "postal_code", "city", "nationality", "summary", "notes", "consent_at", "consent_note", "salary_expectation", "rating", "regions", "company_id", "last_contact_at", "retention_until"]) {
      expect(c[col], col).toBeNull();
    }
    expect(c.status).toBe("archiviert");
    expect(c.skills).toEqual(["BPMN", "Jira"]);
    expect((c.experience as { client: string; description: string }[])[0]).toMatchObject({ client: "", description: "", role: "Business Analyst" });

    expect(await n("select count(*) as n from documents where candidate_id = $1", [personId])).toBe(0);
    expect(await n("select count(*) as n from candidate_accounts where candidate_id = $1", [personId])).toBe(0);
    expect(await n("select count(*) as n from vacancy_shares where candidate_id = $1", [personId])).toBe(0);
    expect(await n("select count(*) as n from change_requests where candidate_id = $1", [personId])).toBe(0);
    // Only the new, name-free history entry is left.
    const acts = await client.query<{ body: string }>("select body from activities where candidate_id = $1", [personId]);
    expect(acts.rows.map((r) => r.body)).toEqual(["Anonymisiert"]);
    // The submission stays as statistics, without free text.
    const sub = await one<{ notes: string | null; feedback: string | null; consent_note: string | null; status: string }>(
      "select notes, feedback, consent_note, status from submissions where candidate_id = $1",
      [personId],
    );
    expect(sub).toEqual({ notes: null, feedback: null, consent_note: null, status: "vorgeschlagen" });

    const log = await one<{ action: string; summary: string }>("select action, summary from audit_log where entity = 'candidate' and entity_id = $1", [personId]);
    expect(log.action).toBe("anonymise");
    expect(log.summary).not.toMatch(/Lea|Beispiel/);

    // Anonymised profiles drop out of the retention list and the counts.
    const due = await retentionDue(today);
    expect(due.overdue).toEqual([]);
  });

  it("deletes a candidate for good but keeps the contract and its file", async () => {
    expect(await deleteCandidatePermanently(otherId)).toBe(true);
    expect(await n("select count(*) as n from candidates where id = $1", [otherId])).toBe(0);
    expect(await n("select count(*) as n from documents where candidate_id = $1", [otherId])).toBe(0);
    expect(await n("select count(*) as n from submissions where candidate_id = $1", [otherId])).toBe(0);
    const contract = await one<{ candidate_id: string | null }>("select candidate_id from contracts where id = $1", [contractId]);
    expect(contract.candidate_id).toBeNull();
    expect(await n("select count(*) as n from documents where contract_id = $1", [contractId])).toBe(1);
    const log = await one<{ summary: string }>("select summary from audit_log where action = 'delete' and entity_id = $1", [otherId]);
    expect(log.summary).not.toMatch(/Max|Muster/);
    expect(await deleteCandidatePermanently(otherId)).toBe(false);
  });
});
