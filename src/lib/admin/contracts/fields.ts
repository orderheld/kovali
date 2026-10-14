import { f } from "../forms";
import { rateUnits, remoteOptions } from "../options";
import { expenseOptions } from "./text";
import type { FieldDef, LinkKey, LinkMode } from "./types";

/**
 * Zod helpers and field definitions several templates share. Field names are the keys in
 * contracts.data; the form posts them as `d_<name>`.
 */

/** Required whole number (the form shows the default, the builder never sees null). */
export const reqInt = (min: number, max: number) => f.optInt(min, max).refine((v) => v !== null, "Bitte ausfüllen.");
/** Required amount in CHF. */
export const reqAmount = (max = 10_000_000) => f.optAmount(max).refine((v) => v !== null, "Bitte einen Betrag eingeben.");

export const field = {
  secondSignatory: {
    kind: "checkbox",
    name: "secondSignatory",
    label: "Zweite Unterschrift der Gegenpartei vorsehen",
    hint: "Für Firmen mit Kollektivunterschrift zu zweien.",
  },
  specialTerms: {
    kind: "textarea",
    name: "specialTerms",
    label: "Besondere Vereinbarungen",
    hint: "Erscheinen als eigene Ziffer vor den Schlussbestimmungen. Absätze mit einer Leerzeile trennen.",
    rows: 4,
    wide: true,
  },
  paymentDays: { kind: "int", name: "paymentDays", label: "Zahlungsfrist", min: 5, max: 120, suffix: "Tage", required: true },
  noticeDays: { kind: "int", name: "noticeDays", label: "Kündigungsfrist", min: 0, max: 180, suffix: "Tage", required: true },
  expenses: { kind: "select", name: "expenses", label: "Spesen", options: expenseOptions },
  workload: { kind: "int", name: "workload", label: "Pensum", min: 5, max: 100, suffix: "%" },
  location: { kind: "text", name: "location", label: "Einsatzort", placeholder: "z. B. Zürich" },
  remote: { kind: "select", name: "remote", label: "Arbeitsform", options: remoteOptions },
  rateAmount: { kind: "amount", name: "rateAmount", label: "Satz (CHF, exkl. MWST)", required: true },
  rateUnit: { kind: "select", name: "rateUnit", label: "Einheit", options: rateUnits },
  liabilityCapAmount: {
    kind: "amount",
    name: "liabilityCapAmount",
    label: "Haftungshöchstbetrag (CHF)",
    hint: "Leer: Vergütung des betroffenen Auftrags der letzten zwölf Monate.",
  },
} satisfies Record<string, FieldDef>;

export const remoteValues = ["vor_ort", "hybrid", "remote", "offen"] as const;
export const rateUnitValues = ["stunde", "tag"] as const;
export const expenseValues = ["ausserhalb", "inklusive", "effektiv"] as const;

export function links(partial: Partial<Record<LinkKey, LinkMode>>): Record<LinkKey, LinkMode> {
  return { company: "hidden", contact: "hidden", candidate: "hidden", mandate: "hidden", parent: "hidden", ...partial };
}
