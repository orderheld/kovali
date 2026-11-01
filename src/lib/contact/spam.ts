/**
 * Content check of a validated contact request. Bots are stopped before this (hidden field,
 * form token, fill time, rate limit); this check is for what people and tools type in: link
 * dumps, link markup, text in scripts a Swiss business request does not use, and typical sales
 * pitches. Each signal has a weight. From SPAM_SCORE on, the request is not delivered and the
 * visitor is asked to write by e-mail instead, so a false alarm never loses a request.
 *
 * The signals are deliberately narrow: consultancies, recruiters and clients write "Dear Sir or
 * Madam", "we are a leading …", mention casinos, banks, crypto, offshore teams, opt-out
 * processes or several job links, and all of that must pass (see test/contact-spam.test.ts).
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

/** Start of a web address: "https://www.x" counts once, "a.ch,https://b.ch" twice. */
const URL_START = /\bhttps?:\/\/|(?<![/\w.@-])www\./gi;
/** Whole web addresses, removed before the script check. */
const URL_FULL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
/** Link shorteners hide the target; a business request has no reason to use them. */
const SHORTENER = /\b(?:bit\.ly|tinyurl\.com|t\.me|cutt\.ly|goo\.gl|ow\.ly|is\.gd|rb\.gy|shorturl\.at|rebrand\.ly)\/\S/gi;
/** BBCode and HTML links. Plain "[Link]" placeholders and Markdown links only count as links. */
const LINK_MARKUP = /\[(?:url|link)=|\[\/(?:url|link)\]|<a\s[^>]*href/i;
/** Scripts that a request in German, French, Italian or English does not use. */
const FOREIGN_LETTERS = /[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const LETTERS = /\p{L}/gu;

/**
 * Typical phrases of advertising and scam messages. Weight by the number of patterns of one
 * group that match: [one, two, three or more].
 */
const PHRASES: [code: string, weights: number[], patterns: RegExp[]][] = [
  ["adult", [3], [/\b(?:viagra|cialis|porn\w*|escort\s*service\w*|sex\s*dating|hot\s+singles|sexy\s+(?:girls|women))\b/i]],
  ["gambling", [2], [/\b(?:casino\s+bonus\w*|free\s+spins|slot\s+machines?|online[\s-]?casino\s+(?:bonus|games?))\b/i]],
  [
    "seo",
    [1, 2, 3],
    [
      /\bback[\s-]?links?\b/i,
      /\bguest[\s-]?posts?\b/i,
      /\blink[\s-]?building\b/i,
      /\bdo[\s-]?follow\b/i,
      /\bseo[\s-]?(?:services?|packages?|pakete?|audit|analys[ei]s|analyse|agency|agentur|experts?|manager|executive|specialist|spezialist)\b/i,
      /\bsuchmaschinenoptimierung\b|\br[ée]f[ée]rencement\b|\bposizionamento\s+su\s+google\b/i,
    ],
  ],
  [
    "ranking",
    [2],
    [
      /\b(?:first|top|1st)\s+page\s+(?:of|on|in)\s+google\b|\bgoogle'?s?\s+first\s+page\b|\brank(?:ing)?\s+(?:higher|#?1|on\s+google)\b|\bnot\s+ranking\b|\bbei\s+google\s+(?:kaum|nicht|schlecht)\s+gefunden\b/i,
    ],
  ],
  [
    "traffic",
    [2],
    [
      /\b(?:increase|boost|drive|double|grow)\s+your\s+(?:website\s+|web\s+|online\s+|organic\s+)?(?:traffic|sales|leads|revenue|rankings?)\b|\bgenerate\s+more\s+leads\b|\bmore\s+(?:customers|clients|leads|traffic)\s+(?:from|through|via)\s+google\b/i,
    ],
  ],
  ["unsubscribe", [2], [/\bunsubscribe\s+(?:click|here|reply)|\bclick\s+here\s+to\s+unsubscribe\b|\breply\s+(?:with\s+)?["'«]?stop\b/i]],
  [
    "money",
    [2, 3],
    [
      /\bpayday\s+loans?\b|\bbinary\s+options?\b/i,
      /\bno\s+credit\s+check\b/i,
      /\bapproved\s+in\s+\d+\s+hours\b/i,
      /\bearn\s+\$?\d[\d,.']*\s*(?:per|a|\/)\s*(?:day|week|month)\b/i,
      /\b\d+\s*%\s+win\s+rate\b|\bguaranteed\s+(?:returns?|profits?)\b/i,
    ],
  ],
  ["copyright-threat", [3], [/\b(?:copyright|dmca)\b[\s\S]{0,300}\b(?:legal\s+action|lawsuit)\b/i]],
  ["data-list", [2], [/\b(?:verified|targeted)\s+(?:e-?mail\s+)?(?:list|database)\b|\be-?mail\s+(?:list|database)\s+of\b/i]],
  ["greeting", [1], [/\b(?:dear\s+(?:business|website|site)\s+owner|dear\s+owner|dear\s+friend|hello\s+sir|hi\s+sir)\b/i]],
  [
    "website-pitch",
    [1],
    [
      /\b(?:i|we)\s+(?:was\s+|were\s+|have\s+been\s+|just\s+)?(?:going\s+through|looking\s+at|checking|visiting|browsing|reviewing|came\s+across|visited|noticed|checked|reviewed|analy[sz]ed)\s+your\s+(?:website|site|web\s?page)\b|\bwir\s+haben\s+ihre\s+(?:website|webseite|homepage)\s+(?:analysiert|geprüft|angeschaut)\b|\bvotre\s+site\s+mérite\b|\brefonte\s+(?:complète\s+)?de\s+votre\s+site\b/i,
    ],
  ],
  [
    "agency",
    [1],
    [
      /\b(?:web\s?design|website\s+(?:design|development)|app\s+development|digital\s+marketing|lead\s+generation|appointment\s+setting)\s+(?:services?|company|agency|experts?)\b|\bfreelance\s+web\s?designer\b|\bweb\s?agency\b|\bagence\s+web\b|\bagenzia\s+web\b/i,
    ],
  ],
  [
    "price",
    [1],
    [
      /\b(?:best|affordable|reasonable|cheap(?:est)?|lowest)\s+(?:prices?|rates?|costs?)\b|\baffordable\s+(?:websites?|web\s?design|seo)\b|\$\s?\d+\s*(?:\/|per\s+)(?:hour|hr|month)\b|\bprezzi\s+vantaggiosi\b|\bà\s+partir\s+de\s+\d+/i,
    ],
  ],
  [
    "free-offer",
    [1],
    [
      /\bfree\s+(?:trial|demo|sample|(?:seo\s+|website\s+)?audit|(?:seo\s+|website\s+)analysis)\b|\bkostenlosen?\s+(?:seo-|website-)?(?:analyse|check)\b|\bdevis\s+gratuit\b|\baudit\s+gratuit\b|\bpreventivo\s+gratuito\b/i,
    ],
  ],
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * Random-looking words such as "RkXqPzWm": three or more capitals right after a small letter.
 * Only for the person's name: company names like "SwissQualityTestCenter" are common.
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

  // Only the typed text, without addresses: for the link dump and the script check.
  const prose = freeText.replace(URL_FULL, " ");
  const letters = countMatches(prose, LETTERS);

  // Several job ads or profiles are normal; a dump of addresses with hardly any text is not.
  const links = countMatches(all, URL_START);
  if (links >= 6 || (links >= 4 && letters < 15 * links)) add("links", 3);
  else if (links >= 3) add("links", 1);
  const shortLinks = countMatches(all, SHORTENER);
  if (shortLinks > 0) add("shortener", shortLinks >= 2 ? 3 : 2);
  if (LINK_MARKUP.test(all)) add("link-markup", 3);
  if (countMatches(name, URL_START) > 0) add("link-in-name", 3);
  else if (countMatches(company, URL_START) > 0) add("link-in-company", 2);

  // A Cyrillic or Greek name is fine, only the typed text counts.
  if (letters >= 10 && countMatches(prose, FOREIGN_LETTERS) / letters >= 0.3) add("script", 3);

  for (const [code, weights, patterns] of PHRASES) {
    const hits = patterns.filter((pattern) => pattern.test(all)).length;
    if (hits > 0) add(code, weights[Math.min(hits, weights.length) - 1]);
  }

  // Bots often put one text into every field. A long text equal to the name is never a real
  // request; a short one may be a signature.
  const normalized = (v: string) => v.trim().toLowerCase();
  const sameAsName = texts.find((t) => t !== undefined && normalized(t) === normalized(name));
  if (sameAsName !== undefined) add("same-text", sameAsName.trim().length >= 20 ? 3 : 1);
  if (looksRandom(name)) add("random-name", 2);

  return { spam: score >= SPAM_SCORE, score, reasons };
}
