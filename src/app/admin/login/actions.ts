"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { claimTotpStep, safeAdminTarget } from "@/lib/admin/auth/login";
import { verifyAdminPassword } from "@/lib/admin/auth/password";
import { loginBlocked, recordLoginAttempt } from "@/lib/admin/auth/rate-limit";
import { createAdminSession } from "@/lib/admin/auth/session";
import { verifyTotp } from "@/lib/admin/auth/totp";
import { adminEnv, isAdminConfigured } from "@/lib/admin/env";
import { fail, type ActionState } from "@/lib/admin/forms";
import { requestIpHash } from "@/lib/admin/request";

/**
 * The only way in: Ferhat's password and the current code from Google Authenticator, both
 * required. There are no other accounts and no registration.
 */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const totpSecret = adminEnv.totpSecret;
  if (!isAdminConfigured() || !totpSecret) redirect("/admin/einrichtung");

  const ipHash = await requestIpHash();
  if (await loginBlocked(ipHash)) {
    return fail("Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut.");
  }

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  let valid = await verifyAdminPassword(password);
  if (valid) {
    const step = verifyTotp(totpSecret, code);
    // Each code works once: a code seen by someone else cannot be used again.
    valid = step !== null && (await claimTotpStep(step));
  }

  if (!valid) {
    await recordLoginAttempt(ipHash, false);
    await audit("login_failed");
    return fail("Passwort oder Code ist nicht korrekt.");
  }

  await recordLoginAttempt(ipHash, true);
  await createAdminSession();
  await audit("login");
  redirect(safeAdminTarget(formData.get("next")));
}
