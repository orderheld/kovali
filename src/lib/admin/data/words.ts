import { and, type SQL } from "drizzle-orm";
import { likePattern } from "./query";

/** Word-wise text search: "GHR Kurzprofil" finds "Bewerbung GHR: Kurzprofil". */

const MAX_WORDS = 6;

/** ILIKE patterns of the words in a search text (at most six), with %, _ and \ escaped. */
export function wordPatterns(q: string | null | undefined): string[] {
  const words = (q ?? "").trim().slice(0, 100).split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
  return words.map((w) => likePattern(w)).filter((p): p is string => p !== null);
}

/**
 * Every word has to match at least one field; `match` returns the condition for one word
 * pattern (usually an `or` over the fields). Undefined for empty input.
 */
export function everyWord(q: string | null | undefined, match: (pattern: string) => SQL | undefined): SQL | undefined {
  const patterns = wordPatterns(q);
  if (!patterns.length) return undefined;
  return and(...patterns.map(match));
}
