import "server-only";

export type UploadKind = "pdf" | "docx";

export type UploadRead =
  | { status: "empty" }
  | { status: "too_large" }
  | { status: "ok"; kind: UploadKind | "unknown"; content: Buffer };

/**
 * Reads one uploaded file and detects its type from the content (not from the name or the
 * MIME type the browser sends). PDF: "%PDF-" within the first kilobyte, as readers accept it.
 * Word (.docx): a ZIP archive that contains word/document.xml.
 */
export async function readUpload(value: FormDataEntryValue | null, maxBytes: number): Promise<UploadRead> {
  if (!(value instanceof File) || value.size === 0) return { status: "empty" };
  if (value.size > maxBytes) return { status: "too_large" };
  const content = Buffer.from(await value.arrayBuffer());
  let kind: UploadKind | "unknown" = "unknown";
  if (content.subarray(0, 1024).indexOf("%PDF-") !== -1) kind = "pdf";
  else if (content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && content.indexOf("word/document.xml") !== -1) {
    kind = "docx";
  }
  return { status: "ok", kind, content };
}
