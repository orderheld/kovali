import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, type AdminDb } from "@/lib/admin/db/client";
import { candidates, changeRequests, companies, type ChangeRequest } from "@/lib/admin/db/schema";
import { formatDateTime } from "@/lib/admin/format";
import {
  applyValues,
  cardSection,
  cardValues,
  currentValues,
  editableSections,
  isEditableSection,
  mergeCard,
  parseSection,
  portalCards,
  sameValues,
  sectionFields,
  type ChangeSection,
  type EditableSection,
  type FirmValues,
  type PortalCard,
  type ProfileSource,
  type SectionValues,
} from "./profile";

/**
 * Change requests: what candidates propose in the portal and Ferhat confirms. One open
 * request per candidate and section (partial unique index change_requests_one_open); a new
 * edit replaces the open one in a single upsert, so two quick saves cannot collide.
 */

type Tx = Parameters<Parameters<AdminDb["transaction"]>[0]>[0];

type CandidateField = Exclude<keyof ProfileSource, "firm">;

const profileColumns = Object.fromEntries(
  [...new Set(editableSections.flatMap((s) => sectionFields[s] as readonly string[]))].map((key) => [key, candidates[key as CandidateField]]),
) as { [K in CandidateField]: (typeof candidates)[K] };

/** The confirmed profile, with the firm from the linked company. */
export async function loadProfileSource(db: AdminDb | Tx, candidateId: number): Promise<ProfileSource | null> {
  const [row] = await db
    .select({
      ...profileColumns,
      companyId: companies.id,
      firmName: companies.name,
      firmLegalForm: companies.legalForm,
      firmUid: companies.uid,
      firmStreet: companies.street,
      firmPostalCode: companies.postalCode,
      firmCity: companies.city,
      firmCountry: companies.country,
    })
    .from(candidates)
    .leftJoin(companies, eq(companies.id, candidates.companyId))
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!row) return null;
  const { companyId, firmName, firmLegalForm, firmUid, firmStreet, firmPostalCode, firmCity, firmCountry, ...rest } = row;
  const firm =
    companyId && firmName
      ? { name: firmName, legalForm: firmLegalForm, uid: firmUid, street: firmStreet, postalCode: firmPostalCode, city: firmCity, country: firmCountry ?? "Schweiz" }
      : null;
  return { ...(rest as Omit<ProfileSource, "firm">), firm };
}

export interface SectionState<S extends EditableSection> {
  current: SectionValues[S];
  /** Values of the open request, when it still fits the schema. */
  pending: SectionValues[S] | null;
  openId: number | null;
  message: string | null;
}

/** Confirmed and pending values of one section of the candidate (portal forms and cards). */
export async function sectionState<S extends EditableSection>(candidateId: number, section: S): Promise<SectionState<S> | null> {
  const db = await getDb();
  const source = await loadProfileSource(db, candidateId);
  if (!source) return null;
  const [open] = await db
    .select({ id: changeRequests.id, payload: changeRequests.payload, message: changeRequests.message })
    .from(changeRequests)
    .where(and(eq(changeRequests.candidateId, candidateId), eq(changeRequests.section, section), eq(changeRequests.status, "offen")))
    .limit(1);
  const parsed = open ? parseSection(section, open.payload) : null;
  return {
    current: currentValues(section, source),
    pending: parsed?.ok ? parsed.data : null,
    openId: open?.id ?? null,
    message: open?.message ?? null,
  };
}

/** Matches the partial unique index (candidate_id, section) where status = 'offen'. */
const openTarget = {
  target: [changeRequests.candidateId, changeRequests.section],
  targetWhere: sql`status = 'offen'`,
};

export type SaveResult = { status: "saved"; id: number } | { status: "unchanged"; withdrawn: boolean };

/**
 * Saves the complete new values of a section as the open request. When they equal the
 * confirmed values, nothing is proposed and an open request for the section is withdrawn.
 */
export async function saveSectionRequest<S extends EditableSection>(
  candidateId: number,
  section: S,
  values: SectionValues[S],
  message: string | null,
): Promise<SaveResult> {
  const db = await getDb();
  const source = await loadProfileSource(db, candidateId);
  if (!source) throw new Error("Kandidat fehlt.");
  const now = new Date();
  if (sameValues(currentValues(section, source), values)) {
    const rows = await db
      .update(changeRequests)
      .set({ status: "zurueckgezogen", updatedAt: now })
      .where(and(eq(changeRequests.candidateId, candidateId), eq(changeRequests.section, section), eq(changeRequests.status, "offen")))
      .returning({ id: changeRequests.id });
    return { status: "unchanged", withdrawn: rows.length > 0 };
  }
  const payload = values as Record<string, unknown>;
  const [row] = await db
    .insert(changeRequests)
    .values({ candidateId, section, payload, message, status: "offen" })
    .onConflictDoUpdate({ ...openTarget, set: { payload, message, reviewNote: null, updatedAt: now } })
    .returning({ id: changeRequests.id });
  return { status: "saved", id: row.id };
}

/** A message about master data (Stammdaten). A second message is added to the open one. */
export async function saveStammdatenRequest(candidateId: number, message: string): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const addition = `Nachtrag vom ${formatDateTime(now)}:\n${message}`;
  const [row] = await db
    .insert(changeRequests)
    .values({ candidateId, section: "stammdaten", payload: {}, message, status: "offen" })
    .onConflictDoUpdate({
      ...openTarget,
      set: { message: sql`left(coalesce(${changeRequests.message} || E'\\n\\n', '') || ${addition}, 8000)`, updatedAt: now },
    })
    .returning({ id: changeRequests.id });
  return row.id;
}

/** Withdraws the candidate's own open request. Null when it is not theirs or not open. */
export async function withdrawRequest(candidateId: number, requestId: number): Promise<{ section: string } | null> {
  const db = await getDb();
  const [row] = await db
    .update(changeRequests)
    .set({ status: "zurueckgezogen", updatedAt: new Date() })
    .where(and(eq(changeRequests.id, requestId), eq(changeRequests.candidateId, candidateId), eq(changeRequests.status, "offen")))
    .returning({ section: changeRequests.section });
  return row ?? null;
}

/**
 * Withdraws the change of one card. For the firm and the availability card, which share the
 * "verfuegbarkeit" request, only that card's part goes back to the confirmed values; the
 * request ends when nothing else is left. Null when the request is not the candidate's own,
 * not open or belongs to another section.
 */
export async function withdrawCard(candidateId: number, card: PortalCard, requestId: number): Promise<{ section: string } | null> {
  const section = cardSection(card);
  const state = await sectionState(candidateId, section);
  if (!state || state.openId !== requestId) return null;
  if ((card !== "firma" && card !== "verfuegbarkeit") || !state.pending) return withdrawRequest(candidateId, requestId);
  const rest = mergeCard(card, state.pending as Record<string, unknown>, state.current as Record<string, unknown>);
  if (sameValues(rest, state.current)) return withdrawRequest(candidateId, requestId);
  const db = await getDb();
  const [row] = await db
    .update(changeRequests)
    .set({ payload: rest, updatedAt: new Date() })
    .where(and(eq(changeRequests.id, requestId), eq(changeRequests.candidateId, candidateId), eq(changeRequests.status, "offen")))
    .returning({ section: changeRequests.section });
  return row ?? null;
}

export type RequestRow = Pick<ChangeRequest, "id" | "section" | "payload" | "message" | "status" | "reviewNote" | "reviewedAt" | "createdAt" | "updatedAt">;

export interface SectionRequests {
  open: RequestRow | null;
  /** Latest confirmed or rejected request, for "abgelehnt: …" or "bestätigt am …". */
  lastReviewed: RequestRow | null;
}

/** The candidate's requests per section (portal). */
export async function candidateRequests(candidateId: number): Promise<Record<ChangeSection, SectionRequests>> {
  const db = await getDb();
  const rows = await db
    .select({
      id: changeRequests.id,
      section: changeRequests.section,
      payload: changeRequests.payload,
      message: changeRequests.message,
      status: changeRequests.status,
      reviewNote: changeRequests.reviewNote,
      reviewedAt: changeRequests.reviewedAt,
      createdAt: changeRequests.createdAt,
      updatedAt: changeRequests.updatedAt,
    })
    .from(changeRequests)
    .where(eq(changeRequests.candidateId, candidateId))
    .orderBy(desc(changeRequests.updatedAt), desc(changeRequests.id))
    .limit(300);
  const out = Object.fromEntries([...editableSections, "stammdaten"].map((s) => [s, { open: null, lastReviewed: null }])) as Record<ChangeSection, SectionRequests>;
  for (const r of rows) {
    const entry = out[r.section as ChangeSection];
    if (!entry) continue;
    if (r.status === "offen") entry.open ??= r;
    else if ((r.status === "bestaetigt" || r.status === "abgelehnt") && r.reviewedAt) entry.lastReviewed ??= r;
  }
  return out;
}

// --- Admin -----------------------------------------------------------------------

export async function listOpenRequests() {
  const db = await getDb();
  return db
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
    })
    .from(changeRequests)
    .innerJoin(candidates, eq(candidates.id, changeRequests.candidateId))
    .where(eq(changeRequests.status, "offen"))
    .orderBy(asc(changeRequests.updatedAt), asc(changeRequests.id));
}

export type ReviewResult =
  | { ok: true; candidateId: number; section: string; firm?: { companyId: number; created: boolean; name: string } }
  | { ok: false; error: string };

/**
 * Creates or updates the candidate's firm (companies, kind "subunternehmer") and links it.
 * The linked company is updated; otherwise a subcontractor with the same UID is reused, so
 * one firm does not end up twice.
 */
async function upsertFirm(tx: Tx, candidateId: number, firm: FirmValues): Promise<{ companyId: number; created: boolean }> {
  const now = new Date();
  const values = {
    name: firm.name,
    legalName: firm.name,
    legalForm: firm.legalForm,
    uid: firm.uid,
    street: firm.street,
    postalCode: firm.postalCode,
    city: firm.city,
    country: firm.country,
    updatedAt: now,
  };
  const [candidate] = await tx.select({ companyId: candidates.companyId }).from(candidates).where(eq(candidates.id, candidateId)).for("update").limit(1);
  let companyId = candidate?.companyId ?? null;
  let created = false;
  if (!companyId) {
    const [sameUid] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.uid, firm.uid), eq(companies.kind, "subunternehmer")))
      .limit(1);
    companyId = sameUid?.id ?? null;
  }
  if (companyId) {
    await tx.update(companies).set(values).where(eq(companies.id, companyId));
  } else {
    const [row] = await tx
      .insert(companies)
      .values({ ...values, kind: "subunternehmer", status: "aktiv" })
      .returning({ id: companies.id });
    companyId = row.id;
    created = true;
  }
  await tx.update(candidates).set({ companyId, engagement: "selbstaendig", updatedAt: now }).where(eq(candidates.id, candidateId));
  return { companyId, created };
}

/**
 * Applies a request to the candidate in one transaction: the stored payload is validated
 * again (options or limits may have changed since), only the section's own columns are
 * written, then the request is marked confirmed.
 */
export async function confirmRequest(requestId: number): Promise<ReviewResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [req] = await tx
      .select({ id: changeRequests.id, candidateId: changeRequests.candidateId, section: changeRequests.section, payload: changeRequests.payload })
      .from(changeRequests)
      .where(and(eq(changeRequests.id, requestId), eq(changeRequests.status, "offen")))
      .for("update")
      .limit(1);
    if (!req) return { ok: false, error: "Diese Änderung ist nicht mehr offen." };
    if (!isEditableSection(req.section)) return { ok: false, error: "Stammdaten-Meldungen werden als erledigt markiert, nicht übernommen." };
    const parsed = parseSection(req.section, req.payload);
    if (!parsed.ok) {
      const detail = Object.values(parsed.errors)[0];
      return { ok: false, error: `Die Angaben sind nicht mehr gültig${detail ? ` (${detail})` : ""}. Bitte ablehnen und die Person um eine neue Eingabe bitten.` };
    }
    const now = new Date();
    let firm: { companyId: number; created: boolean; name: string } | undefined;
    if (req.section === "verfuegbarkeit") {
      const proposed = (parsed.data as SectionValues["verfuegbarkeit"]).firm;
      const source = await loadProfileSource(tx, req.candidateId);
      const confirmed = source ? currentValues("verfuegbarkeit", source).firm : null;
      if (proposed && !sameValues(proposed, confirmed)) {
        firm = { ...(await upsertFirm(tx, req.candidateId, proposed)), name: proposed.name };
      }
    }
    await tx
      .update(candidates)
      .set({ ...applyValues(req.section, parsed.data), updatedAt: now })
      .where(eq(candidates.id, req.candidateId));
    await tx
      .update(changeRequests)
      .set({ status: "bestaetigt", reviewedAt: now, reviewNote: null, updatedAt: now })
      .where(eq(changeRequests.id, req.id));
    return { ok: true, candidateId: req.candidateId, section: req.section, firm };
  });
}

/** Rejects a request; the note is shown to the candidate. */
export async function rejectRequest(requestId: number, note: string): Promise<ReviewResult> {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(changeRequests)
    .set({ status: "abgelehnt", reviewNote: note, reviewedAt: now, updatedAt: now })
    .where(and(eq(changeRequests.id, requestId), eq(changeRequests.status, "offen")))
    .returning({ candidateId: changeRequests.candidateId, section: changeRequests.section });
  return row ? { ok: true, ...row } : { ok: false, error: "Diese Änderung ist nicht mehr offen." };
}

/** Marks a master-data message as done after Ferhat changed the data himself. */
export async function completeStammdatenRequest(requestId: number, note: string | null): Promise<ReviewResult> {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(changeRequests)
    .set({ status: "bestaetigt", reviewNote: note, reviewedAt: now, updatedAt: now })
    .where(and(eq(changeRequests.id, requestId), eq(changeRequests.section, "stammdaten"), eq(changeRequests.status, "offen")))
    .returning({ candidateId: changeRequests.candidateId, section: changeRequests.section });
  return row ? { ok: true, ...row } : { ok: false, error: "Diese Meldung ist nicht mehr offen." };
}

// --- Portal cards ---------------------------------------------------------------

export interface CardState {
  card: PortalCard;
  /** Confirmed values of the card. */
  current: Record<string, unknown>;
  /** Proposed values of the card, when they differ from the confirmed ones. */
  pending: Record<string, unknown> | null;
  openId: number | null;
  message: string | null;
  submittedAt: Date | null;
  /** The last proposal for this card was rejected (and nothing new is pending). */
  rejected: { note: string | null; at: Date } | null;
  confirmedAt: Date | null;
}

/** Confirmed and pending values of every profile card, plus the master-data messages (portal). */
export async function profileCards(candidateId: number): Promise<{ cards: Record<PortalCard, CardState>; stammdaten: SectionRequests } | null> {
  const db = await getDb();
  const source = await loadProfileSource(db, candidateId);
  if (!source) return null;
  const requests = await candidateRequests(candidateId);
  const cards = {} as Record<PortalCard, CardState>;
  for (const card of portalCards) {
    const section = cardSection(card);
    const currentPart = cardValues(card, currentValues(section, source) as Record<string, unknown>);
    const { open, lastReviewed } = requests[section];
    const partOf = (payload: unknown) => {
      const parsed = parseSection(section, payload);
      return parsed.ok ? cardValues(card, parsed.data as Record<string, unknown>) : null;
    };
    const openPart = open ? partOf(open.payload) : null;
    const pending = openPart && !sameValues(openPart, currentPart) ? openPart : null;
    let rejected: CardState["rejected"] = null;
    if (!pending && lastReviewed?.status === "abgelehnt" && lastReviewed.reviewedAt) {
      const part = partOf(lastReviewed.payload);
      if (!part || !sameValues(part, currentPart)) rejected = { note: lastReviewed.reviewNote, at: lastReviewed.reviewedAt };
    }
    cards[card] = {
      card,
      current: currentPart,
      pending,
      openId: pending && open ? open.id : null,
      message: pending && open ? open.message : null,
      submittedAt: pending && open ? open.updatedAt : null,
      rejected,
      confirmedAt: lastReviewed?.status === "bestaetigt" ? lastReviewed.reviewedAt : null,
    };
  }
  return { cards, stammdaten: requests.stammdaten };
}
