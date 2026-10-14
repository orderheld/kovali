"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { loginBlocked, recordLoginAttempt } from "@/lib/admin/auth/rate-limit";
import { getDb } from "@/lib/admin/db/client";
import { documents } from "@/lib/admin/db/schema";
import { checkUpload, storeDocument } from "@/lib/admin/documents";
import { displayNo } from "@/lib/admin/format";
import { f, fail, formObject, ok, type ActionState } from "@/lib/admin/forms";
import { changeSections, documentKinds, labelOf } from "@/lib/admin/options";
import { requestIpHash } from "@/lib/admin/request";
import { changePassword } from "@/lib/portal/accounts";
import { saveSectionRequest, saveStammdatenRequest, sectionState, withdrawCard, withdrawRequest } from "@/lib/portal/change-requests";
import { candidateDocumentKinds, deleteOwnUpload, hasConfirmedFirm } from "@/lib/portal/data";
import { PASSWORD_MAX, passwordPairSchema } from "@/lib/portal/password";
import { cardSection, cardTitles, mergeCard, parseSection, portalCards } from "@/lib/portal/profile";
import { destroyCandidateSession, endAccountSessions, requireCandidate, type CandidateSession } from "@/lib/portal/session";
import { answerVacancy } from "@/lib/portal/vacancies";

/**
 * Actions of the logged-in candidate. Each one checks the session first and only ever works
 * on the session's own candidate: ids from the browser (requests, documents, vacancies) are
 * validated and then matched against that candidate in the query itself.
 */

const idSchema = z.number().int().positive();
const cardSchema = z.enum(portalCards);
const messageSchema = f.optText(2000);

function issuesToErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0] ?? "_form")] ??= issue.message;
  return errors;
}

function portalAudit(session: CandidateSession, details: { entity: string; entityId?: number; text: string }) {
  return audit("portal_change", {
    entity: details.entity,
    entityId: details.entityId,
    summary: `Kandidat ${displayNo.candidate(session.candidateId)}: ${details.text}`,
  });
}

// --- Session --------------------------------------------------------------------

export async function logout(): Promise<void> {
  await destroyCandidateSession();
  // The client then loads /portal/login with a full page load (see PortalLogoutButton).
}

export async function logoutEverywhere(): Promise<void> {
  const session = await requireCandidate();
  await endAccountSessions(session.accountId);
  await destroyCandidateSession();
  await portalAudit(session, { entity: "candidate_account", entityId: session.accountId, text: "auf allen Geräten abgemeldet" });
}

const passwordChangeSchema = z.object({ current: z.string().min(1, "Bitte Ihr aktuelles Passwort eingeben.").max(PASSWORD_MAX + 1) });

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCandidate();
  const raw = formObject(formData);
  const current = passwordChangeSchema.safeParse(raw);
  const pair = passwordPairSchema.safeParse(raw);
  if (!current.success || !pair.success) {
    return fail("Bitte prüfen Sie die markierten Angaben.", {
      ...(current.success ? {} : issuesToErrors(current.error.issues)),
      ...(pair.success ? {} : issuesToErrors(pair.error.issues)),
    });
  }
  const ipHash = await requestIpHash();
  if (await loginBlocked("portal", ipHash)) return fail("Zu viele Versuche. Bitte warten Sie 15 Minuten.");
  const changed = await changePassword(session.accountId, current.data.current, pair.data.password, session.sessionId);
  if (!changed) {
    await recordLoginAttempt("portal", ipHash, false);
    return fail("Das aktuelle Passwort ist nicht korrekt.", { current: "Das aktuelle Passwort ist nicht korrekt." });
  }
  await portalAudit(session, { entity: "candidate_account", entityId: session.accountId, text: "Passwort geändert, andere Sitzungen beendet" });
  return ok("Passwort geändert. Auf anderen Geräten sind Sie jetzt abgemeldet.");
}

// --- Profile --------------------------------------------------------------------

/** Field names of the firm form ("firm.name", …) in the shape of the payload. */
function firmInput(raw: Record<string, string>) {
  return {
    firm: {
      name: raw["firm.name"],
      legalForm: raw["firm.legalForm"],
      uid: raw["firm.uid"],
      street: raw["firm.street"],
      postalCode: raw["firm.postalCode"],
      city: raw["firm.city"],
      country: raw["firm.country"],
    },
  };
}

/**
 * Saves a profile card as a change request with the complete new values of its section. The
 * firm card and the availability card share the "verfuegbarkeit" request; the other card's
 * part is taken from the open request (or the confirmed values).
 */
export async function saveCard(card: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCandidate();
  const c = cardSchema.parse(card);
  const section = cardSection(c);
  const raw = formObject(formData);
  const message = messageSchema.safeParse(raw.message);
  if (!message.success) return fail("Bitte prüfen Sie die markierten Angaben.", { message: message.error.issues[0]?.message ?? "Ungültig." });
  delete raw.message;

  const state = await sectionState(session.candidateId, section);
  if (!state) return fail("Ihr Profil wurde nicht gefunden.");
  const input = c === "firma" ? firmInput(raw) : raw;
  const base = (state.pending ?? state.current) as Record<string, unknown>;
  const parsed = parseSection(section, mergeCard(c, base, input));
  if (!parsed.ok) return fail(parsed.message, parsed.errors);

  const result = await saveSectionRequest(session.candidateId, section, parsed.data, message.data);
  if (result.status === "unchanged") {
    refresh();
    return ok(
      result.withdrawn
        ? "Ihre Angaben entsprechen wieder den bestätigten. Die offene Änderung wurde zurückgezogen."
        : "Keine Änderung gegenüber den bestätigten Angaben.",
    );
  }
  await portalAudit(session, { entity: "change_request", entityId: result.id, text: `Änderung «${labelOf(changeSections, section)}» vorgeschlagen` });
  redirect(`/portal/profil?gespeichert=${c}#${c}`);
}

export async function withdrawCardChange(card: string, requestId: number): Promise<ActionState> {
  const session = await requireCandidate();
  const c = cardSchema.parse(card);
  const id = idSchema.parse(requestId);
  const row = await withdrawCard(session.candidateId, c, id);
  if (!row) return fail("Diese Änderung ist nicht mehr offen.");
  await portalAudit(session, { entity: "change_request", entityId: id, text: `Änderung «${cardTitles[c]}» zurückgezogen` });
  refresh();
  return ok("Änderung zurückgezogen.");
}

// --- Stammdaten -----------------------------------------------------------------

const stammdatenSchema = z.object({ message: f.text(2000, "Bitte beschreiben Sie, was geändert werden soll.") });

export async function sendStammdatenMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCandidate();
  const parsed = stammdatenSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("Bitte prüfen Sie die markierten Angaben.", issuesToErrors(parsed.error.issues));
  const id = await saveStammdatenRequest(session.candidateId, parsed.data.message);
  await portalAudit(session, { entity: "change_request", entityId: id, text: "Stammdaten-Änderung gemeldet" });
  refresh();
  return ok("Danke, Ihre Meldung ist bei KOVALI angekommen.");
}

export async function withdrawStammdaten(requestId: number): Promise<ActionState> {
  const session = await requireCandidate();
  const id = idSchema.parse(requestId);
  const row = await withdrawRequest(session.candidateId, id);
  if (!row || row.section !== "stammdaten") return fail("Diese Meldung ist nicht mehr offen.");
  await portalAudit(session, { entity: "change_request", entityId: id, text: "Stammdaten-Meldung zurückgezogen" });
  refresh();
  return ok("Meldung zurückgezogen.");
}

// --- Documents ------------------------------------------------------------------

const MAX_UPLOADS = 40;
const MAX_UNCONFIRMED = 15;

export async function uploadOwnDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCandidate();
  const kind = z.enum(candidateDocumentKinds).safeParse(formData.get("kind"));
  if (!kind.success) return fail("Bitte die Art des Dokuments wählen.", { kind: "Bitte auswählen." });
  const file = await checkUpload(formData.get("file"));
  if (!file.ok) return fail(file.error, { file: file.error });

  const db = await getDb();
  const own = and(eq(documents.candidateId, session.candidateId), eq(documents.uploadedBy, "kandidat"));
  const [[all], [open]] = await Promise.all([
    db.select({ n: count() }).from(documents).where(own),
    db.select({ n: count() }).from(documents).where(and(own, isNull(documents.confirmedAt))),
  ]);
  if ((all?.n ?? 0) >= MAX_UPLOADS) return fail("Sie haben die maximale Anzahl Dokumente erreicht. Bitte löschen Sie zuerst ein älteres Dokument oder wenden Sie sich an KOVALI.");
  if ((open?.n ?? 0) >= MAX_UNCONFIRMED) return fail("Es warten schon viele Dokumente auf die Prüfung durch KOVALI. Bitte versuchen Sie es später wieder.");

  const stored = await storeDocument({ owner: { candidateId: session.candidateId }, kind: kind.data, file, uploadedBy: "kandidat" });
  await logActivity(
    { type: "candidate", id: session.candidateId },
    `Kandidatenportal: Dokument hochgeladen (${labelOf(documentKinds, kind.data)}, ${file.filename}), noch nicht bestätigt.`,
  );
  await portalAudit(session, { entity: "document", entityId: stored.id, text: "Dokument hochgeladen" });
  refresh();
  return ok("Hochgeladen und verschlüsselt gespeichert. KOVALI prüft das Dokument.");
}

export async function deleteOwnDocument(documentId: number): Promise<ActionState> {
  const session = await requireCandidate();
  const id = idSchema.parse(documentId);
  const row = await deleteOwnUpload(session.candidateId, id);
  if (!row) return fail("Dieses Dokument kann nicht gelöscht werden.");
  await logActivity({ type: "candidate", id: session.candidateId }, `Kandidatenportal: Dokument vor der Prüfung gelöscht (${row.filename}).`);
  await portalAudit(session, { entity: "document", entityId: id, text: "eigenes Dokument gelöscht" });
  refresh();
  return ok("Dokument gelöscht.");
}

// --- Vacancies ------------------------------------------------------------------

const interestSchema = z
  .object({ consent: f.checkbox(), message: f.optText(2000) })
  .refine((v) => v.consent, { message: "Bitte bestätigen Sie die Einwilligung. Ohne sie kann KOVALI Ihr Profil nicht weitergeben.", path: ["consent"] });

export async function markInterested(mandateId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireCandidate();
  const id = idSchema.parse(mandateId);
  const parsed = interestSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("Bitte prüfen Sie die markierten Angaben.", issuesToErrors(parsed.error.issues));
  const result = await answerVacancy(session.candidateId, id, { response: "interessiert", consent: true, message: parsed.data.message });
  if (!result.ok) return fail("Diese Vakanz ist nicht mehr verfügbar.");
  const firm = await hasConfirmedFirm(session.candidateId);
  const mandateNo = displayNo.mandate(id);
  await logActivity(
    [
      { type: "candidate", id: session.candidateId },
      { type: "mandate", id },
    ],
    [
      `Kandidatenportal: Interesse an ${mandateNo} gemeldet. Einwilligung zur Weitergabe des Profils für dieses Mandat erteilt.`,
      firm ? null : "Noch keine bestätigte Firma (GmbH/AG) erfasst.",
      parsed.data.message ? `Nachricht: ${parsed.data.message}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  await portalAudit(session, { entity: "vacancy_share", entityId: result.shareId, text: `Interesse an ${mandateNo}, Einwilligung erteilt` });
  refresh();
  return ok("Danke! Ihr Interesse ist bei KOVALI angekommen.");
}

export async function markNotInterested(mandateId: number): Promise<ActionState> {
  const session = await requireCandidate();
  const id = idSchema.parse(mandateId);
  const result = await answerVacancy(session.candidateId, id, { response: "kein_interesse", message: null });
  if (!result.ok) return fail("Diese Vakanz ist nicht mehr verfügbar.");
  const mandateNo = displayNo.mandate(id);
  if (result.consentRemoved || result.alreadySubmitted) {
    await logActivity(
      [
        { type: "candidate", id: session.candidateId },
        { type: "mandate", id },
      ],
      result.alreadySubmitted
        ? `Kandidatenportal: Interesse an ${mandateNo} zurückgezogen. Das Profil wurde bereits weitergegeben; keine weitere Weitergabe.`
        : `Kandidatenportal: Interesse an ${mandateNo} zurückgezogen, Einwilligung widerrufen.`,
    );
  }
  await portalAudit(session, { entity: "vacancy_share", entityId: result.shareId, text: `kein Interesse an ${mandateNo}${result.consentRemoved ? ", Einwilligung widerrufen" : ""}` });
  refresh();
  return ok(result.alreadySubmitted ? "Gespeichert. KOVALI ist informiert und gibt Ihr Profil nicht weiter." : "Gespeichert.");
}
