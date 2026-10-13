import "server-only";
import { CV_MAX_BYTES, CV_MAX_LABEL } from "./options";

export type CvCheck = { ok: true; content: Buffer } | { ok: false; error: string };

/**
 * Accepts exactly one PDF up to CV_MAX_BYTES. The type is checked on the file's content
 * (PDF header), not on the name or MIME type the browser sends.
 */
export async function checkCv(value: FormDataEntryValue | null): Promise<CvCheck> {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, error: "Bitte laden Sie Ihren Lebenslauf als PDF hoch." };
  }
  if (value.size > CV_MAX_BYTES) {
    return { ok: false, error: `Die Datei ist grösser als ${CV_MAX_LABEL}. Bitte laden Sie eine kleinere PDF-Datei hoch.` };
  }
  const content = Buffer.from(await value.arrayBuffer());
  // The PDF header may follow a few bytes of preamble; readers accept it within the first kilobyte.
  if (content.subarray(0, 1024).indexOf("%PDF-") === -1) {
    return { ok: false, error: "Bitte laden Sie Ihren Lebenslauf als PDF-Datei hoch." };
  }
  return { ok: true, content };
}
