import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, like, lt, lte, not, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { SESSION_ABSOLUTE_MS as PORTAL_SESSION_ABSOLUTE_MS, SESSION_IDLE_MS as PORTAL_SESSION_IDLE_MS } from "@/lib/portal/session";
import { logActivity } from "./activities";
import { LOGIN_WINDOW_MINUTES, PER_ACCOUNT_LIMIT, PER_IP_LIMIT } from "./auth/rate-limit";
import { ABSOLUTE_MS as ADMIN_SESSION_ABSOLUTE_MS, IDLE_MS as ADMIN_SESSION_IDLE_MS } from "./auth/session";
import { consentMethodLabel } from "./consent";
import { outerColumn } from "./data/query";
import { audit } from "./audit";
import { getDb, type AdminDb } from "./db/client";
import {
  activities,
  candidateAccounts,
  candidates,
  changeRequests,
  companies,
  contracts,
  documents,
  mandates,
  submissions,
  vacancyShares,
  type Candidate,
  type EducationEntry,
  type ExperienceEntry,
} from "./db/schema";
import { addMonthsIso, displayNo, formatChf, formatDate, formatDateTime, formatLongDate, fullName, todayIso } from "./format";
import {
  activityKinds,
  candidateSources,
  candidateStatuses,
  changeSections,
  changeStatuses,
  contractStatuses,
  disciplines,
  documentKinds,
  engagements,
  labelOf,
  profileVariants,
  rateUnits,
  remoteOptions,
  seniorities,
  shareResponses,
  submissionStatuses,
  workPermits,
} from "./options";
import { kovaliParty, partyLine, type Party } from "./party";
import type { Block, DocModel } from "./render/model";

/** The candidate's own firm a profile was handed over through (submissions.subcontractor_company_id). */
const subcontractors = alias(companies, "subcontractor");

/**
 * Data protection under the Swiss DSG (SR 235.1) for the admin area: retention rules,
 * anonymisation and deletion of candidates, the access report (Art. 25 DSG) and the voluntary
 * record of processing activities (Art. 12 DSG). The constants here are the single source for
 * the Datenschutz pages and the PDFs, so the record and the tool cannot drift apart.
 *
 * Nothing here deletes automatically: every irreversible step needs Ferhat's confirmation.
 */

// --- Retention ------------------------------------------------------------------------------

/** Profiles without consent: at most six months (as promised on the website). */
export const RETENTION_MONTHS_WITHOUT_CONSENT = 6;
/** With documented consent for the talent pool: up to 24 months, renewable with a new consent. */
export const RETENTION_MONTHS_WITH_CONSENT = 24;
/** Contracts with clients and subcontractors, accounting records (Art. 958f OR). */
export const RETENTION_YEARS_BUSINESS_RECORDS = 10;
/**
 * Signed consent forms and NDAs with a person are proof, not business records: kept until
 * possible claims are time-barred, at most ten years (Art. 60 and 127 OR).
 */
export const RETENTION_YEARS_PROOF_MAX = 10;
/** Records due within this many days show up as "bald fällig". */
export const RETENTION_DUE_SOON_DAYS = 30;
/** Candidates without consent are flagged after this many days. */
export const CONSENT_MISSING_ALERT_DAYS = 30;
/** Access requests must be answered within 30 days (Art. 18 DSV). */
export const ACCESS_REQUEST_DAYS = 30;

export type RetentionState = "none" | "overdue" | "due" | "ok";

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Overdue once the retention date has passed; "due" within the next 30 days. */
export function retentionState(retentionUntil: string | null | undefined, today = todayIso()): RetentionState {
  if (!retentionUntil) return "none";
  if (retentionUntil < today) return "overdue";
  if (retentionUntil <= addDaysIso(today, RETENTION_DUE_SOON_DAYS)) return "due";
  return "ok";
}

/** Latest date a retention period may be extended to. */
export function maxRetentionDate(hasConsent: boolean, today = todayIso()): string {
  return addMonthsIso(today, hasConsent ? RETENTION_MONTHS_WITH_CONSENT : RETENTION_MONTHS_WITHOUT_CONSENT);
}

/** Error message for an extension that breaks the retention rules, or null when it is fine. */
export function retentionExtensionError(newDate: string, hasConsent: boolean, today = todayIso()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return "Bitte ein gültiges Datum eingeben.";
  if (newDate <= today) return "Das neue Datum muss in der Zukunft liegen.";
  const max = maxRetentionDate(hasConsent, today);
  if (newDate > max) {
    return hasConsent
      ? `Mit Einwilligung höchstens ${RETENTION_MONTHS_WITH_CONSENT} Monate, also bis ${formatDate(max)}.`
      : `Ohne Einwilligung höchstens ${RETENTION_MONTHS_WITHOUT_CONSENT} Monate, also bis ${formatDate(max)}. Für länger zuerst die Einwilligung einholen.`;
  }
  return null;
}

// --- Anonymisation ----------------------------------------------------------------------------

export const ANONYMISED_FIRST_NAME = "Anonymisiert";

/** SQL condition for candidates that were anonymised (they stay only for statistics). */
export const isAnonymisedSql = sql`(${candidates.firstName} = ${ANONYMISED_FIRST_NAME} and ${candidates.lastName} ~ '^K-[0-9]+$')`;

export function isAnonymised(c: Pick<Candidate, "id" | "firstName" | "lastName">): boolean {
  return c.firstName === ANONYMISED_FIRST_NAME && c.lastName === displayNo.candidate(c.id);
}

/**
 * Career entries keep role, industry, period and technologies (useful for statistics and not
 * identifying on their own); client names and free-text descriptions go.
 */
export function anonymiseExperience(entries: ExperienceEntry[]): ExperienceEntry[] {
  return entries.map((e) => ({ role: e.role, client: "", industry: e.industry, from: e.from, to: e.to, description: "", technologies: e.technologies }));
}

/** Education keeps title and year; the institution together with the year can identify a person. */
export function anonymiseEducation(entries: EducationEntry[]): EducationEntry[] {
  return entries.map((e) => ({ title: e.title, institution: "", year: e.year }));
}

/**
 * Column values that replace a candidate's personal data. Skills, disciplines, seniority,
 * languages, certificates, rate and availability stay: without a name they do not identify
 * anyone and still show which profiles KOVALI worked with.
 */
export function anonymisedCandidateValues(c: Pick<Candidate, "id" | "experience" | "education">) {
  return {
    firstName: ANONYMISED_FIRST_NAME,
    lastName: displayNo.candidate(c.id),
    email: null,
    phone: null,
    dateOfBirth: null,
    street: null,
    postalCode: null,
    city: null,
    nationality: null,
    summary: null,
    notes: null,
    consentAt: null,
    consentNote: null,
    // The date of an objection stays, so the profile is never passed on again; the note goes.
    objectionNote: null,
    salaryExpectation: null,
    rating: null,
    regions: null,
    companyId: null,
    lastContactAt: null,
    experience: anonymiseExperience(c.experience ?? []),
    education: anonymiseEducation(c.education ?? []),
    status: "archiviert",
    retentionUntil: null,
    updatedAt: new Date(),
  } satisfies Partial<typeof candidates.$inferInsert>;
}

type Tx = Parameters<Parameters<AdminDb["transaction"]>[0]>[0];

/**
 * Up to October 2026, sharing a vacancy wrote one entry on the mandate alone, «Im
 * Kandidatenportal geteilt mit: Vorname Name (K-0042), …», which outlived the anonymisation or
 * deletion of the people it names. Today each share is an entry of the candidate and the mandate.
 */
export const LEGACY_SHARE_PREFIX = "Im Kandidatenportal geteilt mit:";

/** Replaces «Name (K-0042)» by «K-0042» in a legacy share entry, for each given number. */
export function scrubSharedNames(body: string, numbers: Iterable<string>): string {
  let out = body;
  for (const no of numbers) {
    if (!/^K-\d+$/.test(no)) continue;
    out = out.replace(new RegExp(`(: |, )[^,]*\\(${no}\\)`, "g"), `$1${no}`);
  }
  return out;
}

/**
 * Removes names from the legacy share entries: the given candidate's, and those of everyone
 * already anonymised or deleted (a one-off cleanup of older cases, done with the next
 * anonymisation or deletion). Names of people still in the pool stay.
 */
async function scrubLegacyShareEntries(tx: Tx, id: number): Promise<number> {
  const rows = await tx
    .select({ id: activities.id, body: activities.body })
    .from(activities)
    .where(and(isNull(activities.candidateId), isNotNull(activities.mandateId), like(activities.body, `${LEGACY_SHARE_PREFIX}%`)))
    .for("update");
  if (!rows.length) return 0;
  const named = new Set<number>();
  for (const r of rows) for (const m of r.body.matchAll(/\(K-(\d+)\)/g)) named.add(Number(m[1]));
  named.delete(id);
  const present = named.size
    ? await tx.select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName }).from(candidates).where(inArray(candidates.id, [...named]))
    : [];
  const keep = new Set(present.filter((c) => !isAnonymised(c)).map((c) => c.id));
  const scrub = [id, ...[...named].filter((n) => !keep.has(n))].map((n) => displayNo.candidate(n));
  let changed = 0;
  for (const r of rows) {
    const body = scrubSharedNames(r.body, scrub);
    if (body === r.body) continue;
    await tx.update(activities).set({ body }).where(eq(activities.id, r.id));
    changed++;
  }
  return changed;
}

/**
 * Contracts stay after an anonymisation or deletion (retention), but their titles name the
 * person («Einwilligung Profilweitergabe Vorname Name – …»): the number replaces the name, so
 * the contract list no longer finds or shows the person.
 */
async function removeNameFromContractTitles(tx: Tx, c: Pick<Candidate, "id" | "firstName" | "lastName">): Promise<number> {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (!name || isAnonymised(c)) return 0;
  const rows = await tx
    .update(contracts)
    .set({ title: sql`replace(${contracts.title}, ${name}, ${displayNo.candidate(c.id)})`, updatedAt: new Date() })
    .where(and(eq(contracts.candidateId, c.id), sql`strpos(${contracts.title}, ${name}) > 0`))
    .returning({ id: contracts.id });
  return rows.length;
}

export interface AnonymiseResult {
  documents: number;
  changeRequests: number;
  portalAccount: boolean;
  vacancyShares: number;
  activities: number;
  submissions: number;
}

/**
 * Anonymises a candidate in one transaction: personal fields are cleared (see
 * anonymisedCandidateValues), documents, portal account (sessions cascade), change requests,
 * vacancy shares and history entries are deleted. Submissions stay as statistics without
 * notes, feedback, consent and withdrawal notes or the link to the candidate's own firm.
 * Contracts are kept (retention), with the number instead of the name in their titles.
 * Activities shared with a mandate are deleted too, because their text names the candidate;
 * legacy share entries on the mandate alone keep only the number.
 */
export async function anonymiseCandidate(id: number): Promise<AnonymiseResult | null> {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [c] = await tx
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName, experience: candidates.experience, education: candidates.education })
      .from(candidates)
      .where(eq(candidates.id, id))
      .for("update")
      .limit(1);
    if (!c) return null;
    await removeNameFromContractTitles(tx, c);
    await tx.update(candidates).set(anonymisedCandidateValues(c)).where(eq(candidates.id, id));
    const docs = await tx.delete(documents).where(eq(documents.candidateId, id)).returning({ id: documents.id });
    const changes = await tx.delete(changeRequests).where(eq(changeRequests.candidateId, id)).returning({ id: changeRequests.id });
    const accounts = await tx.delete(candidateAccounts).where(eq(candidateAccounts.candidateId, id)).returning({ id: candidateAccounts.id });
    const shares = await tx.delete(vacancyShares).where(eq(vacancyShares.candidateId, id)).returning({ id: vacancyShares.id });
    const acts = await tx.delete(activities).where(eq(activities.candidateId, id)).returning({ id: activities.id });
    const subs = await tx
      .update(submissions)
      .set({ notes: null, feedback: null, consentNote: null, withdrawalNote: null, subcontractorCompanyId: null, updatedAt: new Date() })
      .where(eq(submissions.candidateId, id))
      .returning({ id: submissions.id });
    await scrubLegacyShareEntries(tx, id);
    return {
      documents: docs.length,
      changeRequests: changes.length,
      portalAccount: accounts.length > 0,
      vacancyShares: shares.length,
      activities: acts.length,
      submissions: subs.length,
    };
  });
  if (!result) return null;
  await audit("anonymise", { entity: "candidate", entityId: id, summary: `Kandidat ${displayNo.candidate(id)} anonymisiert` });
  await logActivity({ type: "candidate", id }, "Anonymisiert");
  return result;
}

/**
 * Deletes the candidate row in one transaction, without an audit entry (the callers write
 * their own). Documents, history, submissions, portal account and shares go with it (on delete
 * cascade); contracts stay (retention duty), lose the link and keep only the number in their
 * titles. Signed contract files belong to the contract (a document has exactly one owner), so
 * they stay too. Legacy share entries on mandates keep only the number.
 */
export async function deleteCandidateRecord(id: number): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [c] = await tx
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName })
      .from(candidates)
      .where(eq(candidates.id, id))
      .for("update")
      .limit(1);
    if (!c) return false;
    await removeNameFromContractTitles(tx, c);
    await tx.delete(candidates).where(eq(candidates.id, id));
    await scrubLegacyShareEntries(tx, id);
    return true;
  });
}

/** Deletes a candidate for good (Datenschutz), see deleteCandidateRecord. */
export async function deleteCandidatePermanently(id: number): Promise<boolean> {
  if (!(await deleteCandidateRecord(id))) return false;
  await audit("delete", { entity: "candidate", entityId: id, summary: `Kandidat ${displayNo.candidate(id)} gelöscht (Datenschutz)` });
  return true;
}

// --- Lists for the Datenschutz pages ------------------------------------------------------------


const listColumns = {
  id: candidates.id,
  firstName: candidates.firstName,
  lastName: candidates.lastName,
  status: candidates.status,
  consentAt: candidates.consentAt,
  retentionUntil: candidates.retentionUntil,
  createdAt: candidates.createdAt,
  lastContactAt: candidates.lastContactAt,
  source: candidates.source,
};

/** Signed consent forms and NDAs with a person (no company): proof, not business records. */
const proofContractSql = sql`(${contracts.template} = 'einwilligung' or (${contracts.template} = 'nda' and ${contracts.companyId} is null))`;

/**
 * A candidate's retained contracts by basis, for the confirm texts of anonymise and delete:
 * business contracts (10 years, Art. 958f OR) and proofs (until time-barred, at most 10 years).
 */
export const retainedContractCounts = {
  contracts: sql<number>`(select count(*) from ${contracts} where ${contracts.candidateId} = ${outerColumn(candidates.id)} and not ${proofContractSql})`.mapWith(Number),
  proofContracts: sql<number>`(select count(*) from ${contracts} where ${contracts.candidateId} = ${outerColumn(candidates.id)} and ${proofContractSql})`.mapWith(Number),
};

/** Candidates whose retention date has passed or falls within the next 30 days. */
export async function retentionDue(today = todayIso()) {
  const db = await getDb();
  const until = addDaysIso(today, RETENTION_DUE_SOON_DAYS);
  const rows = await db
    .select({
      ...listColumns,
      documents: sql<number>`(select count(*) from ${documents} where ${documents.candidateId} = ${outerColumn(candidates.id)})`.mapWith(Number),
      ...retainedContractCounts,
    })
    .from(candidates)
    .where(and(isNotNull(candidates.retentionUntil), lte(candidates.retentionUntil, until), not(isAnonymisedSql)))
    .orderBy(asc(candidates.retentionUntil), asc(candidates.id))
    .limit(200);
  return {
    overdue: rows.filter((r) => retentionState(r.retentionUntil, today) === "overdue"),
    dueSoon: rows.filter((r) => retentionState(r.retentionUntil, today) === "due"),
  };
}

/** Candidates without a retention date (cannot be checked automatically). */
export async function withoutRetentionDate() {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(candidates)
    .where(and(isNull(candidates.retentionUntil), not(isAnonymisedSql)));
  return row?.n ?? 0;
}

export async function candidatesWithoutConsent() {
  const db = await getDb();
  return db
    .select(listColumns)
    .from(candidates)
    .where(and(isNull(candidates.consentAt), not(isAnonymisedSql)))
    .orderBy(asc(candidates.createdAt))
    .limit(200);
}

/**
 * Submissions waiting for consent, and submissions that are already with a client although no
 * consent is recorded (should not happen; the database refuses it once submittedAt is set).
 */
export async function submissionsWithoutConsent() {
  const db = await getDb();
  return db
    .select({
      id: submissions.id,
      status: submissions.status,
      createdAt: submissions.createdAt,
      candidateId: submissions.candidateId,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      mandateId: submissions.mandateId,
      mandateTitle: mandates.title,
      company: companies.name,
    })
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
    .leftJoin(companies, eq(companies.id, mandates.companyId))
    .where(
      sql`(${submissions.status} = 'einwilligung_offen' or (${submissions.consentAt} is null and ${submissions.status} in ('vorgeschlagen', 'interview', 'angebot', 'zusage')))`,
    )
    .orderBy(asc(submissions.createdAt))
    .limit(200);
}

/** Numbers for the dashboard and the overview. */
export async function privacyCounts(today = todayIso()) {
  const db = await getDb();
  const consentCutoff = new Date(`${addDaysIso(today, -CONSENT_MISSING_ALERT_DAYS)}T00:00:00Z`);
  const [[overdue], [dueSoon], [noConsent], [pendingSubmissions]] = await Promise.all([
    db.select({ n: count() }).from(candidates).where(and(isNotNull(candidates.retentionUntil), lt(candidates.retentionUntil, today), not(isAnonymisedSql))),
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(gte(candidates.retentionUntil, today), lte(candidates.retentionUntil, addDaysIso(today, RETENTION_DUE_SOON_DAYS)), not(isAnonymisedSql))),
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(isNull(candidates.consentAt), lt(candidates.createdAt, consentCutoff), not(isAnonymisedSql))),
    db.select({ n: count() }).from(submissions).where(eq(submissions.status, "einwilligung_offen")),
  ]);
  return {
    overdue: overdue?.n ?? 0,
    dueSoon: dueSoon?.n ?? 0,
    noConsentOld: noConsent?.n ?? 0,
    submissionsAwaitingConsent: pendingSubmissions?.n ?? 0,
  };
}

/** Flag-only summary for a scheduled job: numbers, never names, never deletes anything. */
export async function retentionDueSummary(today = todayIso()) {
  const c = await privacyCounts(today);
  return { overdue: c.overdue, dueSoon: c.dueSoon };
}

// --- Record of processing activities (Art. 12 DSG, voluntary) -----------------------------------

export interface Processor {
  name: string;
  service: string;
  location: string;
  transfer: string;
}

export const PROCESSORS: Processor[] = [
  {
    name: "Vercel Inc., USA",
    service: "Hosting der Website, des Admin-Bereichs und des Kandidatenportals (Server-Funktionen in der Region Frankfurt, fra1)",
    location: "Deutschland (Funktionen); Verwaltung und Support aus den USA",
    transfer: "USA: Swiss-U.S. Data Privacy Framework (Anhang 1 DSV seit 15.9.2024), Zertifizierung jährlich auf dataprivacyframework.gov prüfen",
  },
  {
    name: "Neon Inc. (Databricks), USA",
    service: "Postgres-Datenbank des Admin-Bereichs, betrieben auf Amazon Web Services",
    location: "AWS-Region Frankfurt, Deutschland",
    transfer: "Deutschland: angemessener Schutz (Anhang 1 DSV). Zugriff aus den USA möglich: DPF-Status prüfen, sonst Standardvertragsklauseln",
  },
  {
    name: "Resend Inc., USA",
    service: "Versand von E-Mails (Kontaktformular, Einladungen und Links des Kandidatenportals)",
    location: "USA / EU",
    transfer: "USA: DPF-Zertifizierung prüfen, sonst Standardvertragsklauseln (vom EDÖB anerkannt)",
  },
];

export const PURPOSES = [
  "Prüfung und Vorschlag von Fachpersonen (IT- und SAP-Spezialistinnen und -Spezialisten) für konkrete Mandate von Auftraggebern, als Subunternehmer oder über ihre eigene Firma",
  "Pflege der Profile und Abgleich mit Mandaten (Matching als Rangfolge nach Kompetenzen; jeder Entscheid wird von Ferhat Demir getroffen)",
  "Abschluss und Abwicklung von Verträgen mit Auftraggebern und Subunternehmern",
  "Kandidatenportal: Fachpersonen pflegen ihr Profil, sehen freigegebene Vakanzen und melden Interesse",
  "Sicherheit und Nachweis: Anmeldeschutz, Protokoll der Zugriffe und Änderungen (ohne Personendaten im Protokoll)",
];

export const DATA_SUBJECTS = [
  "Kandidatinnen und Kandidaten (Fachpersonen, die sich bewerben, empfohlen oder angesprochen werden)",
  "Kontaktpersonen bei Auftraggebern, Endkunden, Subunternehmern und Partnern",
  "Ferhat Demir als Benutzer des Admin-Bereichs",
];

export const DATA_CATEGORIES = [
  "Stammdaten: Name, E-Mail, Telefon, Adresse, Geburtsdatum, Nationalität, Aufenthaltsbewilligung",
  "Beruflicher Werdegang, Projekte, Ausbildung, Zertifikate, Sprachen, Kompetenzen",
  "Konditionen: Verfügbarkeit, Pensum, Stunden- oder Tagessatz, Lohnvorstellung, Kündigungsfrist",
  "Dokumente: Lebenslauf, Zeugnisse, Diplome, Zertifikate, Einwilligungen, unterzeichnete Verträge (verschlüsselt)",
  "Einwilligungen, Vorschläge an Auftraggeber mit Datum und Empfänger, Rückmeldungen",
  "Notizen und Verlauf (Telefonate, E-Mails, Termine)",
  "Portal-Konto: Login-E-Mail, Passwort-Hash, Zeitpunkt der letzten Anmeldung",
  "Kontaktpersonen: Name, Funktion, E-Mail, Telefon",
  "Technische Daten: Hash der IP-Adresse, Browser-Kennung der Sitzung",
];

export const SENSITIVE_DATA_NOTE =
  "Besonders schützenswerte Personendaten (Art. 5 lit. c DSG, z. B. Gesundheit, Religion) werden nicht gezielt erhoben. Stehen sie in einem Lebenslauf, bleiben sie verschlüsselt gespeichert und werden ohne ausdrückliche Einwilligung nicht weitergegeben.";

export const RECIPIENTS = [
  "Auftraggeber (IT-Dienstleister und Beratungsfirmen, z. B. GHR Group, Coopers Group, Adnovum, Digital Delivery): nur mit Einwilligung der Person für das konkrete Mandat, anonymisiert oder mit Namen",
  "Endkunden erhalten Profile nur über den jeweiligen Auftraggeber",
  "Auftragsbearbeiter (siehe unten), ausschliesslich zur Erbringung ihrer Dienste",
];

export const CROSS_BORDER = [
  "Die Datenbank liegt in Frankfurt (Deutschland). Deutschland bietet nach Anhang 1 DSV einen angemessenen Schutz.",
  "Vercel, Neon und Resend sind US-Unternehmen. Die USA gelten seit 15.9.2024 nur für Firmen mit Zertifizierung unter dem Swiss-U.S. Data Privacy Framework als angemessen. Die Zertifizierung jedes Anbieters ist jährlich zu prüfen; fehlt sie, braucht es Standardvertragsklauseln (Art. 16 Abs. 2 lit. d DSG).",
];

const hours = (ms: number) => ms / 3_600_000;
const days = (ms: number) => ms / 86_400_000;

export const RETENTION_RULES = [
  `Kandidatenprofile ohne Einwilligung: höchstens ${RETENTION_MONTHS_WITHOUT_CONSENT} Monate ab Erfassung, danach Anonymisierung oder Löschung`,
  `Kandidatenprofile mit dokumentierter Einwilligung (Talent-Pool): bis ${RETENTION_MONTHS_WITH_CONSENT} Monate, verlängerbar nur mit erneuter Einwilligung`,
  `Verträge mit Auftraggebern und Subunternehmern, Buchungsbelege: ${RETENTION_YEARS_BUSINESS_RECORDS} Jahre (Art. 958f OR)`,
  `Unterzeichnete Einwilligungen und Geheimhaltungsvereinbarungen mit Personen: als Nachweis bis zum Ablauf der Verjährung möglicher Ansprüche, höchstens ${RETENTION_YEARS_PROOF_MAX} Jahre (Art. 60 und 127 OR); keine Aufbewahrungspflicht nach Art. 958f OR. Nach einer Anonymisierung oder Löschung steht im Titel nur noch die Nummer`,
  "Vorschläge an Auftraggeber: bleiben nach einer Anonymisierung als Statistik ohne Namen, Notizen und Rückmeldungen",
  `Anmeldeversuche: 30 Tage; Sitzungen Admin-Bereich: höchstens ${hours(ADMIN_SESSION_ABSOLUTE_MS)} Stunden; Sitzungen Kandidatenportal: höchstens ${days(PORTAL_SESSION_ABSOLUTE_MS)} Tage`,
  "Audit-Log: ohne Personendaten (nur Nummern), dient dem Nachweis der Zugriffe",
];

export const TOMS = [
  "Verschlüsselung: Dokumente und Lebenslauftexte mit AES-256-GCM vor dem Speichern; Übertragung nur über TLS (HSTS)",
  `Zugang: nur Ferhat Demir; Passwort als PBKDF2-SHA256-Hash (600’000 Iterationen); Zwei-Faktor-Code (TOTP) empfohlen; höchstens ${PER_IP_LIMIT} Fehlversuche pro IP in ${LOGIN_WINDOW_MINUTES} Minuten, im Kandidatenportal zusätzlich höchstens ${PER_ACCOUNT_LIMIT} pro Konto`,
  `Sitzungen: Cookie HttpOnly/Secure/SameSite; Admin-Bereich Ende nach ${hours(ADMIN_SESSION_ABSOLUTE_MS)} Stunden oder ${hours(ADMIN_SESSION_IDLE_MS)} Stunden ohne Aktivität; Kandidatenportal Ende nach ${days(PORTAL_SESSION_ABSOLUTE_MS)} Tagen oder ${hours(PORTAL_SESSION_IDLE_MS)} Stunden ohne Aktivität; alle Sitzungen beendbar`,
  "Protokoll: jede Anmeldung, Änderung, jeder Dokumentabruf und Export im Audit-Log, ohne Namen",
  "Keine Indexierung und kein Zwischenspeichern: noindex, Cache-Control private/no-store für Admin und Portal",
  "Weitergabe an Auftraggeber technisch nur mit erfasster Einwilligung je Mandat (Datenbank-Regel)",
  "Aufbewahrung: Liste fälliger Profile mit Anonymisierung oder Löschung nach Bestätigung",
];

export const AUTOMATED_DECISIONS_NOTE =
  "Das Matching ordnet Profile nach Übereinstimmung mit den Anforderungen eines Mandats (Kompetenzen, Erfahrung, Verfügbarkeit, Pensum, Satz). Es ist ein Hilfsmittel; jeder Entscheid, ob ein Profil vorgeschlagen wird, wird von einer Person getroffen. Es gibt keine automatisierten Einzelentscheidungen (Art. 21 DSG).";

export const BREACH_NOTE =
  "Verletzungen der Datensicherheit, die voraussichtlich zu einem hohen Risiko für die Betroffenen führen, meldet KOVALI so rasch als möglich dem EDÖB (Art. 24 DSG) und informiert die Betroffenen, wenn es zu ihrem Schutz nötig ist. Auftragsbearbeiter melden Vorfälle unverzüglich an KOVALI.";

function partyBlockLines(p: Party): string[] {
  return [`${p.name} (KOVALI)`, p.owner, p.street, `${p.postalCode} ${p.city}`, p.email];
}

/** The record of processing activities as a document (PDF on the Datenschutz page). */
export function processingRecordDocModel(now = new Date()): DocModel {
  const p = kovaliParty();
  const list = (items: string[]): Block => ({ type: "list", items });
  return {
    docType: "Verzeichnis der Bearbeitungstätigkeiten",
    title: `Verzeichnis der Bearbeitungstätigkeiten KOVALI ${todayIso(now)}`,
    reference: `Stand ${formatDate(now)}`,
    footer: partyLine(p),
    blocks: [
      { type: "title", text: "Verzeichnis der Bearbeitungstätigkeiten", subtitle: "nach Art. 12 DSG (freiwillig geführt)" },
      {
        type: "paragraph",
        muted: true,
        text: "Unternehmen mit weniger als 250 Mitarbeitenden sind von der Pflicht befreit, solange sie nicht umfangreich besonders schützenswerte Personendaten bearbeiten oder Profiling mit hohem Risiko betreiben (Art. 24 DSV). KOVALI führt das Verzeichnis freiwillig als Nachweis.",
      },
      { type: "heading", text: "Verantwortlicher", number: "1" },
      {
        type: "facts",
        rows: [
          { label: "Firma", value: `${p.name} (KOVALI)` },
          { label: "Rechtsform", value: p.legalForm },
          { label: "Inhaber", value: p.owner },
          { label: "Adresse", value: `${p.street}, ${p.postalCode} ${p.city}, ${p.country}` },
          { label: "Kontakt Datenschutz", value: p.email },
          { label: "UID", value: p.uid ?? "–" },
        ],
      },
      { type: "heading", text: "Zwecke der Bearbeitung", number: "2" },
      list(PURPOSES),
      { type: "heading", text: "Betroffene Personen", number: "3" },
      list(DATA_SUBJECTS),
      { type: "heading", text: "Kategorien von Personendaten", number: "4" },
      list(DATA_CATEGORIES),
      { type: "paragraph", text: SENSITIVE_DATA_NOTE, small: true },
      { type: "heading", text: "Empfänger", number: "5" },
      list(RECIPIENTS),
      { type: "heading", text: "Auftragsbearbeiter", number: "6" },
      {
        type: "table",
        columns: [{ label: "Anbieter", width: 1.2 }, { label: "Leistung", width: 2 }, { label: "Speicherort", width: 1.3 }],
        rows: PROCESSORS.map((x) => [x.name, x.service, x.location]),
      },
      { type: "heading", text: "Bekanntgabe ins Ausland", number: "7" },
      list([...CROSS_BORDER, ...PROCESSORS.map((x) => `${x.name}: ${x.transfer}`)]),
      { type: "heading", text: "Aufbewahrung und Löschung", number: "8" },
      list(RETENTION_RULES),
      { type: "heading", text: "Technische und organisatorische Massnahmen", number: "9" },
      list(TOMS),
      { type: "heading", text: "Automatisierte Entscheide und Profiling", number: "10" },
      { type: "paragraph", text: AUTOMATED_DECISIONS_NOTE },
      { type: "heading", text: "Datensicherheitsverletzungen", number: "11" },
      { type: "paragraph", text: BREACH_NOTE },
      { type: "spacer", size: "md" },
      { type: "paragraph", small: true, muted: true, text: `Erstellt am ${formatLongDate(now)} aus dem KOVALI Admin-Bereich. Jährlich und bei Änderungen der Dienstleister prüfen.` },
    ],
  };
}

// --- Access report (Art. 25 DSG) --------------------------------------------------------------

/** What the access report leaves out, and why (Art. 26 Abs. 4 DSG: a restriction is stated). */
export const DISCLOSURE_RESTRICTION =
  "Nicht enthalten sind die Inhalte der Dokumente (Kopien senden wir Ihnen auf Wunsch zu) und die Verkaufskonditionen von KOVALI gegenüber Auftraggebern. Diese hält KOVALI als Geschäftsgeheimnis zurück (Art. 26 Abs. 2 DSG); den Satz, den KOVALI Ihrer Firma zahlt, finden Sie bei den Weitergaben.";

/**
 * Everything KOVALI holds about one candidate, in a machine-readable form (also for data
 * portability, Art. 28 DSG). Document contents are not included, only their list; the person
 * can ask for copies separately.
 */
export async function buildDisclosure(id: number, now = new Date()) {
  const db = await getDb();
  const [c] = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  if (!c) return null;
  const [ownCompany, docs, subs, shares, changes, acts, account, contractRows] = await Promise.all([
    c.companyId ? db.select({ name: companies.name }).from(companies).where(eq(companies.id, c.companyId)).limit(1) : Promise.resolve([]),
    db
      .select({
        filename: documents.filename,
        kind: documents.kind,
        sizeBytes: documents.sizeBytes,
        uploadedBy: documents.uploadedBy,
        confirmedAt: documents.confirmedAt,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.candidateId, id))
      .orderBy(asc(documents.createdAt)),
    db
      .select({
        id: submissions.id,
        mandateId: submissions.mandateId,
        mandateTitle: mandates.title,
        company: companies.name,
        endClient: mandates.endClient,
        status: submissions.status,
        profileVariant: submissions.profileVariant,
        consentAt: submissions.consentAt,
        consentMethod: submissions.consentMethod,
        consentNote: submissions.consentNote,
        withdrawnAt: submissions.withdrawnAt,
        withdrawalNote: submissions.withdrawalNote,
        submittedAt: submissions.submittedAt,
        subcontractor: subcontractors.name,
        matchScore: submissions.matchScore,
        rateBuy: submissions.rateBuy,
        rateUnit: submissions.rateUnit,
        feedback: submissions.feedback,
        notes: submissions.notes,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(mandates, eq(mandates.id, submissions.mandateId))
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .leftJoin(subcontractors, eq(subcontractors.id, submissions.subcontractorCompanyId))
      .where(eq(submissions.candidateId, id))
      .orderBy(asc(submissions.createdAt)),
    db
      .select({
        mandateId: vacancyShares.mandateId,
        title: sql<string>`coalesce(${mandates.portalTitle}, ${mandates.title})`,
        sharedAt: vacancyShares.sharedAt,
        seenAt: vacancyShares.seenAt,
        response: vacancyShares.response,
        responseAt: vacancyShares.responseAt,
        responseMessage: vacancyShares.responseMessage,
      })
      .from(vacancyShares)
      .innerJoin(mandates, eq(mandates.id, vacancyShares.mandateId))
      .where(eq(vacancyShares.candidateId, id))
      .orderBy(asc(vacancyShares.sharedAt)),
    db
      .select({
        section: changeRequests.section,
        status: changeRequests.status,
        message: changeRequests.message,
        payload: changeRequests.payload,
        createdAt: changeRequests.createdAt,
        reviewedAt: changeRequests.reviewedAt,
        reviewNote: changeRequests.reviewNote,
      })
      .from(changeRequests)
      .where(eq(changeRequests.candidateId, id))
      .orderBy(asc(changeRequests.createdAt)),
    db
      .select({ kind: activities.kind, body: activities.body, createdAt: activities.createdAt })
      .from(activities)
      .where(eq(activities.candidateId, id))
      .orderBy(desc(activities.createdAt)),
    db
      .select({ email: candidateAccounts.email, status: candidateAccounts.status, createdAt: candidateAccounts.createdAt, lastLoginAt: candidateAccounts.lastLoginAt })
      .from(candidateAccounts)
      .where(eq(candidateAccounts.candidateId, id))
      .limit(1),
    db
      .select({ number: contracts.number, title: contracts.title, status: contracts.status, validFrom: contracts.validFrom, validUntil: contracts.validUntil })
      .from(contracts)
      .where(eq(contracts.candidateId, id))
      .orderBy(asc(contracts.createdAt)),
  ]);

  const p = kovaliParty();
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    erstelltAm: now.toISOString(),
    rechtsgrundlage: "Auskunft nach Art. 25 DSG; maschinenlesbare Herausgabe nach Art. 28 DSG",
    verantwortlicher: {
      name: `${p.name} (KOVALI)`,
      inhaber: p.owner,
      adresse: `${p.street}, ${p.postalCode} ${p.city}, ${p.country}`,
      email: p.email,
    },
    person: {
      nummer: displayNo.candidate(c.id),
      vorname: c.firstName,
      nachname: c.lastName,
      email: c.email,
      telefon: c.phone,
      geburtsdatum: c.dateOfBirth,
      strasse: c.street,
      plz: c.postalCode,
      ort: c.city,
      land: c.country,
      nationalitaet: c.nationality,
      aufenthaltsbewilligung: c.workPermit ? labelOf(workPermits, c.workPermit) : null,
      eigeneFirma: ownCompany[0]?.name ?? null,
    },
    profil: {
      titel: c.headline,
      kurzprofil: c.summary,
      schwerpunkte: c.disciplines.map((d) => labelOf(disciplines, d)),
      kompetenzen: c.skills,
      sapModule: c.sapModules,
      ausLebenslaufErkannt: c.detectedSkills,
      erfahrungsstufe: c.seniority ? labelOf(seniorities, c.seniority) : null,
      sprachen: c.languages,
      zertifikate: c.certifications,
      ausbildung: c.education,
      werdegang: c.experience,
    },
    konditionen: {
      zusammenarbeit: labelOf(engagements, c.engagement),
      verfuegbarAb: c.availableFrom,
      pensumMin: c.workloadMin,
      pensumMax: c.workloadMax,
      satz: c.rateAmount,
      satzEinheit: c.rateUnit ? labelOf(rateUnits, c.rateUnit) : null,
      lohnvorstellung: c.salaryExpectation,
      arbeitsmodell: c.remote ? labelOf(remoteOptions, c.remote) : null,
      regionen: c.regions,
      kuendigungsfrist: c.noticePeriod,
    },
    interneAngaben: {
      status: labelOf(candidateStatuses, c.status),
      bewertung: c.rating,
      notizen: c.notes,
      letzterKontakt: iso(c.lastContactAt),
      erfasstAm: iso(c.createdAt),
      geaendertAm: iso(c.updatedAt),
    },
    herkunft: c.source ? labelOf(candidateSources, c.source) : "Nicht erfasst",
    zweck: PURPOSES,
    einwilligung: {
      allgemein: iso(c.consentAt),
      vermerk: c.consentNote,
      datenschutzhinweisErhalten: iso(c.privacyInfoAt),
      /** Objection to any hand-over of the profile to clients (until lifted). */
      widerspruch: c.objectionAt ? { am: iso(c.objectionAt), vermerk: c.objectionNote } : null,
    },
    aufbewahrung: {
      bis: c.retentionUntil,
      regeln: RETENTION_RULES,
    },
    dokumente: docs.map((d) => ({
      dateiname: d.filename,
      art: labelOf(documentKinds, d.kind),
      groesseBytes: d.sizeBytes,
      hochgeladenAm: iso(d.createdAt),
      hochgeladenVon: d.uploadedBy === "kandidat" ? "Kandidat (Portal)" : "KOVALI",
      bestaetigtAm: iso(d.confirmedAt),
    })),
    empfaenger: {
      weitergaben: subs.map((s) => ({
        vorschlag: displayNo.submission(s.id),
        mandat: `${displayNo.mandate(s.mandateId)} ${s.mandateTitle}`,
        empfaengerFirma: s.company,
        endkunde: s.endClient,
        status: labelOf(submissionStatuses, s.status),
        profil: labelOf(profileVariants, s.profileVariant),
        einwilligungAm: iso(s.consentAt),
        einwilligungForm: s.consentMethod ? consentMethodLabel(s.consentMethod) : null,
        einwilligungVermerk: s.consentNote,
        widerrufenAm: iso(s.withdrawnAt),
        widerrufVermerk: s.withdrawalNote,
        weitergegebenAm: iso(s.submittedAt),
        weitergegebenUeber: s.subcontractor,
        /** Ranking aid of the matching (0–100), see automatisierteEntscheide. */
        matchingScore: s.matchScore,
        /** What KOVALI pays the person's firm; KOVALI's sell rate to the client is withheld (nichtEnthalten). */
        satzIhreFirma: s.rateBuy !== null ? `${formatChf(s.rateBuy)} ${s.rateUnit ? labelOf(rateUnits, s.rateUnit) : ""}`.trim() : null,
        rueckmeldung: s.feedback,
        notizen: s.notes,
        erfasstAm: iso(s.createdAt),
      })),
      auftragsbearbeiter: PROCESSORS,
      bekanntgabeAusland: CROSS_BORDER,
    },
    kandidatenportal: {
      konto: account[0]
        ? { email: account[0].email, status: account[0].status, erstelltAm: iso(account[0].createdAt), letzteAnmeldung: iso(account[0].lastLoginAt) }
        : null,
      freigegebeneVakanzen: shares.map((s) => ({
        vakanz: `${displayNo.mandate(s.mandateId)} ${s.title}`,
        freigegebenAm: iso(s.sharedAt),
        gesehenAm: iso(s.seenAt),
        antwort: labelOf(shareResponses, s.response),
        antwortAm: iso(s.responseAt),
        nachricht: s.responseMessage,
      })),
      aenderungsantraege: changes.map((ch) => ({
        bereich: labelOf(changeSections, ch.section),
        status: labelOf(changeStatuses, ch.status),
        nachricht: ch.message,
        inhalt: ch.payload,
        eingereichtAm: iso(ch.createdAt),
        geprueftAm: iso(ch.reviewedAt),
        pruefvermerk: ch.reviewNote,
      })),
    },
    vertraege: contractRows.map((k) => ({ nummer: k.number, titel: k.title, status: labelOf(contractStatuses, k.status), gueltigAb: k.validFrom, gueltigBis: k.validUntil })),
    verlauf: acts.map((a) => ({ datum: iso(a.createdAt), art: labelOf(activityKinds, a.kind), text: a.body })),
    automatisierteEntscheide: AUTOMATED_DECISIONS_NOTE,
    nichtEnthalten: DISCLOSURE_RESTRICTION,
    rechte:
      "Sie können unrichtige Daten berichtigen, Daten löschen oder die Bearbeitung einschränken lassen, soweit keine Aufbewahrungspflicht besteht, und eine erteilte Einwilligung jederzeit widerrufen. Zudem können Sie sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.",
  };
}

export type Disclosure = NonNullable<Awaited<ReturnType<typeof buildDisclosure>>>;

const dt = (iso: string | null) => (iso ? formatDateTime(iso) : "–");
const d = (iso: string | null) => (iso ? formatDate(iso) : "–");
const v = (x: unknown) => (x === null || x === undefined || x === "" ? "–" : String(x));

/** Per submission: matching score, the rate paid to the person's firm, client feedback and notes. */
function submissionDetails(x: Disclosure): Block[] {
  const items = x.empfaenger.weitergaben.flatMap((s) => {
    const parts = [
      s.matchingScore !== null ? `Matching-Score ${s.matchingScore}/100` : null,
      s.satzIhreFirma ? `Satz Ihrer Firma: ${s.satzIhreFirma}` : null,
      s.rueckmeldung ? `Rückmeldung Auftraggeber: ${s.rueckmeldung}` : null,
      s.notizen ? `Notizen: ${s.notizen}` : null,
    ].filter((part): part is string => part !== null);
    return parts.length ? [`${s.mandat}: ${parts.join("; ")}`] : [];
  });
  return items.length ? [{ type: "paragraph", text: "Angaben zu den einzelnen Weitergaben:" }, { type: "list", items }] : [];
}

/** The access report as a letter-style PDF, addressed to the candidate and signed by KOVALI. */
export function disclosureDocModel(x: Disclosure): DocModel {
  const p = kovaliParty();
  const person = x.person;
  const name = fullName({ firstName: person.vorname, lastName: person.nachname });
  const blocks: Block[] = [
    { type: "title", text: "Auskunft über Personendaten", subtitle: "nach Art. 25 DSG" },
    {
      type: "parties",
      parties: [
        { role: "Verantwortlich", lines: partyBlockLines(p) },
        {
          role: "Betroffene Person",
          lines: [name, person.strasse, [person.plz, person.ort].filter(Boolean).join(" "), person.email].filter((l): l is string => Boolean(l)),
        },
      ],
    },
    {
      type: "paragraph",
      text: `Guten Tag ${name}. Sie haben Auskunft verlangt, welche Personendaten KOVALI über Sie bearbeitet. Nachfolgend finden Sie die über Sie gespeicherten Angaben mit Stand ${formatLongDate(x.erstelltAm)}. ${x.nichtEnthalten} Die Auskunft ist kostenlos. Eine maschinenlesbare Fassung (JSON) senden wir Ihnen auf Wunsch zu.`,
    },
    { type: "heading", text: "Stammdaten", number: "1" },
    {
      type: "facts",
      rows: [
        { label: "Nummer", value: person.nummer },
        { label: "Name", value: name },
        { label: "E-Mail", value: v(person.email) },
        { label: "Telefon", value: v(person.telefon) },
        { label: "Geburtsdatum", value: d(person.geburtsdatum) },
        { label: "Adresse", value: v([person.strasse, [person.plz, person.ort].filter(Boolean).join(" "), person.land].filter(Boolean).join(", ")) },
        { label: "Nationalität", value: v(person.nationalitaet) },
        { label: "Aufenthaltsbewilligung", value: v(person.aufenthaltsbewilligung) },
        { label: "Eigene Firma", value: v(person.eigeneFirma) },
      ],
    },
    { type: "heading", text: "Profil", number: "2" },
    {
      type: "facts",
      rows: [
        { label: "Titel", value: v(x.profil.titel) },
        { label: "Erfahrungsstufe", value: v(x.profil.erfahrungsstufe) },
        { label: "Schwerpunkte", value: v(x.profil.schwerpunkte.join(", ")) },
        { label: "Kompetenzen", value: v(x.profil.kompetenzen.join(", ")) },
        { label: "SAP-Module", value: v(x.profil.sapModule.join(", ")) },
        { label: "Aus Lebenslauf erkannt", value: v(x.profil.ausLebenslaufErkannt.join(", ")) },
        { label: "Sprachen", value: v(x.profil.sprachen.map((l) => `${l.language} (${l.level})`).join(", ")) },
        { label: "Zertifikate", value: v(x.profil.zertifikate.join(", ")) },
        { label: "Kurzprofil", value: v(x.profil.kurzprofil) },
      ],
    },
    ...x.profil.werdegang.map(
      (e): Block => ({
        type: "timeline",
        period: `${e.from || "?"} – ${e.to || "heute"}`,
        title: e.role || "–",
        subtitle: [e.client, e.industry].filter(Boolean).join(", ") || undefined,
        text: e.description || undefined,
        tags: e.technologies?.length ? e.technologies : undefined,
      }),
    ),
    ...(x.profil.ausbildung.length
      ? [{ type: "list", items: x.profil.ausbildung.map((e) => [e.title, e.institution, e.year].filter(Boolean).join(", ")) } satisfies Block]
      : []),
    { type: "heading", text: "Konditionen und interne Angaben", number: "3" },
    {
      type: "facts",
      rows: [
        { label: "Zusammenarbeit", value: v(x.konditionen.zusammenarbeit) },
        { label: "Verfügbar ab", value: d(x.konditionen.verfuegbarAb) },
        { label: "Pensum", value: x.konditionen.pensumMin || x.konditionen.pensumMax ? `${v(x.konditionen.pensumMin)} – ${v(x.konditionen.pensumMax)} %` : "–" },
        { label: "Satz", value: x.konditionen.satz !== null ? `CHF ${x.konditionen.satz} ${v(x.konditionen.satzEinheit)}` : "–" },
        { label: "Lohnvorstellung", value: x.konditionen.lohnvorstellung !== null ? `CHF ${x.konditionen.lohnvorstellung}` : "–" },
        { label: "Arbeitsmodell", value: v(x.konditionen.arbeitsmodell) },
        { label: "Regionen", value: v(x.konditionen.regionen) },
        { label: "Kündigungsfrist", value: v(x.konditionen.kuendigungsfrist) },
        { label: "Status", value: x.interneAngaben.status },
        { label: "Bewertung (1–5)", value: v(x.interneAngaben.bewertung) },
        { label: "Interne Notizen", value: v(x.interneAngaben.notizen) },
        { label: "Erfasst am", value: dt(x.interneAngaben.erfasstAm) },
      ],
    },
    { type: "heading", text: "Herkunft, Zweck und Aufbewahrung", number: "4" },
    {
      type: "facts",
      rows: [
        { label: "Herkunft der Daten", value: x.herkunft },
        { label: "Einwilligung", value: dt(x.einwilligung.allgemein) },
        { label: "Vermerk", value: v(x.einwilligung.vermerk) },
        { label: "Datenschutzhinweis erhalten", value: dt(x.einwilligung.datenschutzhinweisErhalten) },
        {
          label: "Widerspruch gegen Weitergabe",
          value: x.einwilligung.widerspruch
            ? `Seit ${d(x.einwilligung.widerspruch.am)}${x.einwilligung.widerspruch.vermerk ? ` (${x.einwilligung.widerspruch.vermerk})` : ""}`
            : "Keiner",
        },
        { label: "Aufbewahrung bis", value: d(x.aufbewahrung.bis) },
      ],
    },
    { type: "paragraph", text: "Zwecke der Bearbeitung:" },
    { type: "list", items: x.zweck },
    { type: "paragraph", text: "Regeln zur Aufbewahrung:" },
    { type: "list", items: x.aufbewahrung.regeln },
    { type: "heading", text: "Empfänger: Weitergaben an Auftraggeber", number: "5" },
    x.empfaenger.weitergaben.length
      ? {
          type: "table",
          columns: [
            { label: "Mandat", width: 2 },
            { label: "Empfänger", width: 1.4 },
            { label: "Einwilligung", width: 1.2 },
            { label: "Widerrufen", width: 1 },
            { label: "Weitergegeben", width: 1 },
            { label: "Status", width: 1 },
          ],
          rows: x.empfaenger.weitergaben.map((s) => [
            s.mandat,
            v(s.empfaengerFirma),
            s.einwilligungAm ? `${d(s.einwilligungAm)}${s.einwilligungForm ? ` (${s.einwilligungForm})` : ""}` : "–",
            d(s.widerrufenAm),
            d(s.weitergegebenAm),
            s.status,
          ]),
        }
      : { type: "paragraph", text: "Ihr Profil wurde bisher an keinen Auftraggeber weitergegeben." },
    ...submissionDetails(x),
    { type: "heading", text: "Dokumente", number: "6" },
    x.dokumente.length
      ? {
          type: "table",
          columns: [{ label: "Datei", width: 2 }, { label: "Art", width: 1.2 }, { label: "Hochgeladen", width: 1 }, { label: "Von", width: 1 }],
          rows: x.dokumente.map((doc) => [doc.dateiname, doc.art, d(doc.hochgeladenAm), doc.hochgeladenVon]),
        }
      : { type: "paragraph", text: "Es sind keine Dokumente gespeichert." },
    { type: "paragraph", small: true, muted: true, text: "Dokumente sind verschlüsselt gespeichert. Kopien senden wir Ihnen auf Wunsch zu." },
    { type: "heading", text: "Kandidatenportal", number: "7" },
    {
      type: "facts",
      rows: [
        { label: "Konto", value: x.kandidatenportal.konto ? `${x.kandidatenportal.konto.email} (${x.kandidatenportal.konto.status})` : "Kein Konto" },
        { label: "Letzte Anmeldung", value: dt(x.kandidatenportal.konto?.letzteAnmeldung ?? null) },
        { label: "Freigegebene Vakanzen", value: String(x.kandidatenportal.freigegebeneVakanzen.length) },
        { label: "Änderungsanträge", value: String(x.kandidatenportal.aenderungsantraege.length) },
      ],
    },
    ...(x.kandidatenportal.freigegebeneVakanzen.length
      ? [
          {
            type: "table",
            columns: [{ label: "Vakanz", width: 2 }, { label: "Freigegeben", width: 1 }, { label: "Antwort", width: 1.2 }],
            rows: x.kandidatenportal.freigegebeneVakanzen.map((s) => [s.vakanz, d(s.freigegebenAm), s.antwort]),
          } satisfies Block,
        ]
      : []),
    ...(x.vertraege.length
      ? [
          { type: "heading", text: "Verträge", number: "8" } satisfies Block,
          {
            type: "table",
            columns: [{ label: "Nummer", width: 1 }, { label: "Titel", width: 2 }, { label: "Status", width: 1 }],
            rows: x.vertraege.map((k) => [k.nummer, k.titel, k.status]),
          } satisfies Block,
        ]
      : []),
    { type: "heading", text: "Verlauf und Notizen", number: x.vertraege.length ? "9" : "8" },
    x.verlauf.length
      ? {
          type: "table",
          columns: [{ label: "Datum", width: 1 }, { label: "Art", width: 0.8 }, { label: "Eintrag", width: 3.2 }],
          rows: x.verlauf.map((a) => [dt(a.datum), a.art, a.text]),
        }
      : { type: "paragraph", text: "Keine Einträge." },
    { type: "heading", text: "Auftragsbearbeiter und Bekanntgabe ins Ausland", number: x.vertraege.length ? "10" : "9" },
    { type: "list", items: [...PROCESSORS.map((proc) => `${proc.name}: ${proc.service}. ${proc.location}.`), ...CROSS_BORDER] },
    { type: "heading", text: "Automatisierte Entscheide", number: x.vertraege.length ? "11" : "10" },
    { type: "paragraph", text: x.automatisierteEntscheide },
    { type: "heading", text: "Ihre Rechte", number: x.vertraege.length ? "12" : "11" },
    { type: "paragraph", text: x.rechte },
    { type: "signatures", parties: [{ party: `${p.name} (KOVALI)`, signers: [{ name: p.signatory.name, role: p.signatory.title }] }] },
  ];
  return {
    docType: "Auskunft über Personendaten",
    title: `Auskunft ${person.nummer} ${todayIso(new Date(x.erstelltAm))}`,
    reference: person.nummer,
    footer: partyLine(p),
    confidential: true,
    blocks,
  };
}
