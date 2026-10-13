import { serverEnv } from "@/lib/env";
import { deleteExpiredRequests } from "@/lib/contact/store";

/**
 * Daily retention job (see vercel.json): deletes stored contact requests older than
 * CONTACT_RETENTION_DAYS. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  // Without a database there is nothing to delete, so the job succeeds without a secret.
  if (!serverEnv.databaseUrl) {
    return Response.json({ deleted: 0, storage: "disabled" });
  }
  const secret = serverEnv.cronSecret;
  if (!secret) {
    // Make a missing secret visible: without it, stored requests would never be deleted.
    console.error(JSON.stringify({ event: "contact.retention_misconfigured", reason: "CRON_SECRET missing" }));
    return Response.json({ error: "misconfigured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const deleted = await deleteExpiredRequests(serverEnv.retentionDays);
  console.info(JSON.stringify({ event: "contact.retention", deleted, days: serverEnv.retentionDays }));
  return Response.json({ deleted });
}
