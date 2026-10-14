import { site, vatClause } from "@/config/site";
import { formatChf, formatNumber } from "@/lib/utils";
import type { FaqItem } from "./types";

/**
 * Prices: copy for /preise and the price teasers on other pages (spec 4.4).
 *
 * Every number comes from `site.offer` in src/config/site.ts, so changing the range or a
 * condition is a one-line edit there. Only the hourly range is shown while unconfirmed;
 * every other condition (day rate, payment term, free first call, cost cap) appears only
 * once its `confirmed` is true. Prices are never shown on /fachleute, never next to the
 * years of experience and never in the Organization JSON-LD (spec 4.1).
 */

const { hourly, hoursPerDay, paymentDays, costCap, firstCall, exampleRate } = site.offer;
const { min, max } = hourly.value;

/** True once a VAT number is confirmed; then every price line reads "zuzüglich 8,1 % MWST". */
const vatRegistered = Boolean(site.legal.vatNumber.confirmed && site.legal.vatNumber.value);
/** "allfällige MWST" or, once registered, "8,1 % MWST" (rate taken from `vatClause()`). */
const vatNoun = vatRegistered ? vatClause().replace(/^zuzüglich /, "") : "allfällige MWST";
/** ", auf Wunsch mit Kostendach" once the cost cap is confirmed, otherwise empty. */
const costCapClause = costCap.confirmed && costCap.value ? ", auf Wunsch mit Kostendach" : "";

/** "80 %" with a no-break space, so the sign never wraps onto its own line. */
const percent = (share: number) => `${formatNumber(Math.round(share * 100))} %`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "CHF 100 bis 190 pro Stunde" */
export const hourlyRange = `${formatChf(min)} bis ${formatNumber(max)} pro Stunde`;

/** Price lines for other pages; inline links use [Label](/pfad) for RichText. */
export const priceTeasers = {
  /** Home, IT Consulting block (spec 3.1 block 3). */
  home: `Richtwerte: ${hourlyRange}, ${vatClause()}. [Preise im Detail](/preise)`,
  /** Under the buttons in every discipline hero (spec 3.3). */
  discipline: `Richtwerte: ${hourlyRange}, ${vatClause()}. [So setzt sich der Satz zusammen](/preise)`,
  /** /leistungen, section "Preise und Zusammenarbeit" (spec 3.2 section 5). */
  overview: {
    title: `Richtwerte: ${hourlyRange}`,
    text: `${capitalize(vatClause())}. Wo ein Mandat in dieser Spanne liegt, hängt von Rolle, Dauer, Pensum und Umfeld ab. Verbindlich ist der Satz in der Offerte.`,
  },
};

/**
 * Shared FAQ entry, first question on each discipline page (spec 4.4).
 * `serviceLabel`: "Business Analysis", "Testmanagement", "Test Engineering" or "Application Management".
 */
export function priceFaq(serviceLabel: string): FaqItem {
  return {
    question: `Was kostet ${serviceLabel} bei KOVALI?`,
    answer: `Die Richtwerte liegen bei ${hourlyRange}, ${vatClause()}. Wo ein Mandat in dieser Spanne liegt, hängt von Rolle, Dauer, Pensum und Umfeld ab. Den verbindlichen Satz nennt die Offerte. Details und ein Rechenbeispiel finden Sie unter [Preise](/preise).`,
  };
}

/* ---------- Worked budget example, computed from the config (spec 4.4) ---------- */

const months = 6;
const workdaysPerMonth = 21;
const workload = 0.8;

const workdays = months * workdaysPerMonth;
const exactDays = workdays * workload;
const effectiveDays = Math.floor(exactDays);
const hours = effectiveDays * hoursPerDay.value;
const total = hours * exampleRate;
const exactPerMonth = total / months;
const perMonth = Math.round(exactPerMonth / 10) * 10;
const roughly = (exact: boolean) => (exact ? "" : "rund ");

export interface ExampleRow {
  step: string;
  calculation: string;
  result: string;
  /** The fee itself, emphasised in the table. */
  total?: boolean;
}

export interface PriceFactor {
  factor: string;
  low: string;
  high: string;
}

export const pricing = {
  meta: {
    title: "Preise – Stundensätze für IT Consulting",
    description: `Richtwerte: ${hourlyRange} für Business Analysis, Requirements Engineering, Testmanagement und Application Management, mit Rechenbeispiel.`,
  },

  hero: {
    title: "Preise für IT Consulting",
    lead: `Die Richtwerte liegen bei ${hourlyRange}, ${vatClause()}. Wo ein Mandat in dieser Spanne liegt, hängt von Rolle, Dauer, Pensum und Umfeld ab. Verbindlich ist der Satz in der Offerte.`,
    primary: { label: "Offerte anfragen", href: "/kontakt" },
  },

  /** Beside the range statement (RateRange) on /preise. */
  range: {
    note: "Richtwerte für Unternehmen und öffentliche Organisationen, in Schweizer Franken.",
    exampleLink: { label: "Rechenbeispiel ansehen", href: "#rechenbeispiel" },
  },

  /** The track labels of RateRange repeat the two ends of this table. */
  factors: {
    title: "Wo ein Mandat in der Spanne liegt",
    caption: "Faktoren, die den Stundensatz innerhalb der Spanne bestimmen",
    head: { factor: "Faktor", low: "Eher am unteren Ende", high: "Eher am oberen Ende" },
    rows: [
      {
        factor: "Rolle",
        low: "Ausführende Aufgabe, zum Beispiel Testfälle durchführen in einem eingespielten Team",
        high: "Steuernde Aufgabe, zum Beispiel Testmanagement mit mehreren Lieferanten oder Workshops mit der Geschäftsleitung",
      },
      { factor: "Dauer und Pensum", low: "Mehrere Monate mit hohem Pensum", high: "Wenige Wochen oder tiefes Pensum" },
      {
        factor: "Umfeld",
        low: "Eine Applikation mit bekannten Abläufen",
        high: "Viele Schnittstellen und Anspruchsgruppen, regulatorische Vorgaben",
      },
      {
        factor: "Start",
        low: "Start mit einigen Wochen Vorlauf",
        high: "Start innert weniger Tage oder fester Go-live-Termin",
      },
    ] satisfies PriceFactor[],
  },

  more: {
    title: "Was sonst noch zählt",
    items: [
      {
        term: "Vertragsform",
        text: "KOVALI arbeitet direkt für Unternehmen und öffentliche Organisationen oder als Subunternehmen für Beratungen und IT-Dienstleister. Bei einem Einsatz als Subunternehmen vereinbaren wir den Satz mit dem beauftragenden Unternehmen. Was dessen Kunde bezahlt, legt dieses selbst fest.",
      },
      {
        term: "Einsatzort",
        text: "Vor Ort, remote oder hybrid in der ganzen Schweiz. Ob Reisezeit und Spesen separat verrechnet werden, steht in der Offerte.",
      },
    ],
  },

  example: {
    title: `Rechenbeispiel: Business Analysis, ${months} Monate, ${percent(workload)}`,
    intro: `So schätzen Sie das Budget für einen Einsatz selbst ab. Annahmen: Beispielsatz ${formatChf(exampleRate)} pro Stunde, ${formatNumber(hoursPerDay.value)} Stunden pro Arbeitstag.`,
    caption: `Rechenbeispiel für einen Einsatz von ${months} Monaten zu ${percent(workload)} mit einem Beispielsatz von ${formatChf(exampleRate)} pro Stunde`,
    head: { step: "Schritt", calculation: "Rechnung", result: "Ergebnis" },
    rows: [
      {
        step: `Arbeitstage in ${months} Monaten`,
        calculation: `${months} × rund ${workdaysPerMonth} Tage, ohne Wochenenden und Feiertage`,
        result: `${formatNumber(workdays)} Tage`,
      },
      {
        step: `Pensum ${percent(workload)}`,
        calculation: `${formatNumber(workdays)} Tage × ${percent(workload)}`,
        result: `${roughly(exactDays === effectiveDays)}${formatNumber(effectiveDays)} Einsatztage`,
      },
      {
        step: "Stunden",
        calculation: `${formatNumber(effectiveDays)} × ${formatNumber(hoursPerDay.value)} Stunden`,
        result: `${formatNumber(hours)} Stunden`,
      },
      {
        step: "Honorar",
        calculation: `${formatNumber(hours)} × ${formatChf(exampleRate)}`,
        result: formatChf(total),
        total: true,
      },
      {
        step: "Pro Monat im Durchschnitt",
        calculation: `${formatChf(total)} ÷ ${months}`,
        result: `${roughly(exactPerMonth === perMonth)}${formatChf(perMonth)}`,
      },
    ] satisfies ExampleRow[],
    note: `Dazu kommen ${vatNoun} und vereinbarte Spesen. Verrechnet werden die effektiv geleisteten Stunden. Ferien und andere Abwesenheiten werden nicht verrechnet, das Budget im Beispiel ist deshalb die obere Grenze bei voller Präsenz.`,
  },

  /** First and last items always; the others only once their condition is confirmed. */
  billing: {
    title: "So rechnen wir ab",
    items: [
      "Rechnung monatlich nach Stundenrapport.",
      paymentDays.confirmed ? `Zahlbar innert ${formatNumber(paymentDays.value)} Tagen.` : null,
      firstCall.confirmed && firstCall.value.free ? "Keine Grundgebühr. Das Erstgespräch ist kostenlos." : null,
      `Für ein abgegrenztes Teilmandat, etwa ein Fachkonzept oder ein Testkonzept, erhalten Sie eine Offerte mit Aufwandschätzung${costCapClause}.`,
      `Alle Beträge in Schweizer Franken, ${vatClause()}.`,
    ].filter((item): item is string => item !== null),
  },

  faqTitle: "Fragen zu den Preisen",
  faq: [
    {
      question: "Warum ist die Spanne so gross?",
      answer:
        "Weil die Einsätze sehr verschieden sind. Ein Jahresmandat mit hohem Pensum rechnet sich anders als ein Einsatz von sechs Wochen, eine ausführende Testaufgabe anders als ein Testmanagement mit mehreren Lieferanten. Ein einziger Preis würde für viele dieser Einsätze nicht passen.",
    },
    {
      // Asks only what the answer covers: the cost cap once confirmed, never fixed prices.
      question: costCap.confirmed && costCap.value ? "Gibt es Tagessätze oder ein Kostendach?" : "Gibt es Tagessätze?",
      answer: `${
        hoursPerDay.confirmed
          ? `Auf Wunsch rechnen wir mit Tagessatz ab: ${formatNumber(hoursPerDay.value)} Stunden zum vereinbarten Stundensatz.`
          : "Auf Wunsch rechnen wir mit Tagessatz ab. Er beruht auf dem vereinbarten Stundensatz."
      } Für ein klar abgegrenztes Teilmandat erhalten Sie eine Offerte mit Aufwandschätzung${costCapClause}.`,
    },
    {
      question: "Ist die Mehrwertsteuer inbegriffen?",
      answer: vatRegistered
        ? `Nein. Alle Preise verstehen sich ${vatClause()}. Die Mehrwertsteuer steht zum gültigen Satz auf der Rechnung.`
        : `Nein. Alle Preise verstehen sich ${vatClause()}. Fällt Mehrwertsteuer an, steht sie zum gültigen Satz auf der Rechnung.`,
    },
    {
      question: "Gelten die Preise auch, wenn KOVALI über eine Beratung arbeitet?",
      answer:
        "Dann vereinbaren wir den Satz mit der Beratung oder dem IT-Dienstleister. Der Vertrag mit dem Endkunden und dessen Preis liegen bei diesem Unternehmen.",
    },
    {
      question: "Wann erhalte ich einen verbindlichen Preis?",
      answer:
        "Mit der Offerte nach dem Erstgespräch. Sie nennt Aufgabe, Stundensatz, Pensum, Laufzeit und Spesenregelung.",
    },
  ] satisfies FaqItem[],

  cta: {
    title: "Sie möchten wissen, was Ihr Einsatz kostet?",
    text: "Beschreiben Sie Aufgabe, Zeitraum und Pensum. Sie erhalten eine Offerte mit verbindlichem Stundensatz.",
    primary: { label: "Offerte anfragen", href: "/kontakt" },
  },
};
