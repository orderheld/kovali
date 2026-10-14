import { z } from "zod";
import { formatLongDate } from "../../format";
import { f } from "../../forms";
import { labelOf, profileVariants } from "../../options";
import { defineTemplate } from "../define";
import { reqInt } from "../fields";
import {
  bool,
  Clauses,
  companyLegalName,
  count,
  joinAnd,
  kovaliLines,
  lines,
  MISSING,
  num,
  partiesBlock,
  personIssues,
  personLines,
  personName,
  signatures,
  str,
  titleBlock,
} from "../text";
import type { ContractContext } from "../types";

/**
 * Einwilligung zur Weitergabe des Profils: one consent per submission, signed by the
 * candidate. Names the recipient firm and the mandate, the data passed on, purpose,
 * retention, revocation and the right of access (Art. 25 DSG). Same promise as the website:
 * only with consent, only for a specific mandate in which KOVALI itself is the contractor.
 */

const schema = z.object({
  mandateText: f.optText(300),
  recipients: f.optText(1000),
  endClient: f.optText(200),
  variant: f.enum(["anonym", "namentlich"] as const),
  incCertificates: f.checkbox(),
  retentionMonths: reqInt(1, 36),
  abroadCountries: f.optText(300),
  consentForm: f.enum(["unterschrift", "elektronisch"] as const),
});

const defaults = {
  mandateText: null,
  recipients: null,
  endClient: null,
  variant: "anonym",
  incCertificates: false,
  retentionMonths: 24,
  abroadCountries: null,
  consentForm: "unterschrift",
};

function mandateLabel(ctx: ContractContext, text: string): string {
  if (ctx.mandate) return `${ctx.mandate.title} (${ctx.mandate.ref}${ctx.mandate.reference ? `, Referenz ${ctx.mandate.reference}` : ""})`;
  return text || MISSING;
}

function recipientLabel(ctx: ContractContext): string | null {
  const c = ctx.company;
  if (!c) return null;
  return [companyLegalName(c), c.city].filter(Boolean).join(", ");
}

export const einwilligung = defineTemplate({
  id: "einwilligung",
  name: "Einwilligung Profilweitergabe",
  docType: "Einwilligung",
  description: "Einwilligung der Fachperson, ihr Profil für ein bestimmtes Mandat an eine bestimmte Firma weiterzugeben, mit Widerrufs- und Auskunftsrecht.",
  counterparty: "Unterzeichnet von der Fachperson",
  links: { company: "optional", contact: "hidden", candidate: "required", mandate: "optional", parent: "hidden" },
  oneOf: [],
  companyKinds: [],
  labels: { candidate: "Fachperson", mandate: "Mandat", company: "Empfängerin (Firma)" },
  hints: {
    mandate: "Eine Einwilligung pro Mandat und Empfängerin.",
    company: "Firma, die das Profil erhält. Mit Mandat dessen Auftraggeberin.",
  },
  dates: { validFrom: null, validUntil: null },
  defaults,
  schema,
  sections: [
    {
      title: "Mandat und Empfängerinnen",
      fields: [
        { kind: "text", name: "mandateText", label: "Mandat (falls nicht verknüpft)", placeholder: "z. B. SAP FI Consultant, Grossbank Zürich" },
        { kind: "text", name: "endClient", label: "Endkundin (falls bekannt)", hint: "Wird als weitere Empfängerin genannt." },
        { kind: "textarea", name: "recipients", label: "Weitere Empfängerinnen", rows: 2, wide: true, hint: "Eine pro Zeile, mit Ort. Leer lassen, wenn nur die gewählte Firma das Profil erhält." },
      ],
    },
    {
      title: "Weitergegebene Daten",
      fields: [
        { kind: "select", name: "variant", label: "Profilvariante", options: profileVariants },
        { kind: "checkbox", name: "incCertificates", label: "Kopien von Zeugnissen, Diplomen und Zertifikaten" },
      ],
    },
    {
      title: "Aufbewahrung und Form",
      fields: [
        { kind: "int", name: "retentionMonths", label: "Aufbewahrung höchstens", min: 1, max: 36, suffix: "Monate", required: true },
        { kind: "text", name: "abroadCountries", label: "Bekanntgabe ins Ausland", placeholder: "Leer: keine", hint: "Staaten, in welche die Empfängerinnen das Profil weitergeben dürfen." },
        {
          kind: "select",
          name: "consentForm",
          label: "Form der Einwilligung",
          options: [
            { value: "unterschrift", label: "Unterschrift auf diesem Formular" },
            { value: "elektronisch", label: "Bestätigung per E-Mail oder im Portal" },
          ],
        },
      ],
    },
  ],
  prefill: (p) => ({
    ...(p.mandate ? { endClient: p.mandate.endClient } : {}),
    ...(p.submission ? { variant: p.submission.profileVariant === "namentlich" ? "namentlich" : "anonym" } : {}),
  }),
  validate: (d, linked) => ({
    ...(!linked.company && !str(d.recipients) ? { d_recipients: "Bitte eine Empfängerin wählen oder hier eintragen." } : {}),
    ...(!linked.mandate && !str(d.mandateText) ? { d_mandateText: "Bitte ein Mandat wählen oder hier beschreiben." } : {}),
  }),
  counterpartyName: (ctx) => (ctx.candidate ? personName(ctx.candidate) : "Fachperson"),
  issues: (d, ctx) => [
    ...personIssues(ctx.candidate, "Fachperson", false),
    ...(!ctx.mandate && !str(d.mandateText) ? ["Kein Mandat genannt."] : []),
    ...(!ctx.company && !str(d.recipients) ? ["Keine Empfängerin genannt."] : []),
  ],
  build(d, ctx) {
    const k = ctx.kovali;
    const name = ctx.candidate ? personName(ctx.candidate) : MISSING;
    const recipients = [recipientLabel(ctx), ...lines(d.recipients)].filter((r): r is string => Boolean(r));
    const endClient = str(d.endClient);
    const months = num(d.retentionMonths) ?? 24;
    const abroad = str(d.abroadCountries);
    const electronic = d.consentForm === "elektronisch";
    const data = [
      "Ausbildung",
      "beruflicher Werdegang",
      "Projekterfahrung",
      "Kompetenzen",
      "Zertifizierungen",
      "Sprachkenntnisse",
      // The dossier always shows them (dossier.ts), so the consent always names them.
      "Verfügbarkeit",
      "mögliches Pensum",
      "bevorzugter Einsatzort",
    ];
    const named = d.variant === "namentlich";
    const c = new Clauses();

    c.section("Gegenstand");
    c.clause(
      "Die betroffene Person willigt ein, dass KOVALI ihr Profil für das nachfolgend bezeichnete Mandat an die genannten Empfängerinnen weitergibt. Die Einwilligung gilt nur für dieses Mandat und diese Empfängerinnen.",
    );
    c.facts([
      { label: "Mandat", value: mandateLabel(ctx, str(d.mandateText)) },
      { label: recipients.length > 1 ? "Empfängerinnen" : "Empfängerin", value: recipients.length ? recipients.join("; ") : MISSING },
      { label: "Endkundin", value: endClient },
      { label: "Profilvariante", value: labelOf(profileVariants, String(d.variant)) },
    ]);
    c.clause(
      "KOVALI ist in diesem Mandat selbst Auftragnehmerin der Empfängerin. Kommt ein Einsatz zustande, wird er über einen Vertrag zwischen KOVALI und der Firma abgewickelt, über welche die betroffene Person tätig ist. KOVALI vermittelt keine Stellen an Dritte.",
    );

    c.section("Weitergegebene Daten");
    c.clauses(
      `Weitergegeben wird das Profil der betroffenen Person mit Angaben zu ${joinAnd(data)}${bool(d.incCertificates) ? " sowie Kopien von Arbeitszeugnissen, Diplomen und Zertifikaten" : ""}.`,
      named
        ? "Das Profil wird mit Vor- und Nachnamen und Wohnort der betroffenen Person sowie dem Namen der Firma weitergegeben, über welche sie tätig ist."
        : "Das Profil wird anonymisiert weitergegeben, ohne Namen, ohne den Namen der Firma, über welche die betroffene Person tätig ist, und ohne Angaben, die einen direkten Rückschluss auf die betroffene Person erlauben. Den Namen gibt KOVALI erst bekannt, wenn die betroffene Person dem im Einzelfall zustimmt.",
      `Nicht weitergegeben werden ${named ? "Strasse und Hausnummer" : "Adresse"}, E-Mail-Adresse, Telefonnummer, Geburtsdatum, Nationalität und Arbeitsbewilligung; die Kontaktaufnahme erfolgt über KOVALI. Besonders schützenswerte Personendaten, etwa Angaben zur Gesundheit, zur Religion oder zu Strafverfahren, gibt KOVALI nicht weiter und entfernt sie aus den Unterlagen.`,
    );

    c.section("Zweck und Verwendung durch die Empfängerinnen");
    c.clauses(
      "Die Empfängerinnen dürfen das Profil ausschliesslich verwenden, um die Eignung der betroffenen Person für das bezeichnete Mandat zu prüfen und einen Einsatz zu vereinbaren und abzuwickeln. Für andere Mandate oder Zwecke ist eine neue Einwilligung erforderlich.",
      "KOVALI verpflichtet die Empfängerinnen, das Profil vertraulich zu behandeln, nicht ohne Einwilligung der betroffenen Person an Dritte weiterzugeben und zu löschen, sobald die betroffene Person nicht berücksichtigt wird oder das Mandat abgeschlossen ist.",
      abroad
        ? `Die Empfängerinnen dürfen das Profil für das Mandat in folgende Staaten bekannt geben: ${abroad}. Die betroffene Person willigt ausdrücklich auch in diese Bekanntgabe ein; gewährleistet ein Staat keinen angemessenen Datenschutz, stützt sich die Bekanntgabe auf diese Einwilligung (Art. 17 Abs. 1 lit. a DSG).`
        : "Eine Bekanntgabe ins Ausland ist nicht vorgesehen.",
    );

    c.section("Aufbewahrung");
    c.clause(
      `KOVALI bewahrt die für dieses Mandat zusammengestellten Unterlagen bis zum Widerruf dieser Einwilligung auf, längstens aber ${count(months, "Monat", "Monate")} nach ihrer Erteilung. Danach werden sie gelöscht oder anonymisiert. ${electronic ? "Die Bestätigung dieser Einwilligung" : "Das unterzeichnete Formular"} bewahrt KOVALI nur als Nachweis der Einwilligung auf, bis allfällige Ansprüche aus der Weitergabe verjährt sind, längstens 10 Jahre. Kommt ein Einsatz zustande, gelten für die Vertrags- und Buchhaltungsunterlagen dieses Einsatzes die gesetzlichen Aufbewahrungspflichten.`,
    );

    c.section("Freiwilligkeit und Widerruf");
    c.clauses(
      "Die Einwilligung ist freiwillig. Wird sie nicht erteilt, gibt KOVALI das Profil für dieses Mandat nicht weiter; weitere Nachteile entstehen der betroffenen Person daraus nicht.",
      `Die betroffene Person kann die Einwilligung jederzeit ohne Angabe von Gründen mit Wirkung für die Zukunft widerrufen, formlos per E-Mail an ${k.email}. Der Widerruf berührt die Rechtmässigkeit der bis dahin erfolgten Bearbeitung nicht. Ist das Profil bereits weitergegeben, teilt KOVALI den Widerruf den Empfängerinnen mit und verlangt die Löschung.`,
    );

    c.section("Rechte der betroffenen Person");
    c.clauses(
      "Die betroffene Person kann von KOVALI jederzeit Auskunft darüber verlangen, ob und welche Personendaten über sie bearbeitet werden, zu welchem Zweck, wie lange sie aufbewahrt und wem sie bekannt gegeben werden (Art. 25 DSG). Die Auskunft ist in der Regel kostenlos und wird innert 30 Tagen erteilt.",
      "Sie kann zudem die Berichtigung unrichtiger Personendaten und, soweit keine Aufbewahrungspflicht besteht, deren Löschung verlangen und sich an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden.",
      `Verantwortlich für die Bearbeitung und Ansprechstelle für den Datenschutz ist ${k.name}, ${k.street}, ${k.postalCode} ${k.city}, E-Mail ${k.email}. Weitere Informationen enthält die Datenschutzerklärung von KOVALI.`,
    );

    c.section("Erteilung der Einwilligung");
    c.clause(
      electronic
        ? `Die betroffene Person erteilt die Einwilligung durch ausdrückliche Bestätigung per E-Mail oder im Kandidatenportal von KOVALI unter Angabe der Nummer ${ctx.number}. KOVALI dokumentiert Datum und Form der Bestätigung.`
        : "Die betroffene Person erteilt die Einwilligung durch Unterzeichnung dieses Formulars. Sie bestätigt, dass sie die vorstehenden Informationen gelesen hat.",
    );
    if (electronic) {
      c.facts([
        { label: "Bestätigt am", value: ctx.signedAt ? formatLongDate(ctx.signedAt) : "______________________" },
        { label: "Form der Bestätigung", value: "E-Mail / Kandidatenportal (Zutreffendes vermerken)" },
      ]);
    }

    return [
      titleBlock("Einwilligung zur Weitergabe des Profils", "nach dem Bundesgesetz über den Datenschutz (DSG)"),
      partiesBlock([
        { role: "Verantwortliche", lines: kovaliLines(k).toSpliced(-1, 0, `E-Mail ${k.email}`) },
        { role: "Betroffene Person", lines: ctx.candidate ? personLines(ctx.candidate, "betroffene Person") : [MISSING] },
      ]),
      ...c.blocks,
      ...(electronic ? [] : signatures([{ party: "Betroffene Person", signers: [{ name }] }])),
    ];
  },
});
