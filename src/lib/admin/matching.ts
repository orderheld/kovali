import { kovaliVatRegistered } from "./party";
import { VAT_RATE_PERCENT } from "./payroll";
import { normalizeSkill } from "./skills";
import { toHourly } from "./rates";

/**
 * Candidate-to-mandate matching. Pure and deterministic, so the ranking is explainable:
 * every point in the score comes with a reason shown in the admin.
 *
 * Weights (max 100): required skills 45, nice-to-have skills 10, discipline 15,
 * seniority 10, availability 10, workload 5, rate 5.
 */

export interface MatchCandidate {
  id: number;
  status: string;
  disciplines: string[];
  skills: string[];
  sapModules: string[];
  detectedSkills: string[];
  seniority: string | null;
  availableFrom: string | null;
  workloadMin: number | null;
  workloadMax: number | null;
  rateAmount: number | null;
  rateUnit: string | null;
  consentAt: Date | null;
  retentionUntil: string | null;
}

export interface MatchMandate {
  disciplines: string[];
  requiredSkills: string[];
  niceSkills: string[];
  seniority: string | null;
  startDate: string | null;
  workload: number | null;
  rateSell: number | null;
  rateUnit: string | null;
}

export interface MatchResult {
  score: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedNice: string[];
  /** Skills only found in the CV text, not yet confirmed in the profile. */
  fromCvOnly: string[];
  reasons: string[];
  warnings: string[];
}

const SENIORITY_ORDER = ["junior", "professional", "senior", "expert"];

function key(s: string): string {
  return normalizeSkill(s).toLowerCase();
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export interface MatchOptions {
  /**
   * KOVALI has a VAT number (kovaliVatRegistered()). Without one it cannot reclaim the VAT the
   * candidate's firm charges, so the margin counts that VAT as cost (as the Rechner does).
   */
  kovaliVatRegistered?: boolean;
}

export function matchCandidate(c: MatchCandidate, m: MatchMandate, today: string, opts: MatchOptions = {}): MatchResult {
  const profile = new Map<string, string>();
  for (const s of [...c.skills, ...c.sapModules]) profile.set(key(s), normalizeSkill(s));
  const cv = new Map<string, string>();
  for (const s of c.detectedSkills) cv.set(key(s), normalizeSkill(s));

  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Required skills: full weight from the profile, half weight if only found in the CV text.
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const fromCvOnly: string[] = [];
  let requiredPoints = 0;
  for (const s of m.requiredSkills) {
    const k = key(s);
    if (profile.has(k)) {
      matchedRequired.push(normalizeSkill(s));
      requiredPoints += 1;
    } else if (cv.has(k)) {
      matchedRequired.push(normalizeSkill(s));
      fromCvOnly.push(normalizeSkill(s));
      requiredPoints += 0.5;
    } else {
      missingRequired.push(normalizeSkill(s));
    }
  }
  if (m.requiredSkills.length > 0) {
    const pts = (45 * requiredPoints) / m.requiredSkills.length;
    score += pts;
    reasons.push(`${matchedRequired.length} von ${m.requiredSkills.length} Muss-Kompetenzen`);
  } else {
    score += 22.5;
  }

  const matchedNice: string[] = [];
  for (const s of m.niceSkills) {
    const k = key(s);
    if (profile.has(k) || cv.has(k)) matchedNice.push(normalizeSkill(s));
  }
  if (m.niceSkills.length > 0) {
    score += (10 * matchedNice.length) / m.niceSkills.length;
    if (matchedNice.length) reasons.push(`${matchedNice.length} von ${m.niceSkills.length} Kann-Kompetenzen`);
  } else {
    score += 5;
  }

  if (m.disciplines.length === 0) {
    score += 7.5;
  } else if (c.disciplines.some((d) => m.disciplines.includes(d))) {
    score += 15;
    reasons.push("Passender Schwerpunkt");
  }

  if (!m.seniority || !c.seniority) {
    score += 5;
  } else {
    const diff = SENIORITY_ORDER.indexOf(c.seniority) - SENIORITY_ORDER.indexOf(m.seniority);
    if (diff === 0) {
      score += 10;
      reasons.push("Seniorität passt");
    } else if (diff > 0) {
      score += 7;
      reasons.push("Seniorität höher als gefordert");
    } else if (diff === -1) {
      score += 4;
      warnings.push("Seniorität eine Stufe tiefer als gefordert");
    } else {
      warnings.push("Seniorität deutlich tiefer als gefordert");
    }
  }

  const start = m.startDate && m.startDate > today ? m.startDate : today;
  if (!c.availableFrom || c.availableFrom <= start) {
    score += 10;
    if (c.availableFrom) reasons.push("Verfügbar zum Start");
  } else {
    const late = daysBetween(start, c.availableFrom);
    if (late <= 30) {
      score += 5;
      warnings.push(`Erst ${late} Tage nach Start verfügbar`);
    } else {
      warnings.push(`Erst ${late} Tage nach Start verfügbar`);
    }
  }

  if (!m.workload || c.workloadMax === null || c.workloadMax === undefined) {
    score += 2.5;
  } else if (c.workloadMax >= m.workload && (c.workloadMin ?? 0) <= m.workload) {
    score += 5;
  } else {
    warnings.push(`Pensum ${c.workloadMin ?? 0}–${c.workloadMax} % statt ${m.workload} %`);
  }

  const sell = toHourly(m.rateSell, m.rateUnit);
  const buy = toHourly(c.rateAmount, c.rateUnit);
  const vatIsCost = !(opts.kovaliVatRegistered ?? kovaliVatRegistered());
  // The firm's VAT KOVALI cannot reclaim is part of the cost.
  const cost = buy === null ? null : vatIsCost ? buy * (1 + VAT_RATE_PERCENT / 100) : buy;
  if (sell === null || buy === null || cost === null) {
    score += 2.5;
  } else if (buy >= sell) {
    warnings.push("Satzvorstellung über dem Budget");
  } else if (cost >= sell) {
    warnings.push("Keine Marge nach nicht abziehbarer MWST des Subunternehmens");
  } else {
    score += 5;
    const marginPct = Math.round(((sell - cost) / sell) * 100);
    reasons.push(`Marge rund ${marginPct} %${vatIsCost ? " (inkl. nicht abziehbarer MWST des Subunternehmens)" : ""}`);
    if (marginPct < 10) warnings.push("Marge unter 10 %");
  }

  if (c.status === "nicht_verfuegbar" || c.status === "im_einsatz") warnings.push("Derzeit nicht verfügbar");
  if (!c.consentAt) warnings.push("Keine Einwilligung zur Speicherung erfasst");
  if (c.retentionUntil && c.retentionUntil < today) warnings.push("Aufbewahrungsfrist abgelaufen");

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    matchedRequired,
    missingRequired,
    matchedNice,
    fromCvOnly,
    reasons,
    warnings,
  };
}

/** Ranks candidates for a mandate, best first. Archived candidates are left out. */
export function rankCandidates<C extends MatchCandidate>(
  candidates: C[],
  mandate: MatchMandate,
  today: string,
  opts: MatchOptions = {},
): { candidate: C; match: MatchResult }[] {
  const options = { kovaliVatRegistered: opts.kovaliVatRegistered ?? kovaliVatRegistered() };
  return candidates
    .filter((c) => c.status !== "archiviert")
    .map((candidate) => ({ candidate, match: matchCandidate(candidate, mandate, today, options) }))
    .sort((a, b) => b.match.score - a.match.score || a.candidate.id - b.candidate.id);
}
