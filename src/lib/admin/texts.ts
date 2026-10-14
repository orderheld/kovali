/**
 * Helpers for texts Ferhat copies: snippets (Textbausteine) and the application text of a
 * vacancy. No database and no React.
 */

/**
 * Text from a textarea as stored: browsers send line breaks as CRLF, the database keeps LF, so a
 * copied text has the same breaks everywhere. Leading and trailing blank space is dropped.
 */
export function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

export interface TextStats {
  chars: number;
  words: number;
}

/** Characters and words, e.g. for application forms with a length limit. */
export function textStats(text: string | null | undefined): TextStats {
  const t = text ?? "";
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  return { chars: t.length, words };
}

/** "1’234 Zeichen · 210 Wörter" */
export function formatTextStats({ chars, words }: TextStats): string {
  const n = new Intl.NumberFormat("de-CH");
  return `${n.format(chars)} Zeichen · ${n.format(words)} ${words === 1 ? "Wort" : "Wörter"}`;
}

/** The start of a text for previews, cut at a word boundary. Line breaks are kept. */
export function previewText(text: string, max = 280): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.search(/\s\S*$/);
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

export interface SnippetSection<T> {
  /** "angeheftet", the category, or "" for snippets without a category. */
  key: string;
  title: string;
  items: T[];
}

export const PINNED_SECTION = "angeheftet";

/**
 * Sections of the snippet list: pinned snippets first, then one section per category in
 * alphabetical order, snippets without a category last. A pinned snippet only appears once,
 * under "Angeheftet". The order within a section is kept.
 */
export function groupSnippets<T extends { pinned: boolean; category: string | null }>(rows: readonly T[]): SnippetSection<T>[] {
  const pinned = rows.filter((r) => r.pinned);
  const byCategory = new Map<string, T[]>();
  for (const row of rows) {
    if (row.pinned) continue;
    const key = row.category?.trim() ?? "";
    const list = byCategory.get(key);
    if (list) list.push(row);
    else byCategory.set(key, [row]);
  }
  const categories = [...byCategory.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "de", { sensitivity: "base" })));
  return [
    ...(pinned.length ? [{ key: PINNED_SECTION, title: "Angeheftet", items: pinned }] : []),
    ...categories.map((key) => ({ key, title: key || "Ohne Kategorie", items: byCategory.get(key)! })),
  ];
}
