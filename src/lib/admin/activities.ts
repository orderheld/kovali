import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { activities } from "./db/schema";
import type { OwnerRef } from "./owner";

/** Notes and the history of a record (calls, e-mails, status changes). */

function ownerFilter(owner: OwnerRef) {
  switch (owner.type) {
    case "candidate":
      return eq(activities.candidateId, owner.id);
    case "company":
      return eq(activities.companyId, owner.id);
    case "mandate":
      return eq(activities.mandateId, owner.id);
    case "contract":
      return eq(activities.contractId, owner.id);
  }
}

function ownerValues(owners: OwnerRef[]) {
  const pick = (type: OwnerRef["type"]) => owners.find((o) => o.type === type)?.id ?? null;
  return { candidateId: pick("candidate"), companyId: pick("company"), mandateId: pick("mandate"), contractId: pick("contract") };
}

/**
 * Adds an entry to the history. Several owners show the same entry on each record, e.g. a
 * proposal on the candidate and on the mandate. `body` may name people: it is part of the
 * record, unlike the audit log.
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
