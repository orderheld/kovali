import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/admin/db/client";
import { candidateAccounts, candidateSessions, candidates, changeRequests, documents, mandates, submissions, vacancyShares } from "@/lib/admin/db/schema";
import { loadProfileSource, planFirm, type FirmPlan } from "./change-requests";
import { currentValues, diffSection, firmDraft, isEditableSection, parseSection, type DiffItem, type ProfileSource, type SectionValues } from "./profile";
import { SESSION_IDLE_MS } from "./session";

/**
 * Reads for the admin side of the candidate portal (/admin/portal). Only Ferhat's pages use
 * these; every caller has checked requireAdmin() first.
 */

/** Same three counts as the "Kandidatenportal" badge in the admin navigation. */
export async function portalCounts() {
  const db = await getDb();
  const [[changes], [uploads], [interest]] = await Promise.all([
    db.select({ n: count() }).from(changeRequests).where(eq(changeRequests.status, "offen")),
    db.select({ n: count() }).from(documents).where(and(eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt))),
    db.select({ n: count() }).from(vacancyShares).where(and(eq(vacancyShares.response, "interessiert"), isNull(vacancyShares.reviewedAt))),
  ]);
  return { changes: changes?.n ?? 0, uploads: uploads?.n ?? 0, interest: interest?.n ?? 0 };
}

export type ChangeReview = {
  id: number;
  candidateId: number;
  name: string;
  section: string;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Readable changes (null for master-data messages). */
  diff: DiffItem[] | null;
  /** Set when the stored payload no longer passes validation. */
  invalid: string | null;
  firmProposed: boolean;
  /** What confirming does with the companies table, when a firm is proposed. */
  firmPlan: FirmPlan | null;
  master: { email: string | null; phone: string | null; address: string } | null;
};

/** All open requests with the differences to the confirmed values, oldest first. */
export async function openChangeReviews(): Promise<ChangeReview[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: changeRequests.id,
      candidateId: changeRequests.candidateId,
      section: changeRequests.section,
      payload: changeRequests.payload,
      message: changeRequests.message,
      createdAt: changeRequests.createdAt,
      updatedAt: changeRequests.updatedAt,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      phone: candidates.phone,
      street: candidates.street,
      postalCode: candidates.postalCode,
      city: candidates.city,
    })
    .from(changeRequests)
    .innerJoin(candidates, eq(candidates.id, changeRequests.candidateId))
    .where(eq(changeRequests.status, "offen"))
    .orderBy(asc(changeRequests.updatedAt), asc(changeRequests.id))
    .limit(200);

  const sources = new Map<number, ProfileSource | null>();
  for (const id of new Set(rows.filter((r) => r.section !== "stammdaten").map((r) => r.candidateId))) {
    sources.set(id, await loadProfileSource(db, id));
  }

  const reviews: ChangeReview[] = [];
  for (const r of rows) {
    const base = {
      id: r.id,
      candidateId: r.candidateId,
      name: `${r.firstName} ${r.lastName}`,
      section: r.section,
      message: r.message,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
    if (!isEditableSection(r.section)) {
      reviews.push({
        ...base,
        diff: null,
        invalid: null,
        firmProposed: false,
        firmPlan: null,
        master: { email: r.email, phone: r.phone, address: [r.street, [r.postalCode, r.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") },
      });
      continue;
    }
    const source = sources.get(r.candidateId);
    const parsed = parseSection(r.section, r.payload);
    if (!source || !parsed.ok) {
      const invalid = parsed.ok ? "Kandidat nicht gefunden." : (Object.values(parsed.errors)[0] ?? "Ungültige Angaben.");
      reviews.push({ ...base, diff: [], invalid, firmProposed: false, firmPlan: null, master: null });
      continue;
    }
    const current = currentValues(r.section, source);
    const proposedFirm = r.section === "verfuegbarkeit" ? (parsed.data as SectionValues["verfuegbarkeit"]).firm : null;
    // An incomplete company record counts as "no firm yet"; the diff still shows what it holds.
    const before = proposedFirm && !(current as SectionValues["verfuegbarkeit"]).firm ? { ...current, firm: firmDraft(source) } : current;
    const diff = diffSection(r.section, before as typeof current, parsed.data);
    const firmProposed = r.section === "verfuegbarkeit" && diff.some((d) => d.type === "field" && ["Firma", "Rechtsform", "UID", "Adresse der Firma"].includes(d.label));
    const firmPlan = firmProposed && proposedFirm ? await planFirm(db, r.candidateId, proposedFirm.uid) : null;
    reviews.push({ ...base, diff, invalid: null, firmProposed, firmPlan, master: null });
  }
  return reviews;
}

/** Unconfirmed uploads from the portal, oldest first. */
export async function pendingUploads() {
  const db = await getDb();
  return db
    .select({
      id: documents.id,
      candidateId: documents.candidateId,
      kind: documents.kind,
      filename: documents.filename,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
    })
    .from(documents)
    .innerJoin(candidates, eq(candidates.id, documents.candidateId))
    .where(and(eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt)))
    .orderBy(asc(documents.createdAt), asc(documents.id))
    .limit(200);
}

const shareColumns = {
  id: vacancyShares.id,
  mandateId: vacancyShares.mandateId,
  candidateId: vacancyShares.candidateId,
  response: vacancyShares.response,
  responseAt: vacancyShares.responseAt,
  responseMessage: vacancyShares.responseMessage,
  firstName: candidates.firstName,
  lastName: candidates.lastName,
  companyId: candidates.companyId,
  objectionAt: candidates.objectionAt,
  mandateTitle: mandates.title,
  portalTitle: mandates.portalTitle,
  mandateStatus: mandates.status,
  submissionId: submissions.id,
  submissionStatus: submissions.status,
  consentAt: submissions.consentAt,
  consentMethod: submissions.consentMethod,
  consentNote: submissions.consentNote,
  withdrawnAt: submissions.withdrawnAt,
  withdrawalNote: submissions.withdrawalNote,
  submittedAt: submissions.submittedAt,
};

function shareQuery(response: "interessiert" | "kein_interesse") {
  return getDb().then((db) =>
    db
      .select(shareColumns)
      .from(vacancyShares)
      .innerJoin(candidates, eq(candidates.id, vacancyShares.candidateId))
      .innerJoin(mandates, eq(mandates.id, vacancyShares.mandateId))
      .leftJoin(submissions, and(eq(submissions.mandateId, vacancyShares.mandateId), eq(submissions.candidateId, vacancyShares.candidateId)))
      .where(
        and(
          eq(vacancyShares.response, response),
          isNull(vacancyShares.reviewedAt),
          // Withdrawals only matter when the person is in the pipeline for the mandate.
          response === "kein_interesse" ? isNotNull(submissions.id) : undefined,
        ),
      )
      .orderBy(desc(vacancyShares.responseAt), desc(vacancyShares.id))
      .limit(200),
  );
}

export type ShareReview = Awaited<ReturnType<typeof shareQuery>>[number];

/** Interest reported in the portal that Ferhat has not looked at yet. */
export function openInterests() {
  return shareQuery("interessiert");
}

/** Withdrawn interest where a submission exists (consent removed or profile already sent). */
export function openWithdrawals() {
  return shareQuery("kein_interesse");
}

/** Marks a candidate's answer as seen. */
export async function markShareReviewed(shareId: number) {
  const db = await getDb();
  const [row] = await db
    .update(vacancyShares)
    .set({ reviewedAt: new Date() })
    .where(and(eq(vacancyShares.id, shareId), isNull(vacancyShares.reviewedAt)))
    .returning({ id: vacancyShares.id, candidateId: vacancyShares.candidateId, mandateId: vacancyShares.mandateId, response: vacancyShares.response });
  return row ?? null;
}

const accountColumns = {
  id: candidateAccounts.id,
  candidateId: candidateAccounts.candidateId,
  email: candidateAccounts.email,
  status: candidateAccounts.status,
  tokenExpiresAt: candidateAccounts.tokenExpiresAt,
  hasToken: sql<boolean>`${candidateAccounts.tokenHash} is not null`,
  lastLoginAt: candidateAccounts.lastLoginAt,
  createdAt: candidateAccounts.createdAt,
  firstName: candidates.firstName,
  lastName: candidates.lastName,
  candidateStatus: candidates.status,
};

/** All portal accounts with the number of active sessions. */
export async function listAccounts() {
  const db = await getDb();
  const rows = await db
    .select(accountColumns)
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .orderBy(asc(candidates.lastName), asc(candidates.firstName))
    .limit(500);
  const sessions = await activeSessionCounts(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, sessions: sessions.get(r.id) ?? 0 }));
}

export type PortalAccountRow = Awaited<ReturnType<typeof listAccounts>>[number];

export async function accountOfCandidate(candidateId: number) {
  const db = await getDb();
  const [row] = await db
    .select(accountColumns)
    .from(candidateAccounts)
    .innerJoin(candidates, eq(candidates.id, candidateAccounts.candidateId))
    .where(eq(candidateAccounts.candidateId, candidateId))
    .limit(1);
  if (!row) return null;
  const sessions = await activeSessionCounts([row.id]);
  return { ...row, sessions: sessions.get(row.id) ?? 0 };
}

async function activeSessionCounts(accountIds: number[]): Promise<Map<number, number>> {
  if (!accountIds.length) return new Map();
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select({ accountId: candidateSessions.accountId, n: count() })
    .from(candidateSessions)
    .where(
      and(
        inArray(candidateSessions.accountId, accountIds),
        gt(candidateSessions.expiresAt, now),
        gt(candidateSessions.lastSeenAt, new Date(now.getTime() - SESSION_IDLE_MS)),
      ),
    )
    .groupBy(candidateSessions.accountId);
  return new Map(rows.map((r) => [r.accountId, r.n]));
}

/** Open portal items of one candidate (for the account card on the candidate page). */
export async function candidatePortalItems(candidateId: number) {
  const db = await getDb();
  const [[changes], [uploads], [interest]] = await Promise.all([
    db.select({ n: count() }).from(changeRequests).where(and(eq(changeRequests.candidateId, candidateId), eq(changeRequests.status, "offen"))),
    db
      .select({ n: count() })
      .from(documents)
      .where(and(eq(documents.candidateId, candidateId), eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt))),
    db
      .select({ n: count() })
      .from(vacancyShares)
      .where(and(eq(vacancyShares.candidateId, candidateId), eq(vacancyShares.response, "interessiert"), isNull(vacancyShares.reviewedAt))),
  ]);
  return { changes: changes?.n ?? 0, uploads: uploads?.n ?? 0, interest: interest?.n ?? 0 };
}
