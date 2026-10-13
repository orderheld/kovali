import "server-only";
import { readUpload, type UploadKind } from "@/lib/uploads";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_LABEL } from "./options";

export type Attachment = { kind: UploadKind; content: Buffer };
export type AttachmentCheck = { ok: true; attachment?: Attachment } | { ok: false; error: string };

/** Optional requirement profile: one PDF or Word file (.docx) up to ATTACHMENT_MAX_BYTES. */
export async function checkAttachment(value: FormDataEntryValue | null): Promise<AttachmentCheck> {
  const upload = await readUpload(value, ATTACHMENT_MAX_BYTES);
  if (upload.status === "empty") return { ok: true };
  if (upload.status === "too_large") {
    return { ok: false, error: `Die Datei ist grösser als ${ATTACHMENT_MAX_LABEL}. Bitte laden Sie eine kleinere Datei hoch.` };
  }
  if (upload.kind === "unknown") {
    return { ok: false, error: "Bitte laden Sie das Anforderungsprofil als PDF- oder Word-Datei (.docx) hoch." };
  }
  return { ok: true, attachment: { kind: upload.kind, content: upload.content } };
}
