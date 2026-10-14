import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { activities, candidates, changeRequests, companies, contracts, documents, mandates, submissions, vacancyShares } from "../db/schema";
import { displayNo, fullName, todayIso } from "../format";
import { openMandateStatuses } from "../options";
import { addDaysIso, isAnonymisedSql, privacyCounts } from "../privacy";

/** Figures and lists for the dashboard (/admin). */

/** Next steps due within this many days count as "heute wichtig". */
export const NEXT_STEP_DAYS = 2;
/** Deadlines within this many days are shown. */
export const DEADLINE_DAYS = 7;

export async function dashboardKpis(today = todayIso()) {
  const db = await getDb();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [[open], statusRows, [submitted], [awaitingSignature], [withoutFirm]] = await Promise.all([
    db.select({ n: count() }).from(mandates).where(inArray(mandates.status, [...openMandateStatuses])),
    db.select({ status: candidates.status, n: count() }).from(candidates).groupBy(candidates.status),
    // Month boundaries in Zurich time, not UTC.
    db
      .select({ n: count() })
      .from(submissions)
      .where(sql`${submissions.submittedAt} >= (${monthStart}::date::timestamp at time zone 'Europe/Zurich')`),
    db.select({ n: count() }).from(contracts).where(eq(contracts.status, "versendet")),
    // KOVALI works only with specialists through their own firm.
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(eq(candidates.status, "aktiv"), isNull(candidates.companyId))),
  ]);
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
  return {
    openMandates: open?.n ?? 0,
    activeCandidates: byStatus.aktiv ?? 0,
    newCandidates: byStatus.neu ?? 0,
    deployedCandidates: byStatus.im_einsatz ?? 0,
    submissionsThisMonth: submitted?.n ?? 0,
    contractsAwaitingSignature: awaitingSignature?.n ?? 0,
    activeWithoutFirm: withoutFirm?.n ?? 0,
  };
}

/** Mandate next steps due by today + 2 days (overdue ones first) and deadlines in the next 7 days. */
export async function dashboardAgenda(today = todayIso()) {
  const db = await getDb();
  const columns = {
    id: mandates.id,
    title: mandates.title,
    status: mandates.status,
    priority: mandates.priority,
    nextStep: mandates.nextStep,
    nextStepAt: mandates.nextStepAt,
    deadline: mandates.deadline,
    company: companies.name,
  };
  const open = inArray(mandates.status, [...openMandateStatuses]);
  const [nextSteps, deadlines] = await Promise.all([
    db
      .select(columns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .where(and(open, isNotNull(mandates.nextStepAt), lte(mandates.nextStepAt, addDaysIso(today, NEXT_STEP_DAYS))))
      .orderBy(asc(mandates.nextStepAt), asc(mandates.id))
      .limit(20),
    db
      .select(columns)
      .from(mandates)
      .leftJoin(companies, eq(companies.id, mandates.companyId))
      .where(and(open, gte(mandates.deadline, today), lte(mandates.deadline, addDaysIso(today, DEADLINE_DAYS))))
      .orderBy(asc(mandates.deadline), asc(mandates.id))
      .limit(20),
  ]);
  return { nextSteps, deadlines };
}

/** Items from the candidate portal waiting for Ferhat (same rules as the navigation badge). */
export async function portalReviewCounts() {
  const db = await getDb();
  const [[changes], [uploads], [answers]] = await Promise.all([
    db.select({ n: count() }).from(changeRequests).where(eq(changeRequests.status, "offen")),
    db.select({ n: count() }).from(documents).where(and(eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt))),
    db.select({ n: count() }).from(vacancyShares).where(and(eq(vacancyShares.response, "interessiert"), isNull(vacancyShares.reviewedAt))),
  ]);
  return { changeRequests: changes?.n ?? 0, uploads: uploads?.n ?? 0, interested: answers?.n ?? 0 };
}

export { privacyCounts };

export interface ActivityLink {
  label: string;
  href: string;
}

/** The latest history entries across all records, each with links to its records. */
export async function recentActivities(limit = 15) {
  const db = await getDb();
  const rows = await db
    .select({
      id: activities.id,
      kind: activities.kind,
      body: activities.body,
      createdAt: activities.createdAt,
      candidateId: activities.candidateId,
      candidateFirst: candidates.firstName,
      candidateLast: candidates.lastName,
      candidateAnonymised: sql<boolean>`coalesce(${isAnonymisedSql}, false)`,
      companyId: activities.companyId,
      companyName: companies.name,
      mandateId: activities.mandateId,
      mandateTitle: mandates.title,
      contractId: activities.contractId,
      contractNumber: contracts.number,
    })
    .from(activities)
    .leftJoin(candidates, eq(candidates.id, activities.candidateId))
    .leftJoin(companies, eq(companies.id, activities.companyId))
    .leftJoin(mandates, eq(mandates.id, activities.mandateId))
    .leftJoin(contracts, eq(contracts.id, activities.contractId))
    .orderBy(desc(activities.createdAt), desc(activities.id))
    .limit(limit);
  return rows.map((r) => {
    const links: ActivityLink[] = [];
    if (r.candidateId) {
      const name = r.candidateAnonymised ? null : fullName({ firstName: r.candidateFirst, lastName: r.candidateLast });
      links.push({ label: name ? `${displayNo.candidate(r.candidateId)} ${name}` : displayNo.candidate(r.candidateId), href: `/admin/kandidaten/${r.candidateId}` });
    }
    if (r.mandateId) links.push({ label: `${displayNo.mandate(r.mandateId)} ${r.mandateTitle ?? ""}`.trim(), href: `/admin/mandate/${r.mandateId}` });
    if (r.contractId) links.push({ label: r.contractNumber ?? "Vertrag", href: `/admin/vertraege/${r.contractId}` });
    if (r.companyId) links.push({ label: r.companyName ?? displayNo.company(r.companyId), href: `/admin/firmen/${r.companyId}` });
    return { id: r.id, kind: r.kind, body: r.body, createdAt: r.createdAt, links };
  });
}

/** Whether the first records exist, for the "Erste Schritte" checklist on an empty database. */
export async function setupProgress() {
  const db = await getDb();
  const [[c], [k], [m], [v]] = await Promise.all([
    db.select({ n: count() }).from(companies),
    db.select({ n: count() }).from(candidates),
    db.select({ n: count() }).from(mandates),
    db.select({ n: count() }).from(contracts),
  ]);
  return { companies: c?.n ?? 0, candidates: k?.n ?? 0, mandates: m?.n ?? 0, contracts: v?.n ?? 0 };
}
