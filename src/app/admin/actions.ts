"use server";

import { audit } from "@/lib/admin/audit";
import { destroyAdminSession, getAdminSession } from "@/lib/admin/auth/session";

export async function logout(): Promise<void> {
  if (await getAdminSession()) {
    await audit("logout");
  }
  await destroyAdminSession();
  // The client then loads /admin/login with a full page load (see LogoutButton).
}
