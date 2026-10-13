"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { destroyAdminSession, getAdminSession } from "@/lib/admin/auth/session";

export async function logout(): Promise<void> {
  if (await getAdminSession()) {
    await audit("logout");
  }
  await destroyAdminSession();
  redirect("/admin/login");
}
