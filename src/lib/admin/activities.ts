import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { activities } from "./db/schema";
import type { OwnerRef } from "./owner";

/** Notes and the history of a record (calls, e-mails, status changes). */

function ownerFilter(owner: OwnerRef) {
  switch (owner.type) {
    case "company":
      return eq(activities.companyId, owner.id);
    case "mandate":
      return eq(activities.mandateId, owner.id);
    case "contract":
      return eq(activities.contractId, owner.id);
    case "assignment":
      return eq(activities.assignmentId, owner.id);
  }
}

function ownerValues(owners: OwnerRef[]) {
  const pick = (type: OwnerRef["type"]) => owners.find((o) => o.type === type)?.id ?? null;
  return { companyId: pick("company"), mandateId: pick("mandate"), contractId: pick("contract"), assignmentId: pick("assignment") };
}

/**
 * Adds an entry to the history. Several owners show the same entry on each record, e.g. a
 * contract filed for an assignment on both. `body` may name people: it is part of the record,
 * unlike the audit log.
 */
export async function logActivity(owner: OwnerRef | OwnerRef[], body: string, kind = "system"): Promise<void> {
  const owners = Array.isArray(owner) ? owner : [owner];
  if (!owners.length) return;
  const db = await getDb();
  await db.insert(activities).values({ ...ownerValues(owners), kind, body: body.slice(0, 4000) });
}

export async function listActivities(owner: OwnerRef, limit = 50) {
  const db = await getDb();
  return db.select().from(activities).where(ownerFilter(owner)).orderBy(desc(activities.createdAt), desc(activities.id)).limit(limit);
}
