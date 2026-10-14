import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Database schema of the admin area. The SQL that creates it lives in migrations.ts; the
 * schema test (npm test) checks that both match. Text columns with a fixed set of values use
 * check constraints instead of Postgres enums, so new values only need a small migration.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const id = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const ref = (name: string) => bigint(name, { mode: "number" });
const textArray = (name: string) => text(name).array().notNull().default([]);

export const companies = pgTable(
  "companies",
  {
    id: id(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    legalName: text("legal_name"),
    legalForm: text("legal_form"),
    uid: text("uid"),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("Schweiz"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    industry: text("industry"),
    status: text("status").notNull().default("aktiv"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("companies_kind_idx").on(t.kind)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    companyId: ref("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    salutation: text("salutation"),
    firstName: text("first_name"),
    lastName: text("last_name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    isSignatory: boolean("is_signatory").notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contacts_company_idx").on(t.companyId)],
);

/**
 * Vakanzen: vacancies Ferhat applies for (application pipeline). The table, the export and the
 * owner type keep the old name "mandate"; rate_sell is the rate stated in the posting.
 */
export const mandates = pgTable(
  "mandates",
  {
    id: id(),
    kind: text("kind").notNull().default("anfrage"),
    title: text("title").notNull(),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: ref("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    reference: text("reference"),
    endClient: text("end_client"),
    description: text("description"),
    disciplines: textArray("disciplines"),
    requiredSkills: textArray("required_skills"),
    niceSkills: textArray("nice_skills"),
    seniority: text("seniority"),
    location: text("location"),
    remote: text("remote"),
    workload: smallint("workload"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    durationText: text("duration_text"),
    rateSell: numeric("rate_sell", { precision: 10, scale: 2, mode: "number" }),
    rateUnit: text("rate_unit"),
    deadline: date("deadline", { mode: "string" }),
    source: text("source"),
    status: text("status").notNull().default("neu"),
    priority: text("priority").notNull().default("normal"),
    nextStep: text("next_step"),
    nextStepAt: date("next_step_at", { mode: "string" }),
    notes: text("notes"),
    /** Link to the posting. */
    url: text("url"),
    /** When Ferhat sent his application. */
    appliedAt: date("applied_at", { mode: "string" }),
    /** The application text he sent or will send (copy button on the vacancy). */
    applicationText: text("application_text"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("mandates_status_idx").on(t.status), index("mandates_company_idx").on(t.companyId)],
);

/** Aufträge: Ferhat's assignments (Einsätze) with rate and billing model. */
export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    /** Role, e.g. "Business Analyst SAP S/4HANA". */
    title: text("title").notNull(),
    /** Contract partner: a provider such as GHR Group, or the client itself. */
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: ref("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    /** The vacancy the assignment came from. */
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "set null" }),
    endClient: text("end_client"),
    /** assignmentStatuses: geplant, laufend, beendet. */
    status: text("status").notNull().default("laufend"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    /** Percent, 1 to 100. */
    workload: smallint("workload").notNull().default(100),
    rateAmount: numeric("rate_amount", { precision: 10, scale: 2, mode: "number" }),
    rateUnit: text("rate_unit").notNull().default("stunde"),
    /** billingModels: "rechnung" (invoice via the Einzelfirma) or "lohn" (payroll at the provider). */
    billing: text("billing").notNull().default("rechnung"),
    /** rateBases, payroll only: "brutto" (gross wage incl. supplements) or "kostensatz" (provider's total cost per hour). */
    rateBasis: text("rate_basis").notNull().default("brutto"),
    /** Optional override of the computed hours per month. */
    hoursPerMonth: numeric("hours_per_month", { precision: 6, scale: 2, mode: "number" }),
    /** Own costs per month that nobody reimburses (travel and the like). */
    expensesMonthly: numeric("expenses_monthly", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    location: text("location"),
    remote: text("remote"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("assignments_status_idx").on(t.status), index("assignments_company_idx").on(t.companyId)],
);

/** Textbausteine: reusable texts to copy, e.g. the short profile for an application. */
export const snippets = pgTable(
  "snippets",
  {
    id: id(),
    title: text("title").notNull(),
    category: text("category"),
    body: text("body").notNull(),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("snippets_company_idx").on(t.companyId)],
);

export const contracts = pgTable(
  "contracts",
  {
    id: id(),
    number: text("number").notNull().unique(),
    /** Kind of contract (contractKinds); the column kept its old name. */
    template: text("template").notNull().default("sonstiges"),
    title: text("title").notNull(),
    status: text("status").notNull().default("entwurf"),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: ref("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "set null" }),
    assignmentId: ref("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    parentId: ref("parent_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    validFrom: date("valid_from", { mode: "string" }),
    validUntil: date("valid_until", { mode: "string" }),
    signedAt: date("signed_at", { mode: "string" }),
    /** Free text, e.g. "3 Monate auf Monatsende". */
    noticePeriod: text("notice_period"),
    /** First marked as sent; stays when the contract is reopened, so it can no longer be deleted. */
    sentAt: timestamp("sent_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("contracts_status_idx").on(t.status),
    index("contracts_company_idx").on(t.companyId),
    index("contracts_assignment_idx").on(t.assignmentId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "cascade" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "cascade" }),
    contractId: ref("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    assignmentId: ref("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** Always "admin" now; "kandidat" marks uploads of the former candidate portal. */
    uploadedBy: text("uploaded_by").notNull().default("admin"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow(),
    /** AES-256-GCM, see crypto.ts */
    content: bytea("content").notNull(),
    /** No longer written (text extracted from CVs of the former candidate module). */
    textContent: bytea("text_content"),
    createdAt: createdAt(),
  },
  (t) => [
    index("documents_company_idx").on(t.companyId),
    index("documents_mandate_idx").on(t.mandateId),
    index("documents_contract_idx").on(t.contractId),
    index("documents_assignment_idx").on(t.assignmentId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: id(),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "cascade" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "cascade" }),
    contractId: ref("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    assignmentId: ref("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("notiz"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_company_idx").on(t.companyId),
    index("activities_mandate_idx").on(t.mandateId),
    index("activities_contract_idx").on(t.contractId),
    index("activities_assignment_idx").on(t.assignmentId),
    index("activities_created_idx").on(t.createdAt),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: ref("entity_id"),
    /** Short description without names, e.g. "Firma F-0003". */
    summary: text("summary"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the token itself only exists in the cookie. */
    id: text("id").primaryKey(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_expires_idx").on(t.expiresAt)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    /** Always "admin" ("portal" was the former candidate portal). */
    scope: text("scope").notNull(),
    ipHash: text("ip_hash").notNull(),
    success: boolean("success").notNull(),
    /** "password": wrong password (or still being checked); "code": right password, wrong code. */
    kind: text("kind").notNull().default("password"),
  },
  (t) => [
    index("login_attempts_ip_at_idx").on(t.scope, t.ipHash, t.at),
    index("login_attempts_at_idx").on(t.scope, t.at),
    index("login_attempts_kind_at_idx").on(t.scope, t.kind, t.at),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
/** A vacancy (UI: "Vakanz"); the table kept its old name. */
export type Mandate = typeof mandates.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Snippet = typeof snippets.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
