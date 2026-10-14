import "server-only";
import { eq } from "drizzle-orm";
import { decryptBlob, encryptBlob, sha256 } from "./crypto";
import { getDb } from "./db/client";
import { documents } from "./db/schema";

/**
 * Encrypted document storage (postings, applications, signed contracts, reports, payslips).
 * Files are encrypted with AES-256-GCM before they reach the database.
 */

/** Largest accepted file. Vercel accepts request bodies up to 4.5 MB. */
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_MAX_LABEL = "4 MB";
export const DOCUMENT_ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

export type FileKind = "pdf" | "docx" | "png" | "jpeg";

const MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpeg: "image/jpeg",
};

export type UploadCheck =
  | { ok: true; content: Buffer; kind: FileKind; mimeType: string; filename: string }
  | { ok: false; error: string; empty?: boolean };

/** Detects the file type from its content, never from the name or the browser's MIME type. */
export function sniffKind(content: Buffer): FileKind | null {
  if (content.subarray(0, 1024).indexOf("%PDF-") !== -1) return "pdf";
  if (content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && content.indexOf("word/document.xml") !== -1) {
    return "docx";
  }
  if (content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return "jpeg";
  return null;
}

/** Keeps a readable file name without paths or control characters. */
export function safeFilename(name: string, kind: FileKind): string {
  const base = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "")
    .trim()
    .slice(0, 120);
  const ext = kind === "jpeg" ? "jpg" : kind;
  const withoutExt = base.replace(/\.[a-z0-9]{2,5}$/i, "") || "dokument";
  return `${withoutExt}.${ext}`;
}

/** "PDF-, DOCX-, PNG- und JPG" or "PDF": the file kinds in German, before "-Dateien". */
export function kindList(kinds: readonly FileKind[]): string {
  const names = kinds.map((k) => (k === "jpeg" ? "JPG" : k.toUpperCase()));
  if (names.length <= 1) return names.join("");
  return `${names
    .slice(0, -1)
    .map((n) => `${n}-`)
    .join(", ")} und ${names.at(-1)}`;
}

export async function checkUpload(value: FormDataEntryValue | null, allowed: FileKind[] = ["pdf", "docx", "png", "jpeg"]): Promise<UploadCheck> {
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: "Bitte eine Datei auswählen.", empty: true };
  if (value.size > DOCUMENT_MAX_BYTES) return { ok: false, error: `Die Datei ist grösser als ${DOCUMENT_MAX_LABEL}.` };
  const content = Buffer.from(await value.arrayBuffer());
  const kind = sniffKind(content);
  if (!kind || !allowed.includes(kind)) {
    return { ok: false, error: `Erlaubt sind nur ${kindList(allowed)}-Dateien.` };
  }
  return { ok: true, content, kind, mimeType: MIME[kind], filename: safeFilename(value.name, kind) };
}

/** Exactly one owner per document (database constraint documents_owner). */
export type DocumentOwner = { companyId: number } | { mandateId: number } | { contractId: number } | { assignmentId: number };

export async function storeDocument(input: { owner: DocumentOwner; kind: string; file: Extract<UploadCheck, { ok: true }> }): Promise<{ id: number }> {
  const db = await getDb();
  const [row] = await db
    .insert(documents)
    .values({
      ...input.owner,
      kind: input.kind,
      filename: input.file.filename,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.content.length,
      sha256: sha256(input.file.content),
      content: encryptBlob(input.file.content),
    })
    .returning({ id: documents.id });
  return { id: row.id };
}

/** Loads and decrypts a document. The caller checks authorisation and writes the audit entry. */
export async function loadDocument(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!row) return null;
  return { ...row, plain: decryptBlob(row.content) };
}

/** Metadata only (no content), for lists. */
export const documentListColumns = {
  id: documents.id,
  kind: documents.kind,
  filename: documents.filename,
  mimeType: documents.mimeType,
  sizeBytes: documents.sizeBytes,
  createdAt: documents.createdAt,
  companyId: documents.companyId,
  mandateId: documents.mandateId,
  contractId: documents.contractId,
  assignmentId: documents.assignmentId,
};

/** Response headers for sending a decrypted document to the browser. */
export function documentResponse(doc: { plain: Buffer; filename: string; mimeType: string }, disposition: "inline" | "attachment" = "attachment"): Response {
  const ascii = doc.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(new Uint8Array(doc.plain), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.plain.length),
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
