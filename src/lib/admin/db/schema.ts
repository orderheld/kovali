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
  uniqueIndex,
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

export interface LanguageSkill {
  language: string;
  level: string;
}

export interface EducationEntry {
  title: string;
  institution: string;
  year: string;
}

export interface ExperienceEntry {
  role: string;
  /** As shown in an anonymised profile, e.g. "Grossbank, Zürich". */
  client: string;
  industry: string;
  /** YYYY-MM */
  from: string;
  /** YYYY-MM, empty while ongoing */
  to: string;
  description: string;
  technologies: string[];
}

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

export const candidates = pgTable(
  "candidates",
  {
    id: id(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("Schweiz"),
    nationality: text("nationality"),
    headline: text("headline"),
    disciplines: textArray("disciplines"),
    skills: textArray("skills"),
    sapModules: textArray("sap_modules"),
    detectedSkills: textArray("detected_skills"),
    seniority: text("seniority"),
    languages: jsonb("languages").$type<LanguageSkill[]>().notNull().default([]),
    certifications: textArray("certifications"),
    education: jsonb("education").$type<EducationEntry[]>().notNull().default([]),
    experience: jsonb("experience").$type<ExperienceEntry[]>().notNull().default([]),
    summary: text("summary"),
    engagement: text("engagement").notNull().default("offen"),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    workPermit: text("work_permit"),
    availableFrom: date("available_from", { mode: "string" }),
    workloadMin: smallint("workload_min"),
    workloadMax: smallint("workload_max"),
    rateAmount: numeric("rate_amount", { precision: 10, scale: 2, mode: "number" }),
    rateUnit: text("rate_unit"),
    salaryExpectation: integer("salary_expectation"),
    remote: text("remote"),
    regions: text("regions"),
    noticePeriod: text("notice_period"),
    source: text("source"),
    status: text("status").notNull().default("neu"),
    rating: smallint("rating"),
    notes: text("notes"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentNote: text("consent_note"),
    privacyInfoAt: timestamp("privacy_info_at", { withTimezone: true }),
    retentionUntil: date("retention_until", { mode: "string" }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("candidates_status_idx").on(t.status),
    index("candidates_retention_idx").on(t.retentionUntil),
    index("candidates_skills_idx").using("gin", t.skills),
    index("candidates_disciplines_idx").using("gin", t.disciplines),
  ],
);

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
    /** Candidate portal: who sees the vacancy ("keine", "ausgewaehlt", "alle"). */
    portalVisibility: text("portal_visibility").notNull().default("keine"),
    /** Title and description shown to candidates, without the end client's name. */
    portalTitle: text("portal_title"),
    portalDescription: text("portal_description"),
    /** Rate offered to the candidate (subcontractor rate), shown in the portal. */
    portalRate: numeric("portal_rate", { precision: 10, scale: 2, mode: "number" }),
    portalRateUnit: text("portal_rate_unit"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("mandates_status_idx").on(t.status), index("mandates_company_idx").on(t.companyId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    mandateId: ref("mandate_id")
      .notNull()
      .references(() => mandates.id, { onDelete: "cascade" }),
    candidateId: ref("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("vorgemerkt"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentNote: text("consent_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    profileVariant: text("profile_variant").notNull().default("anonym"),
    rateBuy: numeric("rate_buy", { precision: 10, scale: 2, mode: "number" }),
    rateSell: numeric("rate_sell", { precision: 10, scale: 2, mode: "number" }),
    rateUnit: text("rate_unit"),
    matchScore: smallint("match_score"),
    feedback: text("feedback"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("submissions_mandate_candidate_key").on(t.mandateId, t.candidateId),
    index("submissions_candidate_idx").on(t.candidateId),
  ],
);

export const contracts = pgTable(
  "contracts",
  {
    id: id(),
    number: text("number").notNull().unique(),
    template: text("template").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("entwurf"),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: ref("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    candidateId: ref("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "set null" }),
    parentId: ref("parent_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    validFrom: date("valid_from", { mode: "string" }),
    validUntil: date("valid_until", { mode: "string" }),
    signedAt: date("signed_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contracts_status_idx").on(t.status), index("contracts_company_idx").on(t.companyId)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    candidateId: ref("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "cascade" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "cascade" }),
    contractId: ref("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** "admin" or "kandidat" (uploaded in the candidate portal). */
    uploadedBy: text("uploaded_by").notNull().default("admin"),
    /** Portal uploads stay unconfirmed until Ferhat accepts them. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow(),
    /** AES-256-GCM, see crypto.ts */
    content: bytea("content").notNull(),
    /** Extracted text (CVs), encrypted like the content. */
    textContent: bytea("text_content"),
    createdAt: createdAt(),
  },
  (t) => [
    index("documents_candidate_idx").on(t.candidateId),
    index("documents_company_idx").on(t.companyId),
    index("documents_mandate_idx").on(t.mandateId),
    index("documents_contract_idx").on(t.contractId),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: id(),
    candidateId: ref("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
    companyId: ref("company_id").references(() => companies.id, { onDelete: "cascade" }),
    mandateId: ref("mandate_id").references(() => mandates.id, { onDelete: "cascade" }),
    contractId: ref("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("notiz"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_candidate_idx").on(t.candidateId),
    index("activities_company_idx").on(t.companyId),
    index("activities_mandate_idx").on(t.mandateId),
    index("activities_contract_idx").on(t.contractId),
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
    /** Short description without personal data, e.g. "Kandidat K-0042". */
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
    ipHash: text("ip_hash").notNull(),
    success: boolean("success").notNull(),
  },
  (t) => [index("login_attempts_ip_at_idx").on(t.ipHash, t.at), index("login_attempts_at_idx").on(t.at)],
);

/** Login for the candidate portal. One account per candidate. */
export const candidateAccounts = pgTable("candidate_accounts", {
  id: id(),
  candidateId: ref("candidate_id")
    .notNull()
    .unique()
    .references(() => candidates.id, { onDelete: "cascade" }),
  /** Login e-mail, stored in lower case. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  status: text("status").notNull().default("eingeladen"),
  /** SHA-256 of the one-time link token (invitation or password reset). */
  tokenHash: text("token_hash"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const candidateSessions = pgTable(
  "candidate_sessions",
  {
    id: text("id").primaryKey(),
    accountId: ref("account_id")
      .notNull()
      .references(() => candidateAccounts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("candidate_sessions_account_idx").on(t.accountId), index("candidate_sessions_expires_idx").on(t.expiresAt)],
);

/**
 * Changes a candidate proposes in the portal. They only reach the candidate record once
 * Ferhat confirms them. "stammdaten" requests carry a message only and are applied by hand.
 */
export const changeRequests = pgTable(
  "change_requests",
  {
    id: id(),
    candidateId: ref("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    message: text("message"),
    status: text("status").notNull().default("offen"),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("change_requests_candidate_idx").on(t.candidateId), index("change_requests_status_idx").on(t.status)],
);

/** Vacancies shared with individual candidates in the portal, and their answers. */
export const vacancyShares = pgTable(
  "vacancy_shares",
  {
    id: id(),
    mandateId: ref("mandate_id")
      .notNull()
      .references(() => mandates.id, { onDelete: "cascade" }),
    candidateId: ref("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    response: text("response").notNull().default("offen"),
    responseAt: timestamp("response_at", { withTimezone: true }),
    responseMessage: text("response_message"),
  },
  (t) => [
    uniqueIndex("vacancy_shares_mandate_candidate_key").on(t.mandateId, t.candidateId),
    index("vacancy_shares_candidate_idx").on(t.candidateId),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Mandate = typeof mandates.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type CandidateAccount = typeof candidateAccounts.$inferSelect;
export type ChangeRequest = typeof changeRequests.$inferSelect;
export type VacancyShare = typeof vacancyShares.$inferSelect;
