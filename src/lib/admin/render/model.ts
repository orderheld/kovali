/**
 * Format-neutral document model for everything the admin area exports: contracts, candidate
 * dossiers, consent forms and calculations. pdf.tsx and docx.ts render the same model, so a
 * PDF and its Word version always have the same content.
 */

export type Inline = string | { text: string; bold?: boolean; italic?: boolean };
export type Rich = string | Inline[];

export type Block =
  /** Large title at the top of the first page. */
  | { type: "title"; text: string; subtitle?: string }
  /** Section heading, optionally numbered ("3", "3.2"). */
  | { type: "heading"; text: string; level?: 1 | 2; number?: string }
  /** Body text. `number` renders a hanging clause number ("3.1"). */
  | { type: "paragraph"; text: Rich; number?: string; muted?: boolean; small?: boolean }
  | { type: "list"; items: Rich[]; ordered?: boolean }
  /** Two-column facts, e.g. "Pensum: 80 %". */
  | { type: "facts"; rows: { label: string; value: Rich }[] }
  | { type: "table"; columns: { label: string; width?: number; align?: "left" | "right" }[]; rows: Rich[][] }
  /** Contract parties side by side. */
  | { type: "parties"; parties: { role: string; lines: string[] }[]; between?: string }
  /** Signature lines with place/date, one column per party. */
  | { type: "signatures"; parties: { party: string; signers: { name?: string; role?: string }[] }[] }
  /** Skill chips in dossiers. */
  | { type: "tags"; items: string[] }
  /** Highlighted box, e.g. a hint or a summary. */
  | { type: "box"; title?: string; text: Rich }
  /** One entry of a CV timeline. */
  | { type: "timeline"; period: string; title: string; subtitle?: string; text?: string; tags?: string[] }
  | { type: "spacer"; size?: "sm" | "md" | "lg" }
  | { type: "pageBreak" };

export interface DocModel {
  /** Shown in the header of every page and in the file metadata, e.g. "Rahmenvertrag". */
  docType: string;
  /** File title, e.g. "Rahmenvertrag V-2026-0001 – Muster AG". */
  title: string;
  /** Reference in the header, e.g. "V-2026-0001". */
  reference?: string;
  /** Line in the footer next to the page number. */
  footer: string;
  /** "Vertraulich" marker in the header. */
  confidential?: boolean;
  blocks: Block[];
}

export function inlineText(r: Rich): string {
  return typeof r === "string" ? r : r.map((i) => (typeof i === "string" ? i : i.text)).join("");
}

/** File name without characters that cause trouble in mail clients or Windows. */
export function exportFileName(title: string, ext: "pdf" | "docx"): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._ -]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return `${base || "dokument"}.${ext}`;
}
