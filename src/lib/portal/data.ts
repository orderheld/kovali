import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/admin/db/client";
import { candidates, documents } from "@/lib/admin/db/schema";
import { loadDocument } from "@/lib/admin/documents";
import { loadProfileSource } from "./change-requests";

/**
 * Reads for the candidate portal. Every function takes the candidate id of the session and
 * filters by it; internal fields (notes, rating, source, consent records) are never selected.
 */

/** Master data shown read-only on /portal/stammdaten. */
export async function portalCandidate(candidateId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      phone: candidates.phone,
      dateOfBirth: candidates.dateOfBirth,
      street: candidates.street,
      postalCode: candidates.postalCode,
      city: candidates.city,
      country: candidates.country,
      privacyInfoAt: candidates.privacyInfoAt,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  return row ?? null;
}

export async function portalProfile(candidateId: number) {
  return loadProfileSource(await getDb(), candidateId);
}

/** Document kinds a candidate may upload. */
export const candidateDocumentKinds = ["cv", "zeugnis", "diplom", "zertifikat", "sonstiges"] as const;

/**
 * The candidate's own uploads. Documents Ferhat stored himself (e-mailed CVs, contracts,
 * internal files) are not listed: they may contain his assessments.
 */
export async function ownUploads(candidateId: number) {
  const db = await getDb();
  return db
    .select({
      id: documents.id,
      kind: documents.kind,
      filename: documents.filename,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      confirmedAt: documents.confirmedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.candidateId, candidateId), eq(documents.uploadedBy, "kandidat")))
    .orderBy(desc(documents.createdAt), desc(documents.id));
}

export async function pendingUploadCount(candidateId: number): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(documents)
    .where(and(eq(documents.candidateId, candidateId), eq(documents.uploadedBy, "kandidat"), isNull(documents.confirmedAt)));
  return row?.n ?? 0;
}

/** One of the candidate's own uploads, decrypted, or null (also for other people's documents). */
export async function loadOwnUpload(candidateId: number, documentId: number) {
  const db = await getDb();
  const [meta] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.candidateId, candidateId), eq(documents.uploadedBy, "kandidat")))
    .limit(1);
  if (!meta) return null;
  const doc = await loadDocument(meta.id);
  return doc && doc.candidateId === candidateId ? doc : null;
}

/** Deletes an own upload that Ferhat has not confirmed yet. */
export async function deleteOwnUpload(candidateId: number, documentId: number) {
  const db = await getDb();
  const [row] = await db
    .delete(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.candidateId, candidateId),
        eq(documents.uploadedBy, "kandidat"),
        isNull(documents.confirmedAt),
      ),
    )
    .returning({ id: documents.id, filename: documents.filename });
  return row ?? null;
}

/**
 * KOVALI only proposes specialists through their own GmbH or AG; without a confirmed firm
 * (a linked company) interest is accepted, but the profile cannot be proposed yet.
 */
export async function hasConfirmedFirm(candidateId: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ companyId: candidates.companyId }).from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  return Boolean(row?.companyId);
}
