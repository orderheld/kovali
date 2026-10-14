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

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isAdminConfigured()) redirect("/admin/einrichtung");

  const ipHash = await requestIpHash();
  if (await loginBlocked("admin", ipHash)) {
    return fail("Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut.");
  }

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  let valid = await verifyAdminPassword(password);
  if (valid && adminEnv.totpSecret) {
    const step = verifyTotp(adminEnv.totpSecret, code);
    valid = step !== null && (await claimTotpStep(step));
  }

  if (!valid) {
    await recordLoginAttempt("admin", ipHash, false);
    await audit("login_failed");
    return fail(adminEnv.totpSecret ? "Passwort oder Code ist nicht korrekt." : "Das Passwort ist nicht korrekt.");
  }

  await recordLoginAttempt("admin", ipHash, true);
  await createAdminSession();
  await audit("login");
  redirect(safeAdminTarget(formData.get("next")));
}
