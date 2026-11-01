/**
 * Content check of a validated contact request. Bots are stopped before this (hidden field,
 * form token, fill time, rate limit); this check is for what people and tools type in: link
 * lists, link markup, text in scripts a Swiss business request does not use, and typical
 * sales pitches. Each signal has a weight. From SPAM_SCORE on, the request is not delivered and
 * the visitor is asked to write by e-mail instead, so a false alarm never loses a request.
 */

export const SPAM_SCORE = 3;

export interface SpamCheckInput {
  name: string;
  company?: string;
  /** Free text: description, requirements, message, location. */
  texts: (string | undefined)[];
}

export interface SpamResult {
  spam: boolean;
  score: number;
  /** Short codes for the log, never the text itself. */
  reasons: string[];
}

/** A web address, counted once even when it starts with "https://www.". */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
/** BBCode, HTML and Markdown links: never needed in a plain text field. */
const LINK_MARKUP = /\[\/?(?:url|link)\b|<a\s[^>]*href|\]\(\s*https?:\/\//i;
/** Scripts that a request in German, French, Italian or English does not use. */
const FOREIGN_LETTERS = /[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const LETTERS = /\p{L}/gu;

/** Typical phrases of advertising and scam messages, with their weight. */
const PHRASES: [code: string, weight: number, pattern: RegExp][] = [
  ["adult", 3, /\b(?:viagra|cialis|casino|porn\w*|escort\s*service\w*|sex\s*dating)\b/i],
  ["seo", 2, /\b(?:back\s?links?|guest\s?posts?|link\s?building|seo[\s-]?(?:services?|agency|agentur|experts?|packages?|pakete?))\b/i],
  ["ranking", 2, /\b(?:first|top|1st)\s+page\s+(?:of|on|in)\s+google\b|\bgoogle'?s?\s+first\s+page\b|\brank(?:ing)?\s+(?:higher|#?1|on\s+google)\b/i],
  ["traffic", 2, /\b(?:increase|boost|drive|double)\s+(?:your\s+)?(?:website\s+|web\s+|organic\s+)?(?:traffic|sales|leads|revenue)\b/i],
  ["unsubscribe", 2, /\bunsubscribe\b|\bopt[\s-]?out\b|\breply\s+(?:with\s+)?["'«]?stop\b/i],
  ["money", 2, /\b(?:loan|investment|crypto|bitcoin|forex|trading)\s+(?:offers?|opportunit(?:y|ies)|profits?|signals?)\b|\bpayday\s+loans?\b|\bbinary\s+options?\b/i],
  ["greeting", 1, /\b(?:dear\s+(?:sir|madam|sir\s*\/\s*madam|business\s+owner|website\s+owner|owner|team|friend)|hello\s+sir|hi\s+sir)\b/i],
  ["pitch", 1, /\bwe\s+are\s+an?\s+(?:leading|top|reputed|renowned|professional|award[\s-]winning)\b/i],
  ["offshore", 1, /\b(?:offshore|white[\s-]?label|(?:hire|dedicated)\s+(?:developers?|programmers?|resources|team))\b/i],
  ["agency", 1, /\b(?:web\s?design|website\s+(?:design|development|redesign)|app\s+development|digital\s+marketing|lead\s+generation|appointment\s+setting)\s+(?:services?|company|agency|experts?|solutions?)\b/i],
  ["free-offer", 1, /\bfree\s+(?:trial|quote|audit|consultation|demo|sample)\b/i],
  ["messenger", 1, /\b(?:whats\s?app|telegram|wechat|skype)\b\s*(?:(?:me|us|number|nr|id)\b|[:+])/i],
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * Random-looking words such as "RkXqPzWm": three or more capitals right after a small letter.
 * Names like "McDonald", "MacKenzie-McLeod" or "SwissTestLab" stay below that.
 */
function looksRandom(value: string): boolean {
  return value.split(/[\s\-'’.]+/).some((word) => word.length >= 6 && countMatches(word, /(?<=\p{Ll})\p{Lu}/gu) >= 3);
}

export function checkSpam({ name, company = "", texts }: SpamCheckInput): SpamResult {
  const reasons: string[] = [];
  let score = 0;
  const add = (reason: string, weight: number) => {
    reasons.push(reason);
    score += weight;
  };

  const freeText = texts.filter((t): t is string => typeof t === "string" && t !== "").join("\n");
  const all = [name, company, freeText].join("\n");

  const links = countMatches(all, URL_PATTERN);
  if (links >= 4) add("links", 3);
  else if (links >= 2) add("links", 1);
  if (LINK_MARKUP.test(all)) add("link-markup", 3);
  if (countMatches(name, URL_PATTERN) > 0) add("link-in-name", 3);

  const letters = countMatches(all, LETTERS);
  if (letters >= 10 && countMatches(all, FOREIGN_LETTERS) / letters >= 0.3) add("script", 3);

  for (const [code, weight, pattern] of PHRASES) {
    if (pattern.test(all)) add(code, weight);
  }

  // Bots often put one text into every field. A long text equal to the name is never a real
  // request; a short one may be a signature.
  const normalized = (v: string) => v.trim().toLowerCase();
  const sameAsName = texts.find((t) => t !== undefined && normalized(t) === normalized(name));
  if (sameAsName !== undefined) add("same-text", sameAsName.trim().length >= 20 ? 3 : 1);
  if (looksRandom(name) || looksRandom(company)) add("random-name", 2);

  return { spam: score >= SPAM_SCORE, score, reasons };
}
