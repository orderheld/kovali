import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";

/**
 * Remembers the last accepted TOTP step, so a code that was seen (shoulder, screen sharing,
 * a proxy log) cannot be used a second time. The update is atomic across server instances.
 */
export async function claimTotpStep(step: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(sql`
    insert into settings (key, value) values ('admin_totp_last_step', ${JSON.stringify(step)}::jsonb)
    on conflict (key) do update set value = excluded.value, updated_at = now()
    where (settings.value #>> '{}')::bigint < (excluded.value #>> '{}')::bigint
    returning key`);
  return result.rows.length === 1;
}

/** Only relative admin paths are accepted as target after the login. */
export function safeAdminTarget(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9\-._~%/?=&]*)?$/.test(value) || value.startsWith("//") || value.includes("..")) return "/admin";
  if (value.startsWith("/admin/login") || value.startsWith("/admin/einrichtung")) return "/admin";
  return value;
}
