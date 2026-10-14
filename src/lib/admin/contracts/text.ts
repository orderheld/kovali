import { formatChf, formatLongDate, formatNumber } from "../format";
import type { Party } from "../party";
import { HOURS_PER_DAY } from "../rates";
import type { Block, Rich } from "../render/model";
import type { CompanyInfo, ContactInfo, PersonInfo } from "./types";

/**
 * Building blocks for the contract texts: automatic clause numbering (1, 1.1, 1.2 …),
 * party and signature blocks and the clauses several templates share. Swiss German legal
 * style, "ss" instead of "ß", amounts via formatChf, dates via formatLongDate.
 */

/** Collects headings and clauses and numbers them: section "3", clauses "3.1", "3.2". */
export class Clauses {
  readonly blocks: Block[] = [];
  private sectionNo = 0;
  private clauseNo = 0;

  /** Starts a numbered section and returns its number. */
  section(title: string): string {
    this.sectionNo += 1;
    this.clauseNo = 0;
    this.blocks.push({ type: "heading", text: title, number: String(this.sectionNo) });
    return String(this.sectionNo);
  }

  /** Adds a numbered clause to the current section and returns its number. */
  clause(text: Rich): string {
    this.clauseNo += 1;
    const number = `${this.sectionNo}.${this.clauseNo}`;
    this.blocks.push({ type: "paragraph", number, text });
    return number;
  }

  /** Several clauses at once; empty entries are skipped. */
  clauses(...texts: (Rich | null | undefined | false)[]): void {
    for (const t of texts) if (t) this.clause(t);
  }

  facts(rows: { label: string; value: Rich }[]): void {
    const shown = rows.filter((r) => (typeof r.value === "string" ? r.value.trim() !== "" : r.value.length > 0));
    if (shown.length) this.blocks.push({ type: "facts", rows: shown });
  }

  /** The number the next section will get, for references to later sections. */
  get nextSection(): string {
    return String(this.sectionNo + 1);
  }
}

// --- Values ---------------------------------------------------------------------

export const MISSING = "[bitte ergänzen]";

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function bool(v: unknown): boolean {
  return v === true;
}

export function personName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
}

export function rateUnitText(unit: unknown): string {
  return unit === "tag" ? "pro Tag" : "pro Stunde";
}

/** "CHF 145.00 pro Stunde" */
export function rateText(amount: unknown, unit: unknown): string {
  const a = num(amount);
  return a === null ? MISSING : `${formatChf(a)} ${rateUnitText(unit)}`;
}

/** "8.4" – hours of a working day, formatted like other numbers in Swiss documents. */
export const HOURS_PER_DAY_TEXT = formatNumber(HOURS_PER_DAY, 1);

export function dateOrMissing(iso: string | null | undefined): string {
  return iso ? formatLongDate(iso) : MISSING;
}

/** Pluralised count: "12 Monate", "1 Monat". */
export function count(n: number, one: string, many: string): string {
  return `${formatNumber(n, 0)} ${n === 1 ? one : many}`;
}

/** Swiss German words for small numbers in running text ("drei Monate"). */
export function countWord(n: number, one: string, many: string): string {
  const words = ["null", "einem", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
  if (n === 1) return `einem ${one}`;
  return `${Number.isInteger(n) && n >= 0 && n < words.length ? words[n] : formatNumber(n, 0)} ${many}`;
}

// --- Parties --------------------------------------------------------------------

function addressLines(a: { street: string | null; postalCode: string | null; city: string | null; country: string }): string[] {
  const place = [a.postalCode, a.city].filter(Boolean).join(" ");
  const lines = [a.street || "", place].filter(Boolean);
  if (!lines.length) return ["[Adresse ergänzen]"];
  if (a.country && a.country !== "Schweiz") lines.push(a.country);
  return lines;
}

export function hasAddress(a: { street: string | null; postalCode: string | null; city: string | null } | null): boolean {
  return Boolean(a?.street && a.postalCode && a.city);
}

/** KOVALI with legal name, legal form, address and (if registered) UID or VAT number. */
export function kovaliLines(p: Party, alias = "KOVALI"): string[] {
  const lines = [p.name];
  if (p.legalForm.startsWith("Einzelunternehmen")) lines.push(`Einzelunternehmen, Inhaber ${p.owner}`);
  else if (!p.name.includes("GmbH") && !p.name.includes("AG")) lines.push(p.legalForm);
  lines.push(...addressLines(p));
  if (p.vatNumber) lines.push(`MWST-Nr. ${p.vatNumber.replace(/\s*MWST$/i, "")}`);
  else if (p.uid) lines.push(`UID ${p.uid}`);
  if (p.commercialRegister) lines.push(`Eingetragen im ${p.commercialRegister}`);
  lines.push(`nachfolgend «${alias}»`);
  return lines;
}

export function companyLegalName(c: CompanyInfo): string {
  return c.legalName?.trim() || c.name;
}

/** Einzelfirma / Einzelunternehmen (the owner is self-employed, not employed by the firm). */
export function isSoleProprietorship(legalForm: string | null | undefined): boolean {
  return /einzel/i.test(legalForm ?? "");
}

export function companyLines(c: CompanyInfo, alias: string, opts: { legalForm?: boolean; representedBy?: string } = {}): string[] {
  const name = companyLegalName(c);
  const lines = [name];
  if (opts.legalForm && c.legalForm && !name.toLowerCase().includes(c.legalForm.toLowerCase())) lines.push(c.legalForm);
  lines.push(...addressLines(c));
  if (c.uid) lines.push(`UID ${c.uid}`);
  if (opts.representedBy) lines.push(`vertreten durch ${opts.representedBy}`);
  lines.push(`nachfolgend «${alias}»`);
  return lines;
}

export function personLines(p: PersonInfo, alias: string): string[] {
  return [personName(p), ...addressLines(p), `nachfolgend «${alias}»`];
}

export function partiesBlock(parties: { role: string; lines: string[] }[]): Block {
  return { type: "parties", parties };
}

export function titleBlock(text: string, subtitle?: string): Block {
  return { type: "title", text, subtitle };
}

// --- Signatures -----------------------------------------------------------------

export interface Signer {
  name?: string;
  role?: string;
}

/** Capacity in which the signatory acts for KOVALI: the owner of a sole proprietorship, else the title (e.g. Geschäftsführer of the GmbH). */
export function kovaliSignatoryRole(p: Party): string {
  return p.legalForm.startsWith("Einzelunternehmen") && p.signatory.name === p.owner ? "Inhaber" : p.signatory.title;
}

export function kovaliSigners(p: Party): Signer[] {
  return [{ name: p.signatory.name, role: kovaliSignatoryRole(p) }];
}

/** Signers of a company: the selected contact, optionally a second blank line (Kollektivunterschrift). */
export function companySigners(contact: ContactInfo | null, second: boolean): Signer[] {
  const first: Signer = contact ? { name: contact.name, role: contact.role ?? undefined } : {};
  return second ? [first, {}] : [first];
}

export function signatures(parties: { party: string; signers: Signer[] }[]): Block[] {
  return [{ type: "spacer", size: "sm" }, { type: "signatures", parties }];
}

// --- Shared clauses ---------------------------------------------------------------

/** VAT clause that is correct whether or not KOVALI is registered for VAT. */
export function vatClause(p: Party, payer: string): string {
  const status = p.vatNumber
    ? `KOVALI ist im Register der mehrwertsteuerpflichtigen Personen eingetragen (${p.vatNumber}).`
    : `Im Zeitpunkt des Vertragsabschlusses ist KOVALI nicht im Register der mehrwertsteuerpflichtigen Personen eingetragen und stellt keine Mehrwertsteuer in Rechnung. Tritt die Steuerpflicht später ein, gilt die Mehrwertsteuer ab deren Beginn als zusätzlich geschuldet; KOVALI teilt dies ${payer} vorgängig schriftlich mit.`;
  return `Alle Vergütungen verstehen sich exklusive Mehrwertsteuer. Soweit KOVALI mehrwertsteuerpflichtig ist, stellt sie die Mehrwertsteuer zum jeweils geltenden Satz zusätzlich in Rechnung und weist sie separat aus. ${status}`;
}

export const expenseOptions = [
  { value: "ausserhalb", label: "Nur Reisen ausserhalb des Einsatzorts nach Aufwand" },
  { value: "inklusive", label: "Im Satz enthalten" },
  { value: "effektiv", label: "Nach Aufwand gegen Beleg" },
] as const;

export function expensesClause(mode: unknown, approver: string): string {
  switch (mode) {
    case "inklusive":
      return "Spesen, insbesondere Reise-, Verpflegungs- und Übernachtungskosten, sind mit der Vergütung abgegolten.";
    case "effektiv":
      return `Notwendige Spesen werden nach effektivem Aufwand gegen Beleg vergütet, sofern ${approver} sie vorgängig genehmigt hat. Reisezeit gilt nicht als Arbeitszeit, sofern nichts anderes vereinbart ist.`;
    default:
      return `Spesen für den Arbeitsweg zum vereinbarten Einsatzort sind mit der Vergütung abgegolten. Reisen, die ${approver} ausserhalb des vereinbarten Einsatzorts verlangt, werden nach effektivem Aufwand gegen Beleg vergütet.`;
  }
}

/** Mandatory right to end an Auftrag at any time (Art. 404 OR); no exit fees or minimum terms. */
export function art404Clause(subject: string): string {
  return `Das zwingende Recht jeder Partei, ${subject} nach Art. 404 Abs. 1 OR jederzeit zu beenden, bleibt vorbehalten. Erfolgt die Beendigung zur Unzeit, ersetzt die beendende Partei der anderen den daraus entstehenden Schaden (Art. 404 Abs. 2 OR).`;
}

export function importantReasonClause(subject: string): string {
  return `Jede Partei kann ${subject} aus wichtigem Grund jederzeit fristlos schriftlich kündigen. Ein wichtiger Grund liegt insbesondere vor, wenn die andere Partei eine wesentliche Vertragspflicht verletzt und die Verletzung trotz schriftlicher Mahnung nicht innert zehn Tagen behebt oder wenn über sie der Konkurs eröffnet oder ihr eine Nachlassstundung gewährt wird.`;
}

export function confidentialityExceptions(): string {
  return "Die Geheimhaltungspflicht gilt nicht für Informationen, welche die empfangende Partei nachweislich (a) bei der Offenlegung bereits rechtmässig kannte, (b) die allgemein bekannt sind oder ohne Verletzung dieses Vertrags allgemein bekannt werden, (c) von einer berechtigten Drittperson ohne Geheimhaltungspflicht erhalten hat oder (d) aufgrund einer gesetzlichen Pflicht oder einer behördlichen oder gerichtlichen Anordnung offenlegen muss. Im Fall von (d) informiert sie die andere Partei, soweit zulässig, vorgängig und beschränkt die Offenlegung auf das Notwendige.";
}

export function statutorySecrecyClause(): string {
  return "Weitergehende gesetzliche Geheimhaltungspflichten, insbesondere die Treuepflicht nach Art. 398 Abs. 2 OR und der Schutz von Fabrikations- und Geschäftsgeheimnissen nach Art. 162 StGB, bleiben vorbehalten.";
}

/**
 * Konventionalstrafe for a breach, e.g. penaltyClause("Verletzt die Auftraggeberin diese
 * Pflicht", "schuldet sie KOVALI", 20000). Paying it does not release from the obligation.
 */
export function penaltyClause(breach: string, debtor: string, amount: number): string {
  return `${breach}, ${debtor} für jeden Fall der Verletzung eine Konventionalstrafe von ${formatChf(amount)}. Die Konventionalstrafe ist auch geschuldet, wenn kein Schaden entstanden ist. Ihre Bezahlung befreit nicht von der weiteren Einhaltung der Pflicht. Die Geltendmachung eines darüber hinausgehenden Schadens bleibt vorbehalten.`;
}

/** Grammatical forms of the document noun ("dieser Vertrag" / "diese Vereinbarung"). */
export interface Noun {
  nom: string;
  gen: string;
  dat: string;
  acc: string;
}

export const VERTRAG: Noun = { nom: "dieser Vertrag", gen: "dieses Vertrags", dat: "diesem Vertrag", acc: "diesen Vertrag" };
export const VEREINBARUNG: Noun = { nom: "diese Vereinbarung", gen: "dieser Vereinbarung", dat: "dieser Vereinbarung", acc: "diese Vereinbarung" };

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function writtenFormClause(n: Noun = VERTRAG): string {
  return `Änderungen und Ergänzungen ${n.gen} bedürfen zu ihrer Gültigkeit der Schriftform und der Unterzeichnung durch beide Parteien; dies gilt auch für einen Verzicht auf die Schriftform. Der Schriftform genügen auch eine qualifizierte elektronische Signatur und der Austausch unterzeichneter und eingescannter Exemplare.`;
}

export function assignmentClause(n: Noun = VERTRAG): string {
  return `Die Übertragung ${n.gen} oder einzelner Rechte und Pflichten daraus auf Dritte bedarf der vorgängigen schriftlichen Zustimmung der anderen Partei. KOVALI darf ${n.acc} ohne Zustimmung auf eine Gesellschaft übertragen, die ihre Geschäftstätigkeit übernimmt und von derselben Person beherrscht wird, namentlich bei der Umwandlung des Einzelunternehmens in eine Gesellschaft mit beschränkter Haftung; KOVALI teilt die Übertragung der anderen Partei schriftlich mit.`;
}

export function severabilityClause(n: Noun = VERTRAG): string {
  return `Sollte eine Bestimmung ${n.gen} ganz oder teilweise unwirksam oder undurchführbar sein oder werden, berührt dies die Gültigkeit der übrigen Bestimmungen nicht. Die Parteien ersetzen die betroffene Bestimmung durch eine wirksame Regelung, die ihrem wirtschaftlichen Zweck möglichst nahekommt. Dasselbe gilt für Lücken.`;
}

export function lawClause(n: Noun = VERTRAG): string {
  return `${cap(n.nom)} untersteht schweizerischem Recht unter Ausschluss der Bestimmungen des internationalen Privatrechts.`;
}

export function jurisdictionClause(p: Party, n: Noun = VERTRAG): string {
  return `Ausschliesslicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit ${n.dat} ist ${p.city}, Sitz von KOVALI. Vorbehalten bleiben zwingende gesetzliche Gerichtsstände.`;
}

export function copiesClause(n: Noun = VERTRAG): string {
  return `${cap(n.nom)} wird in zwei Exemplaren ausgefertigt. Jede Partei erhält ein unterzeichnetes Exemplar.`;
}

/** The last section; `first` comes before the standard clauses (e.g. order of precedence). */
export function finalClauses(c: Clauses, p: Party, opts: { noun?: Noun; first?: string[]; assignment?: boolean } = {}): void {
  const n = opts.noun ?? VERTRAG;
  c.section("Schlussbestimmungen");
  c.clauses(
    ...(opts.first ?? []),
    `${cap(n.nom)} ersetzt alle früheren mündlichen und schriftlichen Abreden der Parteien über ${n === VERTRAG ? "seinen" : "ihren"} Gegenstand.`,
    writtenFormClause(n),
    opts.assignment === false ? null : assignmentClause(n),
    severabilityClause(n),
    lawClause(n),
    jurisdictionClause(p, n),
    copiesClause(n),
  );
}

/** Free text from a textarea: one clause per paragraph (blank line). */
export function paragraphs(text: unknown): string[] {
  return str(text)
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Lines of a textarea as list items ("- " or "• " prefixes are removed). */
export function lines(text: unknown): string[] {
  return str(text)
    .split(/\n/)
    .map((s) => s.replace(/^\s*[-–•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Several lines become one sentence ("a; b; c."), prose stays as it is. */
export function asSentence(text: unknown): string {
  const list = lines(text);
  if (list.length <= 1) return paragraphs(text).join(" ");
  return `${list.map((l) => l.replace(/[.;,]$/, "")).join("; ")}.`;
}

/** Joins a list in German: "a, b und c". */
export function joinAnd(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} und ${list[list.length - 1]}`;
}

// --- Checks -----------------------------------------------------------------------

/** Gaps in the counterparty's master data that would show up in the document. */
export function companyIssues(c: CompanyInfo | null, role: string): string[] {
  if (!c) return [`Keine Firma als ${role} gewählt.`];
  const out: string[] = [];
  if (!c.legalName) out.push(`Bei der Firma «${c.name}» fehlt der rechtliche Name; im Vertrag steht der Kurzname.`);
  if (!hasAddress(c)) out.push(`Die Adresse der Firma «${c.name}» ist unvollständig.`);
  return out;
}

export function personIssues(p: PersonInfo | null, role: string, needsAddress: boolean): string[] {
  if (!p) return [`Keine Person als ${role} gewählt.`];
  return needsAddress && !hasAddress(p) ? [`Die Adresse von ${personName(p)} (${p.ref}) ist unvollständig.`] : [];
}
