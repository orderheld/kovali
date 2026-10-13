import "server-only";
import { readUpload } from "@/lib/uploads";
import { CV_MAX_BYTES, CV_MAX_LABEL } from "./options";

export type CvCheck = { ok: true; content: Buffer } | { ok: false; error: string };

/** Accepts exactly one PDF up to CV_MAX_BYTES, checked by its content. */
export async function checkCv(value: FormDataEntryValue | null): Promise<CvCheck> {
  const upload = await readUpload(value, CV_MAX_BYTES);
  if (upload.status === "empty") return { ok: false, error: "Bitte laden Sie Ihren Lebenslauf als PDF hoch." };
  if (upload.status === "too_large") {
    return { ok: false, error: `Die Datei ist grösser als ${CV_MAX_LABEL}. Bitte laden Sie eine kleinere PDF-Datei hoch.` };
  }
  if (upload.kind !== "pdf") return { ok: false, error: "Bitte laden Sie Ihren Lebenslauf als PDF-Datei hoch." };
  return { ok: true, content: upload.content };
}
