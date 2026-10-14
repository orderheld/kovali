import { z } from "zod";
import { formatLongDate } from "../../format";
import { f } from "../../forms";
import { defineTemplate } from "../define";
import { field, reqInt } from "../fields";
import {
  bool,
  Clauses,
  companyIssues,
  companyLegalName,
  companyLines,
  companySigners,
  confidentialityExceptions,
  countWord,
  finalClauses,
  kovaliLines,
  kovaliSigners,
  num,
  paragraphs,
  partiesBlock,
  penaltyClause,
  personIssues,
  personLines,
  personName,
  signatures,
  statutorySecrecyClause,
  str,
  titleBlock,
  VEREINBARUNG,
} from "../text";
import type { ContractContext } from "../types";

/**
 * Geheimhaltungsvereinbarung, mutual or one-sided, with a company or a natural person.
 * Optional Konventionalstrafe; statutory secrecy duties remain reserved.
 */

const modes = [
  { value: "gegenseitig", label: "Gegenseitig" },
  { value: "einseitig_kovali", label: "Einseitig: KOVALI legt offen" },
  { value: "einseitig_partner", label: "Einseitig: Gegenpartei legt offen" },
] as const;

const schema = z.object({
  mode: f.enum(["gegenseitig", "einseitig_kovali", "einseitig_partner"] as const),
  purpose: f.text(1000, "Bitte den Zweck angeben."),
  durationYears: reqInt(1, 10),
  penaltyAmount: f.optAmount(1_000_000),
  specialTerms: f.optText(5000),
  secondSignatory: f.checkbox(),
});

const defaults = {
  mode: "gegenseitig",
  purpose: "der Prüfung und Anbahnung einer Zusammenarbeit im Bereich IT- und Beratungsdienstleistungen",
  durationYears: 3,
  penaltyAmount: 10000,
  specialTerms: null,
  secondSignatory: false,
};

function counterparty(ctx: ContractContext): { name: string; lines: string[] } {
  if (ctx.company) return { name: companyLegalName(ctx.company), lines: companyLines(ctx.company, "Gegenpartei") };
  if (ctx.candidate) return { name: personName(ctx.candidate), lines: personLines(ctx.candidate, "Gegenpartei") };
  return { name: "Gegenpartei", lines: ["[Gegenpartei ergänzen]"] };
}

export const nda = defineTemplate({
  id: "nda",
  name: "Geheimhaltungsvereinbarung",
  docType: "Geheimhaltungsvereinbarung",
  description: "NDA vor Gesprächen mit Auftraggebern, Partnern oder Fachpersonen: gegenseitig oder einseitig, mit Dauer und optionaler Konventionalstrafe.",
  counterparty: "KOVALI ↔ Firma oder Person",
  links: { company: "optional", contact: "optional", candidate: "optional", mandate: "optional", parent: "hidden" },
  oneOf: [["company", "candidate"]],
  companyKinds: [],
  labels: { company: "Gegenpartei (Firma)", contact: "Unterzeichnende Person der Firma", candidate: "Gegenpartei (Person)", mandate: "Mandat" },
  hints: { candidate: "Nur wenn die Vereinbarung mit einer Person und nicht mit einer Firma geschlossen wird." },
  dates: { validFrom: "Gültig ab (optional)", validUntil: null },
  defaults,
  schema,
  sections: [
    {
      title: "Art und Zweck",
      columns: 1,
      fields: [
        { kind: "select", name: "mode", label: "Art", options: modes },
        {
          kind: "textarea",
          name: "purpose",
          label: "Zweck",
          rows: 2,
          required: true,
          hint: "Ergänzt den Satz «… im Zusammenhang mit …», z. B. «der Prüfung einer Zusammenarbeit im Projekt X».",
        },
      ],
    },
    {
      title: "Dauer und Konventionalstrafe",
      fields: [
        { kind: "int", name: "durationYears", label: "Dauer nach Ende der Gespräche", min: 1, max: 10, suffix: "Jahre", required: true },
        { kind: "amount", name: "penaltyAmount", label: "Konventionalstrafe (CHF)", hint: "Leer: keine Konventionalstrafe." },
      ],
    },
    { title: "Weiteres", fields: [field.secondSignatory, field.specialTerms] },
  ],
  counterpartyName: (ctx) => counterparty(ctx).name,
  issues: (_d, ctx) => (ctx.company ? companyIssues(ctx.company, "Gegenpartei") : personIssues(ctx.candidate, "Gegenpartei", true)),
  build(d, ctx) {
    const k = ctx.kovali;
    const other = counterparty(ctx);
    const mutual = d.mode === "gegenseitig";
    const penalty = num(d.penaltyAmount);
    const years = num(d.durationYears) ?? 3;
    const c = new Clauses();

    c.section("Zweck");
    c.clauses(
      `Die Parteien beabsichtigen, im Zusammenhang mit ${str(d.purpose)} (nachfolgend «Zweck») Informationen auszutauschen.`,
      mutual
        ? "Beide Parteien können dabei vertrauliche Informationen offenlegen. Jede Partei ist für die Informationen, welche sie von der anderen erhält, empfangende Partei und für ihre eigenen Informationen offenlegende Partei."
        : d.mode === "einseitig_kovali"
          ? "Dabei legt KOVALI der Gegenpartei vertrauliche Informationen offen. KOVALI ist offenlegende Partei, die Gegenpartei empfangende Partei."
          : "Dabei legt die Gegenpartei KOVALI vertrauliche Informationen offen. Die Gegenpartei ist offenlegende Partei, KOVALI empfangende Partei.",
      "Diese Vereinbarung verpflichtet keine Partei, Informationen offenzulegen oder einen weiteren Vertrag abzuschliessen.",
    );

    c.section("Vertrauliche Informationen");
    c.clauses(
      "Vertrauliche Informationen sind alle Informationen, gleich in welcher Form, welche die offenlegende Partei der empfangenden Partei im Zusammenhang mit dem Zweck zugänglich macht und die weder offenkundig noch allgemein zugänglich sind, namentlich Geschäfts-, Kunden-, Projekt- und Preisinformationen, technische Informationen, Unterlagen und Know-how sowie Personendaten, etwa Profile von Fachpersonen.",
      "Informationen gelten als vertraulich, unabhängig davon, ob sie als vertraulich bezeichnet sind, sofern ihre Vertraulichkeit nach den Umständen erkennbar ist. Vertraulich ist auch der Umstand, dass die Parteien Gespräche führen.",
    );

    c.section("Pflichten der empfangenden Partei");
    c.clauses(
      "Die empfangende Partei hält vertrauliche Informationen geheim und verwendet sie ausschliesslich für den Zweck.",
      "Sie schützt vertrauliche Informationen mindestens mit der Sorgfalt, die sie für eigene vertrauliche Informationen anwendet, jedenfalls aber mit angemessener Sorgfalt.",
      "Sie macht vertrauliche Informationen nur Organen, Mitarbeitenden, Subunternehmen und Beratenden zugänglich, die diese für den Zweck benötigen und einer mindestens gleichwertigen Geheimhaltungspflicht unterstehen. Sie steht für deren Einhaltung ein.",
      "Kopien und Auszüge erstellt sie nur, soweit dies für den Zweck erforderlich ist.",
    );

    c.section("Ausnahmen");
    c.clauses(confidentialityExceptions().replace("dieses Vertrags", "dieser Vereinbarung"), "Das Vorliegen einer Ausnahme hat die empfangende Partei nachzuweisen.");

    c.section("Dauer");
    c.clauses(
      `Diese Vereinbarung tritt mit der Unterzeichnung durch beide Parteien in Kraft${ctx.validFrom ? `, frühestens am ${formatLongDate(ctx.validFrom)}` : ""}. Sie gilt auch für vertrauliche Informationen, die im Zusammenhang mit dem Zweck vor ihrer Unterzeichnung offengelegt wurden.`,
      `Die Pflichten aus dieser Vereinbarung gelten während der Gespräche und einer allfälligen Zusammenarbeit und während ${countWord(years, "Jahr", "Jahren")} nach deren Ende. Für Geschäftsgeheimnisse und Personendaten gelten sie unbefristet.`,
    );

    c.section("Rückgabe und Löschung");
    c.clauses(
      "Auf Verlangen der offenlegenden Partei, spätestens aber am Ende der Gespräche oder der Zusammenarbeit, gibt die empfangende Partei vertrauliche Informationen zurück oder vernichtet bzw. löscht sie und bestätigt dies auf Verlangen schriftlich.",
      "Ausgenommen sind Kopien, die aufgrund gesetzlicher Aufbewahrungspflichten aufbewahrt werden müssen, und Daten in automatischen Sicherungskopien, die nicht mit vertretbarem Aufwand gelöscht werden können. Für sie gelten die Pflichten aus dieser Vereinbarung weiter.",
    );

    c.section("Keine Rechtseinräumung");
    c.clauses(
      "Durch diese Vereinbarung werden keine Rechte an vertraulichen Informationen, insbesondere keine Immaterialgüter- oder Nutzungsrechte, übertragen oder eingeräumt.",
      "Vertrauliche Informationen werden ohne Gewähr für Richtigkeit und Vollständigkeit offengelegt, soweit die Parteien nichts anderes vereinbaren.",
    );

    c.section("Datenschutz");
    c.clauses(
      "Enthalten vertrauliche Informationen Personendaten, bearbeitet die empfangende Partei diese nach dem Bundesgesetz über den Datenschutz (DSG) und ausschliesslich für den Zweck. Profile von Fachpersonen werden nur mit deren Einwilligung offengelegt.",
    );

    c.section(penalty !== null ? "Konventionalstrafe und weitere Ansprüche" : "Weitere Ansprüche");
    c.clauses(
      penalty !== null
        ? penaltyClause(
            mutual ? "Verletzt eine Partei diese Vereinbarung" : "Verletzt die empfangende Partei diese Vereinbarung",
            mutual ? "schuldet sie der anderen Partei" : "schuldet sie der offenlegenden Partei",
            penalty,
          )
        : null,
      "Die verletzte Partei kann zudem die Unterlassung der Verletzung verlangen, auch auf dem Weg vorsorglicher Massnahmen.",
      statutorySecrecyClause(),
    );

    const special = paragraphs(d.specialTerms);
    if (special.length) {
      c.section("Besondere Vereinbarungen");
      c.clauses(...special);
    }

    finalClauses(c, k, { noun: VEREINBARUNG, assignment: false });

    return [
      titleBlock("Geheimhaltungsvereinbarung", mutual ? "Gegenseitige Vereinbarung über die Vertraulichkeit von Informationen" : "Vereinbarung über die Vertraulichkeit von Informationen"),
      partiesBlock([
        { role: mutual ? "Partei" : d.mode === "einseitig_kovali" ? "Offenlegende Partei" : "Empfangende Partei", lines: kovaliLines(k) },
        { role: mutual ? "Partei" : d.mode === "einseitig_kovali" ? "Empfangende Partei" : "Offenlegende Partei", lines: other.lines },
      ]),
      ...c.blocks,
      ...signatures([
        { party: k.name, signers: kovaliSigners(k) },
        {
          party: other.name,
          signers: ctx.company ? companySigners(ctx.contact, bool(d.secondSignatory)) : [{ name: ctx.candidate ? personName(ctx.candidate) : undefined }],
        },
      ]),
    ];
  },
});
