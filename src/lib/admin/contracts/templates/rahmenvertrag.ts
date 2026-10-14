import { z } from "zod";
import { formatChf, formatLongDate } from "../../format";
import { f } from "../../forms";
import { defineTemplate } from "../define";
import { expenseValues, field, links, reqAmount, reqInt } from "../fields";
import {
  art404Clause,
  bool,
  Clauses,
  companyIssues,
  companyLegalName,
  companyLines,
  companySigners,
  confidentialityExceptions,
  countWord,
  expensesClause,
  finalClauses,
  HOURS_PER_DAY_TEXT,
  importantReasonClause,
  kovaliLines,
  kovaliSigners,
  num,
  paragraphs,
  partiesBlock,
  signatures,
  statutorySecrecyClause,
  str,
  titleBlock,
  vatClause,
  penaltyClause,
} from "../text";

/**
 * Rahmenvertrag über IT- und Beratungsdienstleistungen: KOVALI (Auftragnehmerin) with a
 * provider or direct client (Auftraggeberin). Individual assignments follow as Einzelaufträge.
 * Drafted as Auftrag (Art. 394 ff. OR), explicitly neither staff leasing nor placement.
 */

const schema = z.object({
  serviceAreas: f.text(600, "Bitte die Leistungsbereiche angeben."),
  paymentDays: reqInt(5, 120),
  approvalDays: reqInt(1, 30),
  expenses: f.enum(expenseValues),
  nonSolicitMonths: reqInt(0, 24),
  penaltyAmount: reqAmount(1_000_000),
  // No "includeHiring" any more: a penalty for hiring a presented specialist works as a
  // placement fee (Arbeitsvermittlung, AVG). Stored contracts may still carry the key; the
  // schema strips it, so they render without it.
  liabilityCapAmount: f.optAmount(),
  insuranceAmount: f.optAmount(),
  noticeMonths: reqInt(1, 12),
  specialTerms: f.optText(5000),
  secondSignatory: f.checkbox(),
});

const defaults = {
  serviceAreas: "Business Analysis, Requirements Engineering, Projektleitung, Test Management, Application Management und SAP-Beratung",
  paymentDays: 30,
  approvalDays: 5,
  expenses: "ausserhalb",
  nonSolicitMonths: 12,
  penaltyAmount: 20000,
  liabilityCapAmount: null,
  insuranceAmount: null,
  noticeMonths: 3,
  specialTerms: null,
  secondSignatory: false,
};

export const rahmenvertrag = defineTemplate({
  id: "rahmenvertrag",
  name: "Rahmenvertrag",
  docType: "Rahmenvertrag",
  description:
    "Grundvertrag mit einem IT-Dienstleister oder Direktkunden: Auftragsrecht, Vergütung, Datenschutz, Abwerbeverbot, Haftung. Einsätze folgen als Einzelaufträge.",
  counterparty: "KOVALI ↔ Auftraggeberin (Firma)",
  links: links({ company: "required", contact: "optional" }),
  oneOf: [],
  companyKinds: ["auftraggeber", "endkunde", "partner"],
  labels: { company: "Auftraggeberin", contact: "Unterzeichnende Person der Auftraggeberin" },
  hints: { company: "Firma mit rechtlichem Namen und Adresse, z. B. ein IT-Dienstleister." },
  dates: { validFrom: "Gültig ab", validUntil: "Befristet bis (optional)" },
  defaults,
  schema,
  sections: [
    {
      title: "Leistungen",
      columns: 1,
      fields: [
        {
          kind: "textarea",
          name: "serviceAreas",
          label: "Leistungsbereiche",
          rows: 2,
          required: true,
          hint: "Erscheint in Ziffer 1.1, z. B. «Business Analysis, Test Management und SAP-Beratung».",
        },
      ],
    },
    {
      title: "Vergütung und Rechnungsstellung",
      description: "Sätze, Pensum und Dauer stehen im jeweiligen Einzelauftrag.",
      columns: 3,
      fields: [
        field.paymentDays,
        { kind: "int", name: "approvalDays", label: "Frist für Freigabe der Zeitrapporte", min: 1, max: 30, suffix: "Arbeitstage", required: true },
        field.expenses,
      ],
    },
    {
      title: "Abwerbe- und Direktbeauftragungsverbot",
      description: "Keine Direktbeauftragung während der Frist, ohne Vermittlungsgebühr; eine Anstellung der Fachperson ist nicht erfasst.",
      fields: [
        { kind: "int", name: "nonSolicitMonths", label: "Dauer nach Einsatzende", min: 0, max: 24, suffix: "Monate", required: true },
        { kind: "amount", name: "penaltyAmount", label: "Konventionalstrafe (CHF)", required: true },
      ],
    },
    {
      title: "Haftung und Versicherung",
      fields: [
        field.liabilityCapAmount,
        {
          kind: "amount",
          name: "insuranceAmount",
          label: "Deckungssumme Haftpflicht von KOVALI (CHF)",
          hint: "Nur ausfüllen, wenn eine Police besteht. Leer: allgemeine Pflicht zu angemessener Versicherung.",
        },
      ],
    },
    {
      title: "Laufzeit und Weiteres",
      fields: [
        { kind: "int", name: "noticeMonths", label: "Kündigungsfrist (auf Monatsende)", min: 1, max: 12, suffix: "Monate", required: true },
        field.secondSignatory,
        field.specialTerms,
      ],
    },
  ],
  counterpartyName: (ctx) => (ctx.company ? companyLegalName(ctx.company) : "Auftraggeberin"),
  issues: (_d, ctx) => [...companyIssues(ctx.company, "Auftraggeberin"), ...(ctx.contact ? [] : ["Keine unterzeichnende Person der Auftraggeberin gewählt."])],
  build(d, ctx) {
    const k = ctx.kovali;
    const months = num(d.nonSolicitMonths) ?? 12;
    const notice = num(d.noticeMonths) ?? 3;
    const cap = num(d.liabilityCapAmount);
    const insurance = num(d.insuranceAmount);
    const client = ctx.company;
    const c = new Clauses();

    c.section("Gegenstand und Einzelaufträge");
    c.clauses(
      `Dieser Rahmenvertrag regelt die Bedingungen, zu denen KOVALI für die Auftraggeberin Dienstleistungen in den Bereichen ${str(d.serviceAreas)} erbringt (nachfolgend «Leistungen»).`,
      "Die einzelnen Leistungen vereinbaren die Parteien in schriftlichen Einzelaufträgen. Ein Einzelauftrag bezeichnet insbesondere das Vorhaben und die Rolle, die Leistungsbeschreibung, die eingesetzte Fachperson, Beginn und Dauer, Pensum, Einsatzort, Vergütung und allfällige besondere Bedingungen.",
      "Dieser Rahmenvertrag verpflichtet weder die Auftraggeberin, Einzelaufträge zu erteilen, noch KOVALI, angefragte Einzelaufträge anzunehmen. Ein Einzelauftrag kommt mit der Unterzeichnung durch beide Parteien zustande.",
      "Allgemeine Geschäfts- oder Einkaufsbedingungen der Parteien gelten nicht, auch wenn in Bestellungen, Rechnungen oder anderen Dokumenten auf sie verwiesen wird.",
    );

    c.section("Rechtsnatur der Zusammenarbeit");
    c.clauses(
      "Die Leistungen werden als Auftrag im Sinne von Art. 394 ff. des Obligationenrechts (OR) erbracht. Vereinbaren die Parteien in einem Einzelauftrag ausdrücklich ein bestimmtes Arbeitsergebnis zu einem Festpreis, gelten dafür ergänzend die Bestimmungen über den Werkvertrag (Art. 363 ff. OR).",
      "Gegenstand dieses Vertrags ist weder Personalverleih noch Arbeitsvermittlung im Sinne des Bundesgesetzes über die Arbeitsvermittlung und den Personalverleih (AVG). KOVALI überlässt der Auftraggeberin keine Arbeitnehmenden und führt keine Stellensuchenden mit ihr zum Abschluss von Arbeitsverträgen zusammen.",
      "KOVALI erbringt die Leistungen selbständig, auf eigene Rechnung und in eigener Verantwortung. Die Leistungen erbringt KOVALI selbst oder durch Fachpersonen selbständiger Subunternehmen (nachfolgend je «Fachperson»). Zwischen der Auftraggeberin und den Fachpersonen entsteht kein Vertragsverhältnis, insbesondere kein Arbeitsverhältnis.",
      "Die Auftraggeberin hat gegenüber den Fachpersonen kein Weisungsrecht, wie es einer Arbeitgeberin zusteht. Sie kann im Rahmen von Art. 397 OR Vorgaben zum Gegenstand und zum Ziel der Leistungen machen und die projektbezogene Zusammenarbeit koordinieren, etwa Termine, Schnittstellen sowie Sicherheits- und Zutrittsregeln. Darüber hinausgehende Anliegen richtet sie an KOVALI.",
      "Die Fachpersonen werden nicht in die Hierarchie und die Betriebsorganisation der Auftraggeberin eingegliedert. Sie organisieren ihre Arbeit im Rahmen der vereinbarten Leistungen selbst und arbeiten grundsätzlich mit eigenen Arbeitsmitteln. Stellt die Auftraggeberin aus Sicherheitsgründen Geräte oder Zugänge zur Verfügung, werden diese ausschliesslich für die Leistungen genutzt.",
    );

    c.section("Leistungserbringung und Beizug von Subunternehmen");
    c.clauses(
      "KOVALI erbringt die Leistungen sorgfältig und nach anerkannten fachlichen Grundsätzen. Sie schuldet eine sorgfältige Tätigkeit, nicht einen bestimmten Erfolg, soweit im Einzelauftrag nichts anderes vereinbart ist.",
      "KOVALI ist berechtigt, zur Erbringung der Leistungen Hilfspersonen und selbständige Subunternehmen beizuziehen. Sie wählt diese sorgfältig aus, setzt nur ausreichend qualifizierte Fachpersonen ein und überbindet ihnen die Pflichten aus diesem Vertrag, insbesondere zu Geheimhaltung, Datenschutz und Rechten an Arbeitsergebnissen.",
      "Die im Einzelauftrag genannte Fachperson wird nur aus wichtigem Grund ersetzt, etwa bei längerer Krankheit, Unfall oder Beendigung der Zusammenarbeit mit KOVALI. KOVALI informiert die Auftraggeberin unverzüglich und schlägt eine gleichwertig qualifizierte Fachperson vor. Deren Einsatz bedarf der Zustimmung der Auftraggeberin, die sie nicht ohne sachlichen Grund verweigert.",
      "Die Auftraggeberin kann aus sachlichen Gründen, insbesondere bei ungenügender Leistung, den Ersatz einer Fachperson verlangen.",
      "Die Auftraggeberin stellt die für die Leistungen nötigen Informationen, Unterlagen und Zugänge rechtzeitig zur Verfügung und bezeichnet für jeden Einzelauftrag eine Ansprechperson.",
      "Ferien und andere Abwesenheiten der Fachperson stimmen KOVALI und die Auftraggeberin rechtzeitig ab. Für Zeiten ohne Leistungserbringung schuldet die Auftraggeberin keine Vergütung.",
    );

    c.section("Einsätze bei Kundinnen der Auftraggeberin");
    c.clauses(
      "Erbringt KOVALI die Leistungen in einem Vorhaben einer Kundin der Auftraggeberin (nachfolgend «Endkundin»), gibt die Auftraggeberin KOVALI die für die Leistungen massgebenden Vorgaben der Endkundin rechtzeitig schriftlich bekannt. Vorgaben, die über diesen Vertrag hinausgehen, gelten nur, soweit sie im Einzelauftrag vereinbart sind.",
      "Die Auftraggeberin stellt sicher, dass auch die Endkundin gegenüber den Fachpersonen kein Weisungsrecht ausübt, wie es einer Arbeitgeberin zusteht. Ziffern 2.4 und 2.5 gelten sinngemäss.",
    );

    c.section("Vergütung und Rechnungsstellung");
    c.clauses(
      `Die Vergütung richtet sich nach dem Einzelauftrag; sie wird als Stunden- oder Tagessatz oder als Festpreis vereinbart. Ein Tag umfasst ${HOURS_PER_DAY_TEXT} Arbeitsstunden; angebrochene Tage werden anteilsmässig abgerechnet, soweit im Einzelauftrag nichts anderes vereinbart ist.`,
      `Die Fachpersonen erfassen die geleistete Zeit in Zeitrapporten. KOVALI legt diese der Auftraggeberin monatlich zur Freigabe vor. Erhebt die Auftraggeberin nicht innert ${countWord(num(d.approvalDays) ?? 5, "Arbeitstag", "Arbeitstagen")} begründete Einwände, gelten die Zeitrapporte als freigegeben.`,
      "KOVALI stellt die Leistungen monatlich nachschüssig gestützt auf die freigegebenen Zeitrapporte in Rechnung. Festpreise werden nach dem im Einzelauftrag vereinbarten Zahlungsplan verrechnet.",
      `Rechnungen sind innert ${num(d.paymentDays) ?? 30} Tagen ab Rechnungsdatum ohne Abzug zahlbar. Nach Ablauf der Zahlungsfrist gerät die Auftraggeberin ohne Mahnung in Verzug und schuldet einen Verzugszins von 5 % pro Jahr.`,
      `${expensesClause(d.expenses, "die Auftraggeberin")} Der Einzelauftrag kann eine abweichende Regelung vorsehen.`,
      vatClause(k, "der Auftraggeberin"),
      "Die Auftraggeberin kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen verrechnen.",
    );

    c.section("Geheimhaltung");
    c.clauses(
      "Die Parteien behandeln alle Informationen vertraulich, die ihnen im Zusammenhang mit diesem Vertrag von der anderen Partei oder einer Endkundin zugänglich gemacht werden und die weder offenkundig noch allgemein zugänglich sind, namentlich Geschäfts-, Projekt- und Kundeninformationen sowie Personendaten (nachfolgend «vertrauliche Informationen»). Sie verwenden diese ausschliesslich zur Erfüllung dieses Vertrags.",
      confidentialityExceptions(),
      "Die Parteien machen vertrauliche Informationen nur Personen zugänglich, die sie zur Erfüllung dieses Vertrags benötigen und einer gleichwertigen Geheimhaltungspflicht unterstehen. KOVALI überbindet diese Pflicht den beigezogenen Subunternehmen und Fachpersonen schriftlich.",
      "Die Geheimhaltungspflicht gilt während der Dauer dieses Vertrags und während fünf Jahren nach dessen Beendigung; für Geschäftsgeheimnisse und Personendaten gilt sie unbefristet.",
      statutorySecrecyClause(),
      "Die Nennung der Auftraggeberin als Referenz bedarf ihrer vorgängigen Zustimmung.",
    );

    c.section("Datenschutz");
    c.clauses(
      "Die Parteien beachten das Bundesgesetz über den Datenschutz (DSG). Jede Partei ist für ihre eigenen Bearbeitungen von Personendaten selbst verantwortlich. Für Profile und andere Personendaten von Fachpersonen, die KOVALI ihr übermittelt, ist die Auftraggeberin eigenständige Verantwortliche; eine Auftragsbearbeitung liegt nicht vor.",
      "KOVALI übermittelt Profile und andere Personendaten von Fachpersonen nur mit deren Einwilligung und nur für ein bestimmtes Mandat. Die Auftraggeberin verwendet diese Daten ausschliesslich zur Prüfung und Abwicklung dieses Mandats. Sie gibt sie Dritten, einschliesslich einer Endkundin, nur bekannt, soweit die Einwilligung der Fachperson dies abdeckt; KOVALI teilt ihr den Umfang der Einwilligung mit.",
      "Wird eine Fachperson nicht berücksichtigt oder ist das Mandat abgeschlossen, löscht die Auftraggeberin deren Profil und die übrigen Personendaten unverzüglich, spätestens nach 30 Tagen, soweit keine gesetzliche Aufbewahrungspflicht besteht. Bis dahin behandelt sie diese Daten vertraulich und schützt sie durch angemessene technische und organisatorische Massnahmen (Art. 8 DSG).",
      "Bearbeiten Fachpersonen bei der Leistungserbringung Personendaten, für welche die Auftraggeberin oder eine Endkundin verantwortlich ist, tun sie dies ausschliesslich zur Erfüllung des Einzelauftrags und nach den Vorgaben der Verantwortlichen. Ist dafür eine besondere Vereinbarung erforderlich, schliessen die Parteien sie gesondert ab.",
      "Die Parteien informieren einander unverzüglich über Verletzungen der Datensicherheit, welche Personendaten aus der Zusammenarbeit betreffen.",
    );

    c.section("Rechte an Arbeitsergebnissen");
    c.clauses(
      "Die Rechte an den Arbeitsergebnissen, die KOVALI im Rahmen eines Einzelauftrags eigens für die Auftraggeberin erstellt, namentlich an Konzepten, Spezifikationen, Dokumentationen und Programmcode, gehen mit der vollständigen Bezahlung der dafür geschuldeten Vergütung auf die Auftraggeberin über. Soweit ein Übergang nicht möglich ist, räumt KOVALI der Auftraggeberin ein ausschliessliches, übertragbares sowie zeitlich und örtlich unbeschränktes Nutzungsrecht ein.",
      "Vorbestehende Rechte, Methoden, Vorlagen, Werkzeuge und das allgemeine Fachwissen von KOVALI und der Fachpersonen bleiben bei der jeweiligen Inhaberin oder beim jeweiligen Inhaber. Soweit sie in Arbeitsergebnisse einfliessen, erhält die Auftraggeberin daran ein nicht ausschliessliches, unbefristetes und unentgeltliches Nutzungsrecht im Umfang, der für die Nutzung der Arbeitsergebnisse erforderlich ist.",
      "KOVALI stellt sicher, dass die beigezogenen Subunternehmen ihr die für die Erfüllung dieser Ziffer nötigen Rechte einräumen.",
    );

    c.section("Abwerbe- und Direktbeauftragungsverbot");
    c.clauses(
      `Die Auftraggeberin verpflichtet sich, Fachpersonen, die KOVALI ihr vorgestellt oder bei ihr eingesetzt hat, sowie deren Gesellschaften während der Dauer des betreffenden Einzelauftrags und während ${countWord(months, "Monat", "Monaten")} nach dessen Beendigung weder direkt noch über Dritte mit Dienstleistungen zu beauftragen, ohne dass KOVALI daran beteiligt ist. Kommt kein Einzelauftrag zustande, beginnt die Frist mit der Vorstellung. Als vorgestellt gilt eine Fachperson, deren Profil KOVALI der Auftraggeberin übermittelt hat.`,
      "Die Auftraggeberin unterlässt es, Fachpersonen zur Beendigung ihrer Zusammenarbeit mit KOVALI zu veranlassen.",
      "Eine Anstellung der Fachperson durch die Auftraggeberin oder eine Endkundin fällt nicht unter dieses Verbot.",
      penaltyClause("Verletzt die Auftraggeberin eine Pflicht nach dieser Ziffer", "schuldet sie KOVALI", num(d.penaltyAmount) ?? 20000),
      "Die Konventionalstrafe sichert die Einhaltung dieser Ziffer. Sie ist kein Entgelt für die Vorstellung einer Fachperson oder für deren Wechsel zur Auftraggeberin; ein solches Entgelt ist weder vereinbart noch geschuldet.",
    );

    c.section("Haftung und Versicherung");
    c.clauses(
      "Die Parteien haften einander für Schäden aus der Verletzung dieses Vertrags oder eines Einzelauftrags nach den gesetzlichen Bestimmungen, soweit nachfolgend nichts anderes geregelt ist.",
      `Die Haftung für leichte Fahrlässigkeit ist pro Einzelauftrag und Kalenderjahr ${
        cap !== null
          ? `auf ${formatChf(cap)} beschränkt`
          : "auf den Betrag der Vergütung beschränkt, welche die Auftraggeberin für den betroffenen Einzelauftrag in den zwölf Monaten vor dem schädigenden Ereignis bezahlt hat"
      }. Für leichte Fahrlässigkeit ist die Haftung für mittelbare Schäden und Folgeschäden, insbesondere für entgangenen Gewinn, ausgeschlossen.`,
      "Für Hilfspersonen und beigezogene Subunternehmen haftet KOVALI nach Art. 101 OR. Die Beschränkungen nach Ziffer 10.2 gelten gestützt auf Art. 101 Abs. 2 OR und im Rahmen von Art. 101 Abs. 3 OR auch für deren Verhalten.",
      "Die Beschränkungen gelten nicht für absichtlich oder grobfahrlässig verursachte Schäden (Art. 100 Abs. 1 OR), nicht für Personenschäden und nicht, soweit das Gesetz eine Beschränkung sonst ausschliesst.",
      insurance !== null
        ? `KOVALI unterhält eine Berufs- oder Betriebshaftpflichtversicherung mit einer Deckungssumme von mindestens ${formatChf(insurance, { round: true })} pro Schadenfall und weist diese der Auftraggeberin auf Verlangen nach.`
        : "KOVALI sorgt für einen den Leistungen angemessenen Haftpflichtversicherungsschutz, auch bei den beigezogenen Subunternehmen, und weist diesen der Auftraggeberin auf Verlangen nach.",
    );

    c.section("Laufzeit und Beendigung");
    c.clauses(
      `Dieser Rahmenvertrag tritt mit der Unterzeichnung durch beide Parteien in Kraft${ctx.validFrom ? ` und gilt ab dem ${formatLongDate(ctx.validFrom)}` : ""}. ${
        ctx.validUntil
          ? `Er ist bis zum ${formatLongDate(ctx.validUntil)} befristet und endet an diesem Tag, ohne dass es einer Kündigung bedarf.`
          : "Er gilt auf unbestimmte Zeit."
      }`,
      `Jede Partei kann den Rahmenvertrag mit einer Frist von ${countWord(notice, "Monat", "Monaten")} auf das Ende eines Kalendermonats schriftlich kündigen.`,
      "Einzelaufträge enden mit Ablauf der vereinbarten Dauer. Vorher können sie mit der im Einzelauftrag vereinbarten Frist schriftlich gekündigt werden, mangels Vereinbarung mit einer Frist von 30 Tagen.",
      "Die Beendigung des Rahmenvertrags lässt laufende Einzelaufträge unberührt; für sie gilt der Rahmenvertrag bis zu ihrer Beendigung weiter.",
      importantReasonClause("diesen Vertrag und einzelne Einzelaufträge"),
      art404Clause("diesen Vertrag oder einen Einzelauftrag"),
      "Bei Beendigung gibt jede Partei der anderen deren Unterlagen und Daten zurück oder löscht sie, soweit keine gesetzliche Aufbewahrungspflicht besteht. Die Ziffern 6 bis 10 gelten über das Vertragsende hinaus, soweit sie ihrer Natur nach fortwirken.",
    );

    const special = paragraphs(d.specialTerms);
    if (special.length) {
      c.section("Besondere Vereinbarungen");
      c.clauses(...special);
    }

    finalClauses(c, k, {
      first: [
        "Bei Widersprüchen gilt folgende Rangfolge: (a) der Einzelauftrag, soweit er ausdrücklich von diesem Rahmenvertrag abweicht, und nur für diesen Einzelauftrag; (b) dieser Rahmenvertrag; (c) die Beilagen und Dokumente, auf die verwiesen wird.",
      ],
    });

    return [
      titleBlock("Rahmenvertrag", "über IT- und Beratungsdienstleistungen"),
      partiesBlock([
        { role: "Auftragnehmerin", lines: kovaliLines(k) },
        { role: "Auftraggeberin", lines: client ? companyLines(client, "Auftraggeberin") : ["[Auftraggeberin ergänzen]"] },
      ]),
      { type: "heading", text: "Präambel" },
      {
        type: "paragraph",
        text: "KOVALI erbringt Beratungs- und IT-Dienstleistungen. Sie erbringt diese selbst oder zieht dafür selbständige Subunternehmen bei. Die Auftraggeberin beabsichtigt, KOVALI für einzelne Vorhaben beizuziehen, für sich selbst oder für ihre Kundinnen. Mit diesem Rahmenvertrag regeln die Parteien die Bedingungen ihrer Zusammenarbeit.",
      },
      ...c.blocks,
      ...signatures([
        { party: k.name, signers: kovaliSigners(k) },
        { party: client ? companyLegalName(client) : "Auftraggeberin", signers: companySigners(ctx.contact, bool(d.secondSignatory)) },
      ]),
    ];
  },
});
