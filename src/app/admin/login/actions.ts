"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { claimTotpStep, safeAdminTarget } from "@/lib/admin/auth/login";
import { verifyAdminPassword } from "@/lib/admin/auth/password";
import { checkLoginCode, removeOldAttempts, reserveLoginAttempt } from "@/lib/admin/auth/rate-limit";
import { createAdminSession } from "@/lib/admin/auth/session";
import { verifyTotp } from "@/lib/admin/auth/totp";
import { adminEnv, isAdminConfigured } from "@/lib/admin/env";
import { fail, type ActionState } from "@/lib/admin/forms";
import { requestIpHash } from "@/lib/admin/request";

const WRONG = "Passwort oder Code ist nicht korrekt.";
const IP_BLOCKED = "Zu viele Fehlversuche von dieser Adresse. Bitte warte 15 Minuten.";
const CODE_LOCKED =
  "Die Anmeldung ist für bis zu eine Stunde gesperrt: Mit dem richtigen Passwort wurde zu oft ein falscher Code eingegeben. Warst das nicht du, ändere das Passwort.";

/**
 * The only way in: Ferhat's password and the current code from Google Authenticator, both
 * required. There are no other accounts and no registration. The attempt is reserved before
 * the password check, so parallel requests cannot pass the limits (see auth/rate-limit.ts).
 */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const totpSecret = adminEnv.totpSecret;
  if (!isAdminConfigured() || !totpSecret) redirect("/admin/einrichtung");

  const ipHash = await requestIpHash();
  const reservation = await reserveLoginAttempt(ipHash);
  if (reservation.status === "ip_blocked") return fail(IP_BLOCKED);
  if (reservation.status === "code_locked") return fail(CODE_LOCKED);

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!(await verifyAdminPassword(password))) {
    // The reserved attempt stays recorded as a failure.
    await removeOldAttempts();
    await audit("login_failed");
    return fail(WRONG);
  }

  const result = await checkLoginCode(reservation.id, ipHash, async (tx) => {
    const step = verifyTotp(totpSecret, code);
    // Each code works once: a code seen by someone else cannot be used again.
    return step !== null && (await claimTotpStep(step, tx));
  });
  if (result !== "ok") {
    await audit("login_failed");
    return fail(result === "locked" ? CODE_LOCKED : WRONG);
  }

  await createAdminSession();
  await audit("login");
  redirect(safeAdminTarget(formData.get("next")));
}
