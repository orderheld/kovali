/**
 * Legal form of a firm. Pure (no "server-only"), so the candidate page, the candidate form and
 * the submission rules of the mandate module share one answer.
 */

/** GmbH or AG, also in the French and Italian forms used in Switzerland (Sàrl, Sagl, SA). */
const CAPITAL_COMPANY = /(?<![\p{L}\p{N}])(gmbh|ag|sa|s\.a\.?|s[àa]rl|sagl|aktiengesellschaft|gesellschaft mit beschränkter haftung)(?![\p{L}\p{N}])/iu;

/**
 * Whether a firm is a capital company (GmbH or AG). A sole proprietorship as subcontractor
 * carries a higher risk of bogus self-employment. The legal form field decides when it is
 * filled in; otherwise the legal name and the name are checked, because Swiss law requires
 * the legal form in the name of a GmbH or AG.
 */
export function isCapitalCompany(firm: { legalForm?: string | null; legalName?: string | null; name?: string | null }): boolean {
  const source = firm.legalForm?.trim() || [firm.legalName, firm.name].filter(Boolean).join(" ");
  return CAPITAL_COMPANY.test(source);
}
