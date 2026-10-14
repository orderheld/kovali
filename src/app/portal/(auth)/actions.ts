"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { site } from "@/config/site";
import { logActivity } from "@/lib/admin/activities";
import { audit } from "@/lib/admin/audit";
import { loginBlocked, recordLoginAttempt } from "@/lib/admin/auth/rate-limit";
import { isAdminConfigured } from "@/lib/admin/env";
import { displayNo } from "@/lib/admin/format";
import { f, fail, formObject, ok, type ActionState } from "@/lib/admin/forms";
import { requestIpHash } from "@/lib/admin/request";
import { authenticate, createResetLink, redeemLink } from "@/lib/portal/accounts";
import { sendResetEmail } from "@/lib/portal/email";
import { resetLink, safePortalTarget } from "@/lib/portal/links";
import { PASSWORD_MAX, passwordPairSchema } from "@/lib/portal/password";
import { createCandidateSession } from "@/lib/portal/session";

/**
 * Public actions of the candidate portal: login, invitation and password reset. All of them
 * are throttled per IP (scope "portal", separate from the admin login) and answer without
 * revealing whether an e-mail address has an account.
 */

const TOO_MANY = "Zu viele Versuche. Bitte warten Sie 15 Minuten und versuchen Sie es dann erneut.";
const NOT_READY = "Das Kandidatenportal ist noch nicht eingerichtet.";

function issuesToErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0] ?? "_form")] ??= issue.message;
  return errors;
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "Bitte Ihre E-Mail-Adresse eingeben.").max(200),
  password: z.string().min(1, "Bitte Ihr Passwort eingeben.").max(PASSWORD_MAX + 1),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) return fail(NOT_READY);
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("Bitte E-Mail-Adresse und Passwort eingeben.", issuesToErrors(parsed.error.issues));

  const ipHash = await requestIpHash();
  if (await loginBlocked("portal", ipHash)) return fail(TOO_MANY);

  const account = await authenticate(parsed.data.email, parsed.data.password);
  if (!account) {
    await recordLoginAttempt("portal", ipHash, false);
    await audit("portal_login_failed");
    return fail("E-Mail-Adresse oder Passwort ist nicht korrekt.");
  }
  await recordLoginAttempt("portal", ipHash, true);
  await createCandidateSession(account.accountId);
  await audit("portal_login", { entity: "candidate", entityId: account.candidateId, summary: `Kandidat ${displayNo.candidate(account.candidateId)}` });
  redirect(safePortalTarget(formData.get("next")));
}

const invitationSchema = z
  .object({ privacy: f.checkbox() })
  .refine((v) => v.privacy, { message: "Bitte bestätigen Sie, dass Sie die Datenschutzhinweise gelesen haben.", path: ["privacy"] });

export async function acceptInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) return fail(NOT_READY);
  const raw = formObject(formData);
  const pair = passwordPairSchema.safeParse(raw);
  const privacy = invitationSchema.safeParse(raw);
  if (!pair.success || !privacy.success) {
    return fail("Bitte prüfen Sie die markierten Angaben.", {
      ...(pair.success ? {} : issuesToErrors(pair.error.issues)),
      ...(privacy.success ? {} : issuesToErrors(privacy.error.issues)),
    });
  }
  const ipHash = await requestIpHash();
  if (await loginBlocked("portal", ipHash)) return fail(TOO_MANY);

  const account = await redeemLink(raw.token, "einladung", pair.data.password);
  if (!account) {
    await recordLoginAttempt("portal", ipHash, false);
    return fail("Dieser Link ist ungültig, abgelaufen oder wurde schon verwendet. Bitte fragen Sie KOVALI nach einem neuen Link.");
  }
  await recordLoginAttempt("portal", ipHash, true);
  await createCandidateSession(account.accountId);
  const no = displayNo.candidate(account.candidateId);
  await logActivity({ type: "candidate", id: account.candidateId }, "Kandidatenportal: Zugang aktiviert, Datenschutzhinweise zur Kenntnis genommen.");
  await audit("portal_login", { entity: "candidate", entityId: account.candidateId, summary: `Kandidat ${no}: Einladung angenommen, Datenschutzhinweise bestätigt` });
  redirect("/portal?willkommen=1");
}

const resetRequestSchema = z.object({ email: f.email() });

/**
 * Always the same answer. When an active account exists, a reset link is created and the
 * e-mail goes out after the response (after()), so the response time does not depend on it.
 * Each request counts as an attempt for the IP throttle, which also limits e-mails per sender.
 */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) return fail(NOT_READY);
  const parsed = resetRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("Bitte prüfen Sie die E-Mail-Adresse.", issuesToErrors(parsed.error.issues));
  const ipHash = await requestIpHash();
  if (await loginBlocked("portal", ipHash)) return fail(TOO_MANY);
  await recordLoginAttempt("portal", ipHash, false);

  const request = await createResetLink(parsed.data.email);
  if (request) {
    const no = displayNo.candidate(request.candidateId);
    // Never the Host header: a forged host would put the token into a foreign link.
    const link = resetLink(site.url.value, request.token);
    after(async () => {
      const sent = await sendResetEmail({ to: request.email, firstName: request.firstName, link, label: `Passwort ${no}` });
      if (!sent.ok) console.error(JSON.stringify({ event: "portal.reset_email_failed", candidate: no, error: sent.error }));
      await audit("portal_change", { entity: "candidate", entityId: request.candidateId, summary: `Kandidat ${no}: Link für neues Passwort angefordert` });
    });
  }
  return ok("Falls ein aktiver Zugang mit dieser E-Mail-Adresse besteht, erhalten Sie in wenigen Minuten eine E-Mail mit einem Link. Der Link ist eine Stunde gültig.");
}

export async function setNewPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) return fail(NOT_READY);
  const raw = formObject(formData);
  const pair = passwordPairSchema.safeParse(raw);
  if (!pair.success) return fail("Bitte prüfen Sie die markierten Angaben.", issuesToErrors(pair.error.issues));
  const ipHash = await requestIpHash();
  if (await loginBlocked("portal", ipHash)) return fail(TOO_MANY);

  const account = await redeemLink(raw.token, "reset", pair.data.password);
  if (!account) {
    await recordLoginAttempt("portal", ipHash, false);
    return fail("Dieser Link ist ungültig, abgelaufen oder wurde schon verwendet. Bitte fordern Sie einen neuen an.");
  }
  await recordLoginAttempt("portal", ipHash, true);
  // redeemLink ended every session of the account; this device gets a fresh one.
  await createCandidateSession(account.accountId);
  await audit("portal_change", { entity: "candidate", entityId: account.candidateId, summary: `Kandidat ${displayNo.candidate(account.candidateId)}: Passwort neu gesetzt, andere Sitzungen beendet` });
  redirect("/portal?passwort=neu");
}
