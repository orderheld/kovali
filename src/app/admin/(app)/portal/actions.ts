"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDateTime } from "@/lib/admin/format";
import { f, fail, ok, parseForm, type ActionState } from "@/lib/admin/forms";
import { changeSections, labelOf } from "@/lib/admin/options";
import { site } from "@/config/site";
import { accountForIssuedLink, createInvitation, deleteAccount, renewLink, setAccountLocked, type IssuedLink } from "@/lib/portal/accounts";
import { markShareReviewed } from "@/lib/portal/admin";
import { completeStammdatenRequest, confirmRequest, rejectRequest } from "@/lib/portal/change-requests";
import { portalEmailMode, sendInvitationEmail } from "@/lib/portal/email";
import { invitationLink, originFrom } from "@/lib/portal/links";
import type { LinkState } from "./link-state";

/**
 * Ferhat's actions on the candidate portal. Each one checks the admin session first; ids are
 * validated with Zod. Audit entries name candidates by number only (K-0042).
 */

const idSchema = z.number().int().positive();
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const sectionLabel = (section: string) => labelOf(changeSections, section);

// --- Change requests ------------------------------------------------------------

export async function confirmChange(requestId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(requestId);
  const result = await confirmRequest(id);
  if (!result.ok) return fail(result.error);
  const no = displayNo.candidate(result.candidateId);
  const outcome = result.firm;
  const firmNo = outcome ? displayNo.company(outcome.companyId) : "";
  const firm = outcome
    ? outcome.created
      ? ` Firma «${outcome.name}» als Subunternehmer ${firmNo} angelegt und verknüpft.`
      : outcome.reused
        ? ` Mit der bestehenden Firma ${firmNo} «${outcome.name}» verknüpft; deren Angaben bleiben unverändert.`
        : ` Firma ${firmNo} aktualisiert und verknüpft.`
    : "";
  await logActivity({ type: "candidate", id: result.candidateId }, `Kandidatenportal: Änderung «${sectionLabel(result.section)}» bestätigt und übernommen.${firm}`);
  if (outcome) {
    await logActivity(
      { type: "company", id: outcome.companyId },
      outcome.reused
        ? `Kandidat ${no} über das Kandidatenportal mit dieser Firma verknüpft; Angaben der Firma unverändert.`
        : `Firmenangaben aus dem Kandidatenportal übernommen (Kandidat ${no}).`,
    );
  }
  const firmAudit = outcome ? `, Firma ${firmNo} ${outcome.created ? "angelegt" : outcome.reused ? "verknüpft" : "aktualisiert"}` : "";
  await audit("review", { entity: "change_request", entityId: id, summary: `Kandidat ${no}: «${sectionLabel(result.section)}» bestätigt${firmAudit}` });
  refresh();
  if (outcome?.created) return ok("Übernommen. Die Firma wurde als Subunternehmer angelegt.");
  if (outcome?.reused) {
    const others = outcome.others ? ` Sie ist auch mit ${outcome.others === 1 ? "1 weiteren Person" : `${outcome.others} weiteren Personen`} verknüpft.` : "";
    return ok(`Übernommen. Verknüpft mit ${firmNo} «${outcome.name}»; deren Angaben wurden nicht geändert.${others}`);
  }
  return ok("Übernommen.");
}

const rejectSchema = z.object({ note: f.text(1000, "Bitte kurz begründen. Die Person sieht diese Notiz im Portal.") });

export async function rejectChange(requestId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(requestId);
  const parsed = parseForm(rejectSchema, formData);
  if (!parsed.ok) return parsed.state;
  const result = await rejectRequest(id, parsed.data.note);
  if (!result.ok) return fail(result.error);
  await logActivity({ type: "candidate", id: result.candidateId }, `Kandidatenportal: Änderung «${sectionLabel(result.section)}» abgelehnt: ${parsed.data.note}`);
  await audit("review", { entity: "change_request", entityId: id, summary: `Kandidat ${displayNo.candidate(result.candidateId)}: «${sectionLabel(result.section)}» abgelehnt` });
  refresh();
  return ok("Abgelehnt. Die Person sieht deine Notiz im Portal.");
}

const completeSchema = z.object({ note: f.optText(1000) });

export async function completeStammdaten(requestId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(requestId);
  const parsed = parseForm(completeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const result = await completeStammdatenRequest(id, parsed.data.note);
  if (!result.ok) return fail(result.error);
  await logActivity({ type: "candidate", id: result.candidateId }, `Kandidatenportal: Stammdaten-Meldung erledigt.${parsed.data.note ? ` Notiz: ${parsed.data.note}` : ""}`);
  await audit("review", { entity: "change_request", entityId: id, summary: `Kandidat ${displayNo.candidate(result.candidateId)}: Stammdaten-Meldung erledigt` });
  refresh();
  return ok("Als erledigt markiert.");
}

// --- Interest -------------------------------------------------------------------

export async function markInterestReviewed(shareId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(shareId);
  const row = await markShareReviewed(id);
  if (!row) return fail("Schon erledigt.");
  await audit("review", {
    entity: "vacancy_share",
    entityId: id,
    summary: `Kandidat ${displayNo.candidate(row.candidateId)}, ${displayNo.mandate(row.mandateId)}: Antwort «${row.response}» gesehen`,
  });
  refresh();
  return ok("Erledigt.");
}

// --- Accounts -------------------------------------------------------------------

/** Origin of Ferhat's own request, so the shown link matches the deployment he works on. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  return originFrom(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto")) ?? site.url.value;
}

async function issued(link: IssuedLink, kind: "einladung" | "neu", message: string): Promise<LinkState> {
  return {
    status: "success",
    message,
    link: {
      accountId: link.accountId,
      candidateId: link.candidateId,
      url: invitationLink(await requestOrigin(), link.token),
      token: link.token,
      email: link.email,
      expiresAt: formatDateTime(link.expiresAt),
      kind,
    },
  };
}

const inviteSchema = z.object({
  candidateId: z.preprocess((v) => (typeof v === "string" && v ? Number(v) : v), z.number({ error: "Bitte eine Person wählen." }).int().positive("Bitte eine Person wählen.")),
  email: f.email(),
});

export async function createPortalInvitation(_prev: LinkState, formData: FormData): Promise<LinkState> {
  await requireAdmin();
  const parsed = parseForm(inviteSchema, formData);
  if (!parsed.ok) {
    const state = parsed.state;
    return { status: "error", message: state.status === "error" ? (state.message ?? "Bitte prüfe die Angaben.") : "Bitte prüfe die Angaben.", errors: state.status === "error" ? state.errors : undefined };
  }
  const result = await createInvitation(parsed.data.candidateId, parsed.data.email);
  if (!result.ok) {
    const message =
      result.error === "candidate_missing"
        ? "Diese Person gibt es nicht mehr."
        : result.error === "account_exists"
          ? "Diese Person hat schon einen Zugang. Erstelle dort einen neuen Link."
          : "Diese E-Mail-Adresse wird schon für einen anderen Zugang verwendet.";
    return { status: "error", message, errors: result.error === "email_taken" ? { email: message } : undefined };
  }
  const no = displayNo.candidate(result.link.candidateId);
  await logActivity({ type: "candidate", id: result.link.candidateId }, `Kandidatenportal: Zugang für ${result.link.email} erstellt, Einladungslink bis ${formatDateTime(result.link.expiresAt)} gültig.`);
  await audit("create", { entity: "candidate_account", entityId: result.link.accountId, summary: `Portalzugang für Kandidat ${no} erstellt` });
  refresh();
  return issued(result.link, "einladung", "Zugang erstellt.");
}

export async function renewPortalLink(accountId: number): Promise<LinkState> {
  await requireAdmin();
  const id = idSchema.parse(accountId);
  const link = await renewLink(id);
  if (!link) return { status: "error", message: "Für einen gesperrten Zugang gibt es keinen Link. Entsperre ihn zuerst." };
  await logActivity({ type: "candidate", id: link.candidateId }, `Kandidatenportal: neuer Link erstellt, gültig bis ${formatDateTime(link.expiresAt)}. Der bisherige Link gilt nicht mehr.`);
  await audit("update", { entity: "candidate_account", entityId: id, summary: `Portalzugang Kandidat ${displayNo.candidate(link.candidateId)}: neuer Link` });
  refresh();
  return issued(link, "neu", "Neuer Link erstellt. Der bisherige gilt nicht mehr.");
}

export async function sendPortalLinkEmail(accountId: number, token: string): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(accountId);
  const t = tokenSchema.safeParse(token);
  if (!t.success) return fail("Ungültiger Link.");
  if (portalEmailMode() === "off") return fail("Der E-Mail-Versand ist nicht eingerichtet. Kopiere den Link und schicke ihn selbst.");
  const account = await accountForIssuedLink(id, t.data);
  if (!account || !account.tokenExpiresAt) return fail("Dieser Link gilt nicht mehr. Erstelle einen neuen.");
  const no = displayNo.candidate(account.candidateId);
  const sent = await sendInvitationEmail({
    to: account.email,
    firstName: account.firstName,
    link: invitationLink(await requestOrigin(), t.data),
    expiresAt: account.tokenExpiresAt,
    label: `Einladung ${no}`,
  });
  if (!sent.ok) {
    console.error(JSON.stringify({ event: "portal.invitation_email_failed", candidate: no, error: sent.error }));
    return fail("Die E-Mail konnte nicht gesendet werden. Kopiere den Link und schicke ihn selbst.");
  }
  await logActivity({ type: "candidate", id: account.candidateId }, sent.dryRun ? "Kandidatenportal: Einladung per E-Mail (Testmodus, nicht versendet)." : `Kandidatenportal: Einladung per E-Mail an ${account.email} gesendet.`);
  await audit("update", { entity: "candidate_account", entityId: id, summary: `Portalzugang Kandidat ${no}: Link per E-Mail${sent.dryRun ? " (Testmodus)" : ""}` });
  return ok(sent.dryRun ? "Testmodus: nichts versendet (CONTACT_DRY_RUN)." : `E-Mail an ${account.email} gesendet.`);
}

export async function lockPortalAccount(accountId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(accountId);
  const row = await setAccountLocked(id, true);
  if (!row) return fail("Diesen Zugang gibt es nicht mehr.");
  await logActivity({ type: "candidate", id: row.candidateId }, "Kandidatenportal: Zugang gesperrt, alle Sitzungen beendet.");
  await audit("update", { entity: "candidate_account", entityId: id, summary: `Portalzugang Kandidat ${displayNo.candidate(row.candidateId)} gesperrt` });
  refresh();
  return ok("Gesperrt. Alle Sitzungen sind beendet.");
}

export async function unlockPortalAccount(accountId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(accountId);
  const row = await setAccountLocked(id, false);
  if (!row) return fail("Dieser Zugang ist nicht gesperrt.");
  await logActivity({ type: "candidate", id: row.candidateId }, "Kandidatenportal: Zugang entsperrt.");
  await audit("update", { entity: "candidate_account", entityId: id, summary: `Portalzugang Kandidat ${displayNo.candidate(row.candidateId)} entsperrt` });
  refresh();
  return ok(row.status === "aktiv" ? "Entsperrt." : "Entsperrt. Die Person braucht noch einen Link, um ein Passwort zu setzen.");
}

export async function deletePortalAccount(accountId: number): Promise<ActionState> {
  await requireAdmin();
  const id = idSchema.parse(accountId);
  const row = await deleteAccount(id);
  if (!row) return fail("Diesen Zugang gibt es nicht mehr.");
  await logActivity({ type: "candidate", id: row.candidateId }, "Kandidatenportal: Zugang gelöscht. Profil, Dokumente und Antworten bleiben erhalten.");
  await audit("delete", { entity: "candidate_account", entityId: id, summary: `Portalzugang Kandidat ${displayNo.candidate(row.candidateId)} gelöscht` });
  refresh();
  return ok("Zugang gelöscht.");
}
