import { serverEnv } from "@/lib/env";
import { deleteExpiredRequests, isStorageConfigured } from "@/lib/contact/store";

/**
 * Daily retention job (see vercel.json): deletes stored contact requests older than
 * CONTACT_RETENTION_DAYS. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = serverEnv.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return Response.json({ deleted: 0, storage: "disabled" });
  }
  const deleted = await deleteExpiredRequests(serverEnv.retentionDays);
  console.info(JSON.stringify({ event: "contact.retention", deleted, days: serverEnv.retentionDays }));
  return Response.json({ deleted });
}
