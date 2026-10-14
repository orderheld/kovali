import { z } from "zod";
import { formatChf, formatLongDate, formatNumber } from "../../format";
import { f } from "../../forms";
import { labelOf, remoteOptions } from "../../options";
import { defineTemplate } from "../define";
import { expenseValues, field, links, rateUnitValues, remoteValues, reqAmount, reqInt } from "../fields";
import {
  asSentence,
  bool,
  Clauses,
  companyIssues,
  companyLegalName,
  companyLines,
  companySigners,
  copiesClause,
  dateOrMissing,
  expenseOptions,
  expensesClause,
  HOURS_PER_DAY_TEXT,
  kovaliLines,
  kovaliSigners,
  MISSING,
  num,
  paragraphs,
  partiesBlock,
  personName,
  rateText,
  signatures,
  str,
  titleBlock,
} from "../text";

/**
 * Einzelauftrag: one assignment under a Rahmenvertrag (parentId). The client company comes
 * from the Rahmenvertrag; the deployed specialist is a linked candidate or KOVALI itself.
 */

const schema = z.object({
  role: f.text(160, "Bitte die Rolle angeben."),
  project: f.optText(200),
  endClient: f.optText(200),
  clientContact: f.optText(200),
  description: f.text(5000, "Bitte die Leistungen beschreiben."),
  deliverables: f.optText(3000),
  workload: f.optInt(5, 100),
  location: f.optText(200),
  remote: f.optEnum(remoteValues),
  extension: f.optText(300),
  rateAmount: reqAmount(100_000),
  rateUnit: f.enum(rateUnitValues),
  volume: f.optInt(1, 100_000),
  costCeiling: f.optAmount(),
  expenses: f.enum(["rahmen", ...expenseValues] as const),
  noticeDays: reqInt(0, 180),
  specialTerms: f.optText(5000),
  secondSignatory: f.checkbox(),
});

const defaults = {
  role: "",
  project: null,
  endClient: null,
  clientContact: null,
  description: "",
  deliverables: null,
  workload: 100,
  location: null,
  remote: "hybrid",
  extension: null,
  rateAmount: null,
  rateUnit: "stunde",
  volume: null,
  costCeiling: null,
  expenses: "rahmen",
  noticeDays: 30,
  specialTerms: null,
  secondSignatory: false,
};

const remoteSentence: Record<string, string> = {
  vor_ort: "Die Leistungen werden grundsätzlich vor Ort erbracht.",
  hybrid: "Die Leistungen werden teilweise vor Ort und teilweise remote erbracht; die Aufteilung richtet sich nach den Bedürfnissen des Vorhabens.",
  remote: "Die Leistungen werden grundsätzlich remote erbracht.",
};

export const einzelauftrag = defineTemplate({
  id: "einzelauftrag",
  name: "Einzelauftrag",
  docType: "Einzelauftrag",
  description: "Abruf unter einem Rahmenvertrag: Rolle, Fachperson, Zeitraum, Pensum, Ort, Satz und Volumen für einen konkreten Einsatz.",
  counterparty: "KOVALI ↔ Auftraggeberin aus dem Rahmenvertrag",
  links: links({ parent: "required", contact: "optional", candidate: "optional", mandate: "optional" }),
  oneOf: [],
  companyKinds: [],
  labels: {
    parent: "Rahmenvertrag",
    contact: "Unterzeichnende Person der Auftraggeberin",
    candidate: "Eingesetzte Fachperson",
    mandate: "Mandat",
  },
  hints: {
    parent: "Die Auftraggeberin wird aus dem Rahmenvertrag übernommen.",
    candidate: "Leer: KOVALI erbringt die Leistungen selbst.",
  },
  dates: { validFrom: "Beginn", validUntil: "Ende" },
  defaults,
  schema,
  sections: [
    {
      title: "Vorhaben und Leistungen",
      fields: [
        { kind: "text", name: "role", label: "Rolle", required: true, placeholder: "z. B. SAP FI Consultant" },
        { kind: "text", name: "project", label: "Vorhaben / Projekt" },
        { kind: "text", name: "endClient", label: "Endkundin", hint: "Falls der Einsatz bei einer Kundin der Auftraggeberin erfolgt." },
        { kind: "text", name: "clientContact", label: "Ansprechperson im Projekt", hint: "Für die projektbezogene Abstimmung." },
        { kind: "textarea", name: "description", label: "Leistungsbeschreibung", required: true, rows: 5, wide: true, hint: "Eine Aufgabe pro Zeile oder als Fliesstext." },
        { kind: "textarea", name: "deliverables", label: "Arbeitsergebnisse (optional)", rows: 3, wide: true },
      ],
    },
    {
      title: "Pensum und Ort",
      columns: 3,
      fields: [field.workload, field.location, field.remote, { kind: "text", name: "extension", label: "Verlängerungsoption", placeholder: "z. B. Option um 6 Monate", wide: true }],
    },
    {
      title: "Vergütung",
      columns: 3,
      fields: [
        field.rateAmount,
        field.rateUnit,
        { kind: "int", name: "volume", label: "Erwartetes Volumen", min: 1, max: 100_000, suffix: "Std./Tage", hint: "In der Einheit des Satzes; unverbindlich." },
        { kind: "amount", name: "costCeiling", label: "Kostendach (CHF, optional)" },
        { kind: "select", name: "expenses", label: "Spesen", options: [{ value: "rahmen", label: "Gemäss Rahmenvertrag" }, ...expenseOptions] },
      ],
    },
    {
      title: "Beendigung und Besonderes",
      fields: [field.noticeDays, field.secondSignatory, field.specialTerms],
    },
  ],
  prefill: (p) => {
    const m = p.mandate;
    const rate = p.submission?.rateSell ?? m?.rateSell ?? null;
    return {
      ...(m
        ? {
            role: m.title,
            endClient: m.endClient,
            description: m.description,
            workload: m.workload,
            location: m.location,
            remote: m.remote,
          }
        : {}),
      ...(rate !== null ? { rateAmount: rate, rateUnit: p.submission?.rateUnit ?? m?.rateUnit ?? "stunde" } : {}),
    };
  },
  counterpartyName: (ctx) => (ctx.company ? companyLegalName(ctx.company) : "Auftraggeberin"),
  issues: (_d, ctx) => [
    ...(ctx.parent && !ctx.parent.signedAt ? [`Der Rahmenvertrag ${ctx.parent.number} ist noch nicht als unterzeichnet erfasst.`] : []),
    ...companyIssues(ctx.company, "Auftraggeberin"),
    ...(ctx.validFrom ? [] : ["Der Beginn des Einsatzes fehlt."]),
    ...(ctx.contact ? [] : ["Keine unterzeichnende Person der Auftraggeberin gewählt."]),
  ],
  build(d, ctx) {
    const k = ctx.kovali;
    const client = ctx.company;
    const parent = ctx.parent;
    const parentRef = parent ? `${parent.number}${parent.signedAt ? ` vom ${formatLongDate(parent.signedAt)}` : ""}` : MISSING;
    const rate = num(d.rateAmount);
    const volume = num(d.volume);
    const ceiling = num(d.costCeiling);
    const unitWord = d.rateUnit === "tag" ? "Tage" : "Stunden";
    const specialist = ctx.candidate ? personName(ctx.candidate) : `${k.signatory.name} (KOVALI)`;
    const c = new Clauses();

    c.section("Eckdaten");
    c.facts([
      { label: "Vorhaben", value: str(d.project) },
      { label: "Rolle", value: str(d.role) || MISSING },
      { label: "Endkundin", value: str(d.endClient) },
      { label: "Eingesetzte Fachperson", value: specialist },
      { label: "Beginn", value: dateOrMissing(ctx.validFrom) },
      { label: "Ende", value: ctx.validUntil ? formatLongDate(ctx.validUntil) : "unbestimmt" },
      { label: "Pensum", value: num(d.workload) !== null ? `${num(d.workload)} %` : "" },
      { label: "Einsatzort", value: str(d.location) },
      { label: "Arbeitsform", value: d.remote && d.remote !== "offen" ? labelOf(remoteOptions, String(d.remote)) : "" },
      { label: "Ansprechperson im Projekt", value: str(d.clientContact) },
      { label: "Vergütung", value: `${rateText(rate, d.rateUnit)}, exkl. MWST` },
      { label: "Erwartetes Volumen", value: volume !== null ? `rund ${formatNumber(volume, 0)} ${unitWord}` : "" },
      { label: "Kostendach", value: ceiling !== null ? formatChf(ceiling) : "" },
    ]);

    c.section("Leistungen");
    c.clauses(
      `KOVALI erbringt als ${str(d.role) || MISSING}${str(d.project) ? ` im Vorhaben ${str(d.project)}` : ""} insbesondere die folgenden Leistungen: ${asSentence(d.description) || MISSING}`,
      str(d.deliverables) ? `Als Arbeitsergebnisse sind vorgesehen: ${asSentence(d.deliverables)}` : null,
      ctx.candidate
        ? `Die Leistungen erbringt ${specialist} als Fachperson eines selbständigen Subunternehmens von KOVALI. Projektbezogene Absprachen erfolgen mit der Ansprechperson der Auftraggeberin; ein Weisungsrecht, wie es einer Arbeitgeberin zusteht, besteht nicht (Ziffer 2 Rahmenvertrag).`
        : `Die Leistungen erbringt KOVALI selbst durch ${k.signatory.name}. Projektbezogene Absprachen erfolgen mit der Ansprechperson der Auftraggeberin; ein Weisungsrecht, wie es einer Arbeitgeberin zusteht, besteht nicht (Ziffer 2 Rahmenvertrag).`,
    );

    c.section("Dauer, Pensum und Einsatzort");
    const workload = num(d.workload);
    c.clauses(
      ctx.validUntil
        ? `Der Einzelauftrag beginnt am ${dateOrMissing(ctx.validFrom)} und endet am ${formatLongDate(ctx.validUntil)}, ohne dass es einer Kündigung bedarf. Eine Verlängerung vereinbaren die Parteien schriftlich${str(d.extension) ? `; vorgesehen ist: ${str(d.extension)}` : ""}.`
        : `Der Einzelauftrag beginnt am ${dateOrMissing(ctx.validFrom)} und gilt auf unbestimmte Zeit.`,
      workload !== null
        ? `Das Pensum beträgt rund ${workload} % einer Vollzeittätigkeit von 42 Stunden pro Woche. Die Fachperson teilt die Arbeitszeit in Abstimmung mit den Bedürfnissen des Vorhabens selbst ein.`
        : null,
      [str(d.location) ? `Einsatzort ist ${str(d.location)}.` : "", remoteSentence[String(d.remote)] ?? ""].filter(Boolean).join(" ") || null,
    );

    c.section("Vergütung");
    c.clauses(
      `Die Vergütung beträgt ${rateText(rate, d.rateUnit)} exklusive Mehrwertsteuer und wird nach dem effektiven, in freigegebenen Zeitrapporten ausgewiesenen Aufwand abgerechnet.${d.rateUnit === "tag" ? ` Ein Tag umfasst ${HOURS_PER_DAY_TEXT} Arbeitsstunden.` : ""}`,
      volume !== null
        ? `Das erwartete Volumen beträgt rund ${formatNumber(volume, 0)} ${unitWord}${rate !== null ? `, entsprechend rund ${formatChf(rate * volume, { round: true })}` : ""}. Diese Angabe dient der Planung; sie verpflichtet keine Partei zur Abnahme oder Erbringung eines Mindestvolumens.`
        : null,
      ceiling !== null
        ? `Die Vergütung ist auf ein Kostendach von ${formatChf(ceiling)} begrenzt. KOVALI informiert die Auftraggeberin rechtzeitig, wenn absehbar ist, dass das Kostendach erreicht wird. Leistungen darüber hinaus erbringt KOVALI nur nach schriftlicher Freigabe.`
        : null,
      d.expenses === "rahmen" ? "Für Spesen gilt Ziffer 5.5 des Rahmenvertrags." : expensesClause(d.expenses, "die Auftraggeberin"),
      "Rechnungsstellung, Zahlungsfrist und Mehrwertsteuer richten sich nach dem Rahmenvertrag.",
    );

    c.section("Beendigung");
    c.clauses(
      `Jede Partei kann diesen Einzelauftrag vor Ablauf schriftlich mit einer Frist von ${num(d.noticeDays) ?? 30} Tagen kündigen.`,
      "Im Übrigen gelten die Bestimmungen des Rahmenvertrags über die Beendigung, insbesondere zur Kündigung aus wichtigem Grund und zum Vorbehalt von Art. 404 OR (Ziffer 11 Rahmenvertrag).",
    );

    const special = paragraphs(d.specialTerms);
    if (special.length) {
      c.section("Besondere Bedingungen");
      c.clauses(...special);
    }

    c.section("Rangfolge und Ausfertigung");
    c.clauses(
      "Bei Widersprüchen geht dieser Einzelauftrag dem Rahmenvertrag vor, soweit er ausdrücklich von diesem abweicht. Im Übrigen gilt der Rahmenvertrag.",
      copiesClause(),
    );

    return [
      titleBlock("Einzelauftrag", `zum Rahmenvertrag ${parentRef}`),
      partiesBlock([
        { role: "Auftragnehmerin", lines: kovaliLines(k) },
        { role: "Auftraggeberin", lines: client ? companyLines(client, "Auftraggeberin") : ["[Auftraggeberin ergänzen]"] },
      ]),
      {
        type: "paragraph",
        text: `Gestützt auf den Rahmenvertrag über IT- und Beratungsdienstleistungen ${parentRef} (nachfolgend «Rahmenvertrag») vereinbaren die Parteien den folgenden Einzelauftrag. Soweit dieser Einzelauftrag nichts anderes regelt, gelten die Bestimmungen des Rahmenvertrags.`,
      },
      ...c.blocks,
      ...signatures([
        { party: k.name, signers: kovaliSigners(k) },
        { party: client ? companyLegalName(client) : "Auftraggeberin", signers: companySigners(ctx.contact, bool(d.secondSignatory)) },
      ]),
    ];
  },
});
