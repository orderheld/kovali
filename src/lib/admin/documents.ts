import "server-only";
import { eq } from "drizzle-orm";
import { decryptBlob, decryptText, encryptBlob, encryptText, sha256 } from "./crypto";
import { getDb } from "./db/client";
import { candidates, documents } from "./db/schema";
import { normalizeSkills, detectSkills } from "./skills";

/**
 * Encrypted document storage (CVs, certificates, signed contracts). Files are encrypted with
 * AES-256-GCM before they reach the database; text extracted from CVs is encrypted as well.
 * Only the detected skill keywords are stored in plain text, for matching.
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

export async function checkUpload(value: FormDataEntryValue | null, allowed: FileKind[] = ["pdf", "docx", "png", "jpeg"]): Promise<UploadCheck> {
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: "Bitte eine Datei auswählen.", empty: true };
  if (value.size > DOCUMENT_MAX_BYTES) return { ok: false, error: `Die Datei ist grösser als ${DOCUMENT_MAX_LABEL}.` };
  const content = Buffer.from(await value.arrayBuffer());
  const kind = sniffKind(content);
  if (!kind || !allowed.includes(kind)) {
    const names = allowed.map((k) => (k === "jpeg" ? "JPG" : k.toUpperCase())).join(", ");
    return { ok: false, error: `Erlaubt sind nur ${names}-Dateien.` };
  }
  return { ok: true, content, kind, mimeType: MIME[kind], filename: safeFilename(value.name, kind) };
}

/** Plain text of a PDF or Word file, for keyword detection. Never throws. */
export async function extractText(content: Buffer, kind: FileKind): Promise<string | null> {
  try {
    if (kind === "pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(content));
      const { text } = await pdfText(pdf, { mergePages: true });
      return text.slice(0, 200_000);
    }
    if (kind === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: content });
      return value.slice(0, 200_000);
    }
  } catch (error) {
    console.warn(JSON.stringify({ event: "admin.text_extraction_failed", kind, error: String(error).slice(0, 200) }));
  }
  return null;
}

export type DocumentOwner =
  | { candidateId: number }
  | { companyId: number }
  | { mandateId: number }
  | { contractId: number };

export async function storeDocument(input: {
  owner: DocumentOwner;
  kind: string;
  file: Extract<UploadCheck, { ok: true }>;
  uploadedBy?: "admin" | "kandidat";
}): Promise<{ id: number; detectedSkills: string[] }> {
  const db = await getDb();
  const text = input.kind === "cv" ? await extractText(input.file.content, input.file.kind) : null;
  const confirmed = (input.uploadedBy ?? "admin") === "admin";
  const [row] = await db
    .insert(documents)
    .values({
      ...("candidateId" in input.owner ? { candidateId: input.owner.candidateId } : {}),
      ...("companyId" in input.owner ? { companyId: input.owner.companyId } : {}),
      ...("mandateId" in input.owner ? { mandateId: input.owner.mandateId } : {}),
      ...("contractId" in input.owner ? { contractId: input.owner.contractId } : {}),
      kind: input.kind,
      filename: input.file.filename,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.content.length,
      sha256: sha256(input.file.content),
      uploadedBy: input.uploadedBy ?? "admin",
      confirmedAt: confirmed ? new Date() : null,
      content: encryptBlob(input.file.content),
      textContent: text ? encryptText(text) : null,
    })
    .returning({ id: documents.id });
  const detected = text ? detectSkills(text) : [];
  if (confirmed && detected.length && "candidateId" in input.owner) {
    await refreshDetectedSkills(input.owner.candidateId);
  }
  return { id: row.id, detectedSkills: detected };
}

/** Recomputes a candidate's CV keywords from all confirmed CVs. */
export async function refreshDetectedSkills(candidateId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ text: documents.textContent, kind: documents.kind, confirmedAt: documents.confirmedAt })
    .from(documents)
    .where(eq(documents.candidateId, candidateId));
  const found: string[] = [];
  for (const r of rows) {
    if (r.kind !== "cv" || !r.text || !r.confirmedAt) continue;
    try {
      found.push(...detectSkills(decryptText(r.text)));
    } catch {
      // An unreadable entry must not block the others.
    }
  }
  const detected = normalizeSkills(found);
  await db.update(candidates).set({ detectedSkills: detected }).where(eq(candidates.id, candidateId));
  return detected;
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
  uploadedBy: documents.uploadedBy,
  confirmedAt: documents.confirmedAt,
  createdAt: documents.createdAt,
  candidateId: documents.candidateId,
  companyId: documents.companyId,
  mandateId: documents.mandateId,
  contractId: documents.contractId,
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
