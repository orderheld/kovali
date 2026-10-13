import "server-only";
import { neon } from "@neondatabase/serverless";
import { serverEnv } from "@/lib/env";
import type { EmailResult } from "./email";
import type { ContactInput } from "./schema";

/** Optional storage in Neon Postgres. All functions are no-ops without DATABASE_URL. */
function db() {
  return serverEnv.databaseUrl ? neon(serverEnv.databaseUrl) : null;
}

/**
 * Requests are stored only when the privacy policy's promises can hold: a secret salt for
 * the IP hash and a secret for the daily deletion job.
 */
export function isStorageConfigured(): boolean {
  return Boolean(serverEnv.databaseUrl && serverEnv.cronSecret && serverEnv.ipSalt);
}

/** Requests from this IP hash in the last hour, across all server instances. */
export async function recentRequestCount(ipHash: string): Promise<number> {
  const sql = db();
  if (!sql) return 0;
  const rows = await sql`
    select count(*)::int as count from contact_requests
    where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`;
  return (rows[0]?.count as number | undefined) ?? 0;
}

export async function storeContactRequest(
  input: ContactInput,
  reference: string,
  ipHash: string,
  email: EmailResult,
): Promise<void> {
  const sql = db();
  if (!sql) return;
  await sql`
    insert into contact_requests (
      reference, name, company, email, phone, request_type, service, project_description,
      desired_start, work_mode, location, message, consent_at, ip_hash,
      email_status, email_id, email_error
    ) values (
      ${reference}, ${input.name}, ${input.company ?? null}, ${input.email}, ${input.phone ?? null},
      ${input.requestType}, ${input.service ?? null}, ${input.projectDescription},
      ${input.start ?? null}, ${input.workMode ?? null}, ${input.location ?? null}, ${input.message ?? null},
      now(), ${ipHash},
      ${email.ok ? "sent" : "failed"}, ${email.ok ? email.id : null}, ${email.ok ? null : email.error.slice(0, 500)}
    )`;
}

/** Deletes stored requests older than the retention period. Returns the number of rows removed. */
export async function deleteExpiredRequests(days: number): Promise<number> {
  const sql = db();
  if (!sql) return 0;
  const rows = await sql`
    delete from contact_requests
    where created_at < now() - make_interval(days => ${days})
    returning id`;
  return rows.length;
}
