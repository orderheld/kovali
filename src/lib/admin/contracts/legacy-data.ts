import { formatChf, formatNumber } from "../format";
import { labelOf, rateUnits, remoteOptions, type Option } from "../options";

/**
 * Entries of contracts that the former version generated from its templates (contracts.data).
 * The contract text was rendered on request and is not stored, so the contract page shows
 * these entries until the signed file is filed. Known keys get the German label of the former
 * forms and appear in the order of those forms; empty values are left out; unknown keys follow
 * as stored.
 */

type Format = "text" | "chf" | "percent" | "number" | "days" | "months" | "years" | "yesno" | readonly Option[];

const expenses: readonly Option[] = [
  { value: "rahmen", label: "Gemäss Rahmenvertrag" },
  { value: "ausserhalb", label: "Nur Reisen ausserhalb des Einsatzorts nach Aufwand" },
  { value: "inklusive", label: "Im Satz enthalten" },
  { value: "effektiv", label: "Nach Aufwand gegen Beleg" },
];

const fields: readonly (readonly [key: string, label: string, format: Format])[] = [
  ["role", "Rolle", "text"],
  ["clientName", "Kundin von KOVALI", "text"],
  ["project", "Vorhaben / Projekt", "text"],
  ["endClient", "Endkunde", "text"],
  ["clientContact", "Ansprechperson im Projekt", "text"],
  ["scope", "Gegenstand der Beratung", "text"],
  ["serviceAreas", "Leistungsbereiche", "text"],
  [
    "mode",
    "Art der Geheimhaltung",
    [
      { value: "gegenseitig", label: "Gegenseitig" },
      { value: "einseitig_kovali", label: "Einseitig: KOVALI legt offen" },
      { value: "einseitig_partner", label: "Einseitig: Gegenpartei legt offen" },
    ],
  ],
  ["purpose", "Zweck", "text"],
  ["description", "Leistungsbeschreibung", "text"],
  ["deliverables", "Arbeitsergebnisse", "text"],
  ["workload", "Pensum", "percent"],
  ["location", "Einsatzort", "text"],
  ["remote", "Arbeitsform", remoteOptions],
  ["extension", "Verlängerungsoption", "text"],
  ["rateAmount", "Satz (exkl. MWST)", "chf"],
  ["rateUnit", "Einheit", rateUnits],
  [
    "feeModel",
    "Honorarmodell",
    [
      { value: "stunde", label: "Stundenhonorar" },
      { value: "tag", label: "Tageshonorar" },
      { value: "pauschal", label: "Pauschalhonorar" },
    ],
  ],
  ["feeAmount", "Honorar (exkl. MWST)", "chf"],
  ["estimate", "Geschätzter Aufwand", "text"],
  ["volume", "Erwartetes Volumen", "number"],
  ["costCeiling", "Kostendach", "chf"],
  ["paymentPlan", "Zahlungsplan", "text"],
  ["paymentDays", "Zahlungsfrist", "days"],
  ["approvalDays", "Frist für die Freigabe der Zeitrapporte", "days"],
  ["expenses", "Spesen", expenses],
  ["nonSolicitMonths", "Abwerbeverbot", "months"],
  ["penaltyAmount", "Konventionalstrafe", "chf"],
  ["includeHiring", "Konventionalstrafe auch bei Anstellung", "yesno"],
  ["liabilityCapAmount", "Haftungshöchstbetrag", "chf"],
  ["insuranceAmount", "Verlangte Deckung Berufshaftpflicht", "chf"],
  ["noticeDays", "Kündigungsfrist", "days"],
  ["noticeMonths", "Kündigungsfrist (auf Monatsende)", "months"],
  ["durationYears", "Dauer nach Ende der Gespräche", "years"],
  ["mandateText", "Vakanz", "text"],
  ["recipients", "Weitere Empfänger", "text"],
  [
    "variant",
    "Profilvariante",
    [
      { value: "anonym", label: "Anonymisiert" },
      { value: "namentlich", label: "Mit Namen" },
    ],
  ],
  ["incCertificates", "Mit Zeugnissen, Diplomen und Zertifikaten", "yesno"],
  ["retentionMonths", "Aufbewahrung höchstens", "months"],
  ["abroadCountries", "Bekanntgabe ins Ausland", "text"],
  [
    "consentForm",
    "Form der Einwilligung",
    [
      { value: "unterschrift", label: "Unterschrift auf dem Formular" },
      { value: "elektronisch", label: "Bestätigung per E-Mail oder im Portal" },
    ],
  ],
  ["specialTerms", "Besondere Vereinbarungen", "text"],
  ["secondSignatory", "Zweite Unterschrift der Gegenpartei", "yesno"],
];

const count = (n: number, one: string, many: string) => `${formatNumber(n, 0)} ${n === 1 ? one : many}`;

function display(value: unknown, format: Format): string {
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  const n = typeof value === "number" ? value : Number(text);
  if (typeof format !== "string") return labelOf(format, text);
  if (format === "yesno") return text === "true" ? "Ja" : text === "false" ? "Nein" : text;
  if (format === "text" || !Number.isFinite(n)) return text;
  switch (format) {
    case "chf":
      return formatChf(n);
    case "percent":
      return `${formatNumber(n)} %`;
    case "days":
      return count(n, "Tag", "Tage");
    case "months":
      return count(n, "Monat", "Monate");
    case "years":
      return count(n, "Jahr", "Jahre");
    default:
      return formatNumber(n);
  }
}

const empty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/** Label and display value of every stored entry, known keys first in the order of the former forms. */
export function legacyContractEntries(data: Record<string, unknown> | null | undefined): { key: string; label: string; value: string }[] {
  const source = data ?? {};
  const known = new Set(fields.map(([key]) => key));
  const out: { key: string; label: string; value: string }[] = [];
  for (const [key, label, format] of fields) {
    if (Object.hasOwn(source, key) && !empty(source[key])) out.push({ key, label, value: display(source[key], format) });
  }
  for (const [key, value] of Object.entries(source)) {
    if (!known.has(key) && !empty(value)) out.push({ key, label: key, value: display(value, "text") });
  }
  return out;
}
