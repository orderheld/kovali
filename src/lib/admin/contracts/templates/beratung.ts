import { z } from "zod";
import { formatChf, formatLongDate } from "../../format";
import { f } from "../../forms";
import { defineTemplate } from "../define";
import { expenseValues, field, links, reqAmount, reqInt } from "../fields";
import {
  art404Clause,
  asSentence,
  bool,
  Clauses,
  companyIssues,
  companyLegalName,
  companyLines,
  companySigners,
  confidentialityExceptions,
  expensesClause,
  finalClauses,
  HOURS_PER_DAY_TEXT,
  importantReasonClause,
  kovaliLines,
  kovaliSignatoryRole,
  kovaliSigners,
  MISSING,
  num,
  paragraphs,
  partiesBlock,
  rateText,
  signatures,
  statutorySecrecyClause,
  str,
  titleBlock,
  vatClause,
} from "../text";

/**
 * Beratungsvertrag: KOVALI's own consulting for a client (Auftrag, Art. 394 ff. OR), carried
 * out by the signatory from kovaliParty(). Hourly, daily or fixed fee.
 */

const feeModels = [
  { value: "stunde", label: "Stundenhonorar" },
  { value: "tag", label: "Tageshonorar" },
  { value: "pauschal", label: "Pauschalhonorar" },
] as const;

const schema = z.object({
  scope: f.text(5000, "Bitte den Gegenstand der Beratung beschreiben."),
  deliverables: f.optText(3000),
  location: f.optText(300),
  feeModel: f.enum(["stunde", "tag", "pauschal"] as const),
  feeAmount: reqAmount(1_000_000),
  estimate: f.optText(200),
  costCeiling: f.optAmount(),
  paymentPlan: f.optText(500),
  paymentDays: reqInt(5, 120),
  expenses: f.enum(expenseValues),
  liabilityCapAmount: f.optAmount(),
  noticeDays: reqInt(0, 180),
  specialTerms: f.optText(5000),
  secondSignatory: f.checkbox(),
});

const defaults = {
  scope: "",
  deliverables: null,
  location: "bei der Auftraggeberin, bei KOVALI oder remote, nach Absprache",
  feeModel: "stunde",
  feeAmount: null,
  estimate: null,
  costCeiling: null,
  paymentPlan: null,
  paymentDays: 30,
  expenses: "ausserhalb",
  liabilityCapAmount: null,
  noticeDays: 30,
  specialTerms: null,
  secondSignatory: false,
};

export const beratung = defineTemplate({
  id: "beratung",
  name: "Beratungsvertrag",
  docType: "Beratungsvertrag",
  description: "Beratung durch KOVALI selbst für eine Kundin: Gegenstand, Honorar nach Aufwand oder pauschal, Spesen, Haftung und Beendigung.",
  counterparty: "KOVALI ↔ Auftraggeberin (Firma)",
  links: links({ company: "required", contact: "optional", mandate: "optional" }),
  oneOf: [],
  companyKinds: ["auftraggeber", "endkunde", "partner"],
  labels: { company: "Auftraggeberin", contact: "Unterzeichnende Person der Auftraggeberin", mandate: "Mandat" },
  hints: {},
  dates: { validFrom: "Beginn", validUntil: "Ende (optional)" },
  defaults,
  schema,
  sections: [
    {
      title: "Gegenstand",
      columns: 1,
      fields: [
        { kind: "textarea", name: "scope", label: "Gegenstand der Beratung", required: true, rows: 5, hint: "Eine Aufgabe pro Zeile oder als Fliesstext." },
        { kind: "textarea", name: "deliverables", label: "Arbeitsergebnisse (optional)", rows: 3 },
        { kind: "text", name: "location", label: "Ort der Beratung" },
      ],
    },
    {
      title: "Honorar",
      columns: 3,
      fields: [
        { kind: "select", name: "feeModel", label: "Honorarmodell", options: feeModels },
        { kind: "amount", name: "feeAmount", label: "Honorar (CHF, exkl. MWST)", required: true, hint: "Satz pro Stunde oder Tag, oder Pauschale." },
        { kind: "text", name: "estimate", label: "Geschätzter Aufwand", placeholder: "z. B. rund 10 Tage" },
        { kind: "amount", name: "costCeiling", label: "Kostendach (CHF, optional)" },
        { kind: "text", name: "paymentPlan", label: "Zahlungsplan (Pauschale)", placeholder: "z. B. 50 % bei Beginn, 50 % bei Abschluss" },
        field.paymentDays,
        field.expenses,
      ],
    },
    {
      title: "Haftung, Beendigung, Weiteres",
      fields: [
        { ...field.liabilityCapAmount, hint: "Leer: Honorar aus diesem Vertrag der letzten zwölf Monate." },
        field.noticeDays,
        field.secondSignatory,
        field.specialTerms,
      ],
    },
  ],
  prefill: (p) => (p.mandate ? { scope: p.mandate.description ?? p.mandate.title } : {}),
  counterpartyName: (ctx) => (ctx.company ? companyLegalName(ctx.company) : "Auftraggeberin"),
  issues: (_d, ctx) => [...companyIssues(ctx.company, "Auftraggeberin"), ...(ctx.contact ? [] : ["Keine unterzeichnende Person der Auftraggeberin gewählt."])],
  build(d, ctx) {
    const k = ctx.kovali;
    const client = ctx.company;
    const fixed = d.feeModel === "pauschal";
    const fee = num(d.feeAmount);
    const ceiling = num(d.costCeiling);
    const cap = num(d.liabilityCapAmount);
    const c = new Clauses();

    c.section("Gegenstand");
    c.clauses(
      `Die Auftraggeberin beauftragt KOVALI mit folgender Beratung (nachfolgend «Beratung»): ${asSentence(d.scope) || MISSING}`,
      str(d.deliverables) ? `Als Arbeitsergebnisse sind vorgesehen: ${asSentence(d.deliverables)}` : null,
      "Die Parteien vereinbaren einen Auftrag im Sinne von Art. 394 ff. des Obligationenrechts (OR). KOVALI schuldet eine sorgfältige Beratung, nicht einen bestimmten Erfolg.",
    );

    c.section("Leistungserbringung");
    c.clauses(
      `KOVALI erbringt die Beratung durch ${k.signatory.name}, ${kovaliSignatoryRole(k)}. Sie ist berechtigt, in Absprache mit der Auftraggeberin weitere Fachpersonen oder selbständige Subunternehmen beizuziehen, und bleibt für die Beratung verantwortlich.`,
      "KOVALI erbringt die Beratung selbständig, mit eigener Organisation und eigenen Arbeitsmitteln. Die Auftraggeberin kann Vorgaben zu Gegenstand und Ziel der Beratung machen (Art. 397 OR); ein Weisungsrecht, wie es einer Arbeitgeberin zusteht, besteht nicht. KOVALI wird nicht in die Betriebsorganisation der Auftraggeberin eingegliedert.",
      str(d.location) ? `Die Beratung erfolgt ${str(d.location)}.` : null,
      "Die Auftraggeberin stellt die nötigen Informationen, Unterlagen, Zugänge und Ansprechpersonen rechtzeitig zur Verfügung. Verzögerungen und Mehraufwand infolge fehlender Mitwirkung gehen nicht zulasten von KOVALI.",
    );

    c.section("Honorar und Zahlung");
    c.clauses(
      fixed
        ? `Das Pauschalhonorar für die Beratung beträgt ${fee !== null ? formatChf(fee) : MISSING} exklusive Mehrwertsteuer. Leistungen ausserhalb des vereinbarten Gegenstands werden nur nach vorgängiger schriftlicher Vereinbarung erbracht und gesondert vergütet.`
        : `Das Honorar beträgt ${rateText(fee, d.feeModel)} exklusive Mehrwertsteuer und wird nach dem effektiven Aufwand abgerechnet.${d.feeModel === "tag" ? ` Ein Tag umfasst ${HOURS_PER_DAY_TEXT} Arbeitsstunden; angebrochene Tage werden anteilsmässig abgerechnet.` : ""}`,
      str(d.estimate) ? `Der Aufwand wird auf ${str(d.estimate)} geschätzt. Die Schätzung dient der Planung und ist nicht verbindlich.` : null,
      ceiling !== null && !fixed
        ? `Das Honorar ist auf ein Kostendach von ${formatChf(ceiling)} begrenzt. KOVALI informiert die Auftraggeberin rechtzeitig, wenn absehbar ist, dass das Kostendach erreicht wird; Leistungen darüber hinaus erbringt sie nur nach schriftlicher Freigabe.`
        : null,
      fixed
        ? str(d.paymentPlan)
          ? `Das Pauschalhonorar wird wie folgt in Rechnung gestellt: ${str(d.paymentPlan).replace(/\.$/, "")}.`
          : "Das Pauschalhonorar wird nach Abschluss der Beratung in Rechnung gestellt."
        : "KOVALI stellt das Honorar monatlich nachschüssig mit einem Leistungsnachweis in Rechnung.",
      `Rechnungen sind innert ${num(d.paymentDays) ?? 30} Tagen ab Rechnungsdatum ohne Abzug zahlbar. Nach Ablauf der Zahlungsfrist gerät die Auftraggeberin ohne Mahnung in Verzug und schuldet einen Verzugszins von 5 % pro Jahr.`,
      expensesClause(d.expenses, "die Auftraggeberin"),
      vatClause(k, "der Auftraggeberin"),
    );

    c.section("Geheimhaltung");
    c.clauses(
      "Die Parteien behandeln alle Informationen vertraulich, die ihnen im Zusammenhang mit diesem Vertrag von der anderen Partei zugänglich gemacht werden und die weder offenkundig noch allgemein zugänglich sind. Sie verwenden diese ausschliesslich zur Erfüllung dieses Vertrags.",
      confidentialityExceptions(),
      "Die Geheimhaltungspflicht gilt während der Dauer dieses Vertrags und während fünf Jahren nach dessen Beendigung; für Geschäftsgeheimnisse und Personendaten gilt sie unbefristet.",
      statutorySecrecyClause(),
      "Die Nennung der Auftraggeberin als Referenz bedarf ihrer vorgängigen Zustimmung.",
    );

    c.section("Datenschutz");
    c.clauses(
      "Die Parteien beachten das Bundesgesetz über den Datenschutz (DSG). Jede Partei ist für ihre eigenen Bearbeitungen von Personendaten selbst verantwortlich.",
      "Bearbeitet KOVALI bei der Beratung Personendaten, für welche die Auftraggeberin verantwortlich ist, tut sie dies ausschliesslich zur Erfüllung dieses Vertrags und nach den Vorgaben der Auftraggeberin. Ist dafür eine besondere Vereinbarung erforderlich, schliessen die Parteien sie gesondert ab.",
      "KOVALI schützt Personendaten durch angemessene technische und organisatorische Massnahmen (Art. 8 DSG) und informiert die Auftraggeberin unverzüglich über Verletzungen der Datensicherheit, die deren Daten betreffen.",
    );

    c.section("Rechte an Arbeitsergebnissen");
    c.clauses(
      "Die Rechte an den Arbeitsergebnissen, die KOVALI eigens für die Auftraggeberin erstellt, gehen mit der vollständigen Bezahlung des dafür geschuldeten Honorars auf die Auftraggeberin über. Soweit ein Übergang nicht möglich ist, räumt KOVALI der Auftraggeberin ein ausschliessliches, übertragbares sowie zeitlich und örtlich unbeschränktes Nutzungsrecht ein.",
      "Vorbestehende Rechte, Methoden, Vorlagen, Werkzeuge und das allgemeine Fachwissen von KOVALI bleiben bei KOVALI. Soweit sie in Arbeitsergebnisse einfliessen, erhält die Auftraggeberin daran ein nicht ausschliessliches, unbefristetes und unentgeltliches Nutzungsrecht im erforderlichen Umfang.",
    );

    c.section("Haftung");
    c.clauses(
      "Die Parteien haften einander für Schäden aus der Verletzung dieses Vertrags nach den gesetzlichen Bestimmungen, soweit nachfolgend nichts anderes geregelt ist.",
      `Die Haftung für leichte Fahrlässigkeit ist ${
        cap !== null ? `auf ${formatChf(cap)} beschränkt` : "auf den Betrag des Honorars beschränkt, das die Auftraggeberin aus diesem Vertrag in den zwölf Monaten vor dem schädigenden Ereignis bezahlt hat"
      }. Für leichte Fahrlässigkeit ist die Haftung für mittelbare Schäden und Folgeschäden, insbesondere für entgangenen Gewinn, ausgeschlossen.`,
      "Für Hilfspersonen und beigezogene Subunternehmen haftet KOVALI nach Art. 101 OR. Die Beschränkungen nach Ziffer 7.2 gelten gestützt auf Art. 101 Abs. 2 OR und im Rahmen von Art. 101 Abs. 3 OR auch für deren Verhalten.",
      "Die Beschränkungen gelten nicht für absichtlich oder grobfahrlässig verursachte Schäden (Art. 100 Abs. 1 OR), nicht für Personenschäden und nicht, soweit das Gesetz eine Beschränkung sonst ausschliesst.",
    );

    c.section("Dauer und Beendigung");
    c.clauses(
      `Dieser Vertrag tritt mit der Unterzeichnung durch beide Parteien in Kraft. ${
        ctx.validFrom ? `Die Beratung beginnt am ${formatLongDate(ctx.validFrom)}` : "Die Beratung beginnt nach Absprache"
      }${ctx.validUntil ? ` und endet am ${formatLongDate(ctx.validUntil)}, ohne dass es einer Kündigung bedarf` : " und endet mit ihrem Abschluss"}.`,
      `Jede Partei kann diesen Vertrag schriftlich mit einer Frist von ${num(d.noticeDays) ?? 30} Tagen kündigen. Bis zur Beendigung erbrachte Leistungen werden vergütet${fixed ? ", bei einem Pauschalhonorar anteilsmässig" : ""}.`,
      importantReasonClause("diesen Vertrag"),
      art404Clause("diesen Vertrag"),
      "Bei Beendigung gibt jede Partei der anderen deren Unterlagen und Daten zurück oder löscht sie, soweit keine gesetzliche Aufbewahrungspflicht besteht. Die Ziffern 4 bis 7 gelten über das Vertragsende hinaus, soweit sie ihrer Natur nach fortwirken.",
    );

    const special = paragraphs(d.specialTerms);
    if (special.length) {
      c.section("Besondere Vereinbarungen");
      c.clauses(...special);
    }

    finalClauses(c, k);

    return [
      titleBlock("Beratungsvertrag", "Auftrag nach Art. 394 ff. OR"),
      partiesBlock([
        { role: "Auftragnehmerin", lines: kovaliLines(k) },
        { role: "Auftraggeberin", lines: client ? companyLines(client, "Auftraggeberin") : ["[Auftraggeberin ergänzen]"] },
      ]),
      ...c.blocks,
      ...signatures([
        { party: k.name, signers: kovaliSigners(k) },
        { party: client ? companyLegalName(client) : "Auftraggeberin", signers: companySigners(ctx.contact, bool(d.secondSignatory)) },
      ]),
    ];
  },
});
