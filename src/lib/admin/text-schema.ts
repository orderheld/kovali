import { z } from "zod";
import { normalizeText } from "./texts";

/** Zod fields for longer texts from a textarea (snippets, application text, notes). */

const blankToNullText = (v: unknown) => {
  if (typeof v !== "string") return v ?? null;
  const t = normalizeText(v);
  return t === "" ? null : t;
};

const tooLong = (max: number) => `Höchstens ${new Intl.NumberFormat("de-CH").format(max)} Zeichen.`;

/** Form field for a longer, required text (textarea); line breaks are kept as LF. */
export function multilineText(max: number, message = "Bitte ausfüllen.") {
  return z.preprocess(blankToNullText, z.string({ error: message }).min(1, message).max(max, tooLong(max)));
}

/** Optional longer text (textarea): empty becomes null, line breaks are kept as LF. */
export function optMultilineText(max: number) {
  return z.preprocess(blankToNullText, z.string().max(max, tooLong(max)).nullable());
}
