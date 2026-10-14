import { z } from "zod";
import { formatChf, formatLongDate } from "../../format";
import { f } from "../../forms";
import { labelOf, remoteOptions } from "../../options";
import { defineTemplate } from "../define";
import { expenseValues, field, links, rateUnitValues, remoteValues, reqAmount, reqInt } from "../fields";
import {
  art404Clause,
  asSentence,
  Clauses,
  companyIssues,
  companyLegalName,
  companyLines,
  confidentialityExceptions,
  countWord,
  dateOrMissing,
  expensesClause,
  finalClauses,
  HOURS_PER_DAY_TEXT,
  importantReasonClause,
  isSoleProprietorship,
  kovaliLines,
  kovaliSigners,
  MISSING,
  num,
  paragraphs,
  partiesBlock,
  penaltyClause,
  personIssues,
  personName,
  rateText,
  signatures,
  statutorySecrecyClause,
  str,
  titleBlock,
} from "../text";

/**
 * Subunternehmervertrag: KOVALI engages the specialist's own firm (company of kind
 * "subunternehmer"); the person is named as the deployed specialist. Genuine B2B work:
 * own organisation and tools, no employer-like instructions, own social insurance.
 * Sole proprietorships additionally provide the AHV confirmation of self-employment.
 */

const schema = z.object({
  clientName: f.text(200, "Bitte die Kundin angeben."),
  endClient: f.optText(200),
  project: f.optText(200),
  role: f.text(160, "Bitte die Rolle angeben."),
  description: f.text(5000, "Bitte die Leistungen beschreiben."),
  workload: f.optInt(5, 100),
  location: f.optText(200),
  remote: f.optEnum(remoteValues),
  rateAmount: reqAmount(100_000),
  rateUnit: f.enum(rateUnitValues),
  paymentDays: reqInt(5, 120),
  expenses: f.enum(expenseValues),
  nonSolicitMonths: reqInt(0, 24),
  penaltyAmount: reqAmount(1_000_000),
  liabilityCapAmount: f.optAmount(),
  insuranceAmount: f.optAmount(),
  noticeDays: reqInt(0, 180),
  specialTerms: f.optText(5000),
});

const defaults = {
  clientName: "",
  endClient: null,
  project: null,
  role: "",
  description: "",
  workload: 100,
  location: null,
  remote: "hybrid",
  rateAmount: null,
  rateUnit: "stunde",
  paymentDays: 30,
  expenses: "ausserhalb",
  nonSolicitMonths: 12,
  penaltyAmount: 15000,
  liabilityCapAmount: null,
  insuranceAmount: null,
  noticeDays: 30,
  specialTerms: null,
};

export const subunternehmer = defineTemplate({
  id: "subunternehmer",
  name: "Subunternehmervertrag",
  docType: "Subunternehmervertrag",
  description:
    "KOVALI beauftragt die eigene Firma einer Fachperson (GmbH, AG oder Einzelfirma) für einen Einsatz: Selbständigkeit, Einkaufssatz, Zeitrapporte, Kundenschutz, Haftung.",
  counterparty: "KOVALI ↔ Firma der Fachperson",
  links: links({ company: "required", candidate: "required", contact: "optional", mandate: "optional" }),
  oneOf: [],
  companyKinds: ["subunternehmer"],
  labels: {
    company: "Firma des Subunternehmens",
    candidate: "Eingesetzte Fachperson",
    contact: "Unterzeichnende Person der Firma",
    mandate: "Mandat",
  },
  hints: {
    company: "Firma der Art «Subunternehmer» mit rechtlichem Namen, Rechtsform, UID und Adresse.",
    contact: "Leer: Die Fachperson unterzeichnet für ihre Firma.",
  },
  dates: { validFrom: "Beginn des Einsatzes", validUntil: "Ende des Einsatzes" },
  defaults,
  schema,
  sections: [
    {
      title: "Einsatz",
      fields: [
        { kind: "text", name: "clientName", label: "Kundin von KOVALI", required: true, hint: "Für die KOVALI den Einsatz erbringt, z. B. ein IT-Dienstleister." },
        { kind: "text", name: "endClient", label: "Endkundin (optional)" },
        { kind: "text", name: "project", label: "Vorhaben / Projekt" },
        { kind: "text", name: "role", label: "Rolle", required: true },
        { kind: "textarea", name: "description", label: "Leistungsbeschreibung", required: true, rows: 5, wide: true, hint: "Eine Aufgabe pro Zeile oder als Fliesstext." },
      ],
    },
    { title: "Pensum und Ort", columns: 3, fields: [field.workload, field.location, field.remote] },
    {
      title: "Vergütung",
      description: "Einkaufssatz, den KOVALI dem Subunternehmen bezahlt.",
      columns: 2,
      fields: [{ ...field.rateAmount, label: "Satz Subunternehmen (CHF, exkl. MWST)" }, field.rateUnit, field.paymentDays, field.expenses],
    },
    {
      title: "Kundenschutz",
      description: "Keine Direktbeauftragung durch die Kundin während der Frist; eine Anstellung der Fachperson ist nicht erfasst.",
      fields: [
        { kind: "int", name: "nonSolicitMonths", label: "Dauer nach Vertragsende", min: 0, max: 24, suffix: "Monate", required: true },
        { kind: "amount", name: "penaltyAmount", label: "Konventionalstrafe (CHF)", required: true },
      ],
    },
    {
      title: "Haftung, Versicherung, Beendigung",
      fields: [
        field.liabilityCapAmount,
        { kind: "amount", name: "insuranceAmount", label: "Verlangte Deckung Berufshaftpflicht (CHF)", hint: "Leer: Versicherung wird nur empfohlen." },
        field.noticeDays,
        field.specialTerms,
      ],
    },
  ],
  prefill: (p) => {
    const m = p.mandate;
    const rate = p.submission?.rateBuy ?? m?.portalRate ?? p.candidate?.rateAmount ?? null;
    const unit = p.submission?.rateBuy != null ? p.submission.rateUnit : m?.portalRate != null ? m.portalRateUnit : p.candidate?.rateUnit;
    return {
      ...(m
        ? {
            clientName: m.companyName,
            endClient: m.endClient,
            role: m.title,
            description: m.description,
            workload: m.workload,
            location: m.location,
            remote: m.remote,
          }
        : {}),
      ...(rate !== null ? { rateAmount: rate, rateUnit: unit ?? "stunde" } : {}),
    };
  },
  counterpartyName: (ctx) => (ctx.company ? companyLegalName(ctx.company) : "Subunternehmen"),
  issues: (_d, ctx) => [
    ...companyIssues(ctx.company, "Subunternehmen"),
    ...(ctx.company && !ctx.company.legalForm ? [`Bei der Firma «${ctx.company.name}» fehlt die Rechtsform (GmbH, AG oder Einzelfirma).`] : []),
    ...(ctx.company && !ctx.company.uid ? [`Bei der Firma «${ctx.company.name}» fehlt die UID.`] : []),
    ...(ctx.company && ctx.company.kind !== "subunternehmer" ? [`Die Firma «${ctx.company.name}» ist nicht als Subunternehmer erfasst.`] : []),
    ...personIssues(ctx.candidate, "eingesetzte Fachperson", false),
    ...(ctx.validFrom ? [] : ["Der Beginn des Einsatzes fehlt."]),
  ],
  build(d, ctx) {
    const k = ctx.kovali;
    const firm = ctx.company;
    const person = ctx.candidate ? personName(ctx.candidate) : MISSING;
    const signer = ctx.contact ? { name: ctx.contact.name, role: ctx.contact.role ?? undefined } : { name: ctx.candidate ? person : undefined };
    const sole = isSoleProprietorship(firm?.legalForm);
    const knownForm = Boolean(firm?.legalForm);
    const rate = num(d.rateAmount);
    const months = num(d.nonSolicitMonths) ?? 12;
    const cap = num(d.liabilityCapAmount);
    const insurance = num(d.insuranceAmount);
    const clients = [`die Kundin ${str(d.clientName) || MISSING}`, str(d.endClient) ? `die Endkundin ${str(d.endClient)}` : ""].filter(Boolean);
    const c = new Clauses();

    c.section("Gegenstand und Rechtsnatur");
    c.clauses(
      `KOVALI beauftragt das Subunternehmen, im Rahmen des in Ziffer 2 beschriebenen Einsatzes Leistungen für eine Kundin von KOVALI zu erbringen. Das Subunternehmen erbringt die Leistungen durch ${person} (nachfolgend «Fachperson»).`,
      "Die Parteien vereinbaren einen Auftrag im Sinne von Art. 394 ff. des Obligationenrechts (OR) zwischen zwei selbständigen Unternehmen. Zwischen KOVALI und dem Subunternehmen oder der Fachperson entsteht kein Arbeitsverhältnis. Gegenstand dieses Vertrags ist weder Personalverleih noch Arbeitsvermittlung.",
      "Weitere Einsätze vereinbaren die Parteien in schriftlichen Einsatzvereinbarungen; für diese gilt dieser Vertrag sinngemäss.",
    );

    c.section("Einsatz");
    c.facts([
      { label: "Kundin", value: str(d.clientName) || MISSING },
      { label: "Endkundin", value: str(d.endClient) },
      { label: "Vorhaben", value: str(d.project) },
      { label: "Rolle", value: str(d.role) || MISSING },
      { label: "Fachperson", value: person },
      { label: "Beginn", value: dateOrMissing(ctx.validFrom) },
      { label: "Ende", value: ctx.validUntil ? formatLongDate(ctx.validUntil) : "unbestimmt" },
      { label: "Pensum", value: num(d.workload) !== null ? `rund ${num(d.workload)} %` : "" },
      { label: "Einsatzort", value: str(d.location) },
      { label: "Arbeitsform", value: d.remote && d.remote !== "offen" ? labelOf(remoteOptions, String(d.remote)) : "" },
      { label: "Vergütung", value: `${rateText(rate, d.rateUnit)}, exkl. MWST` },
    ]);
    c.clauses(
      `Das Subunternehmen erbringt im Einsatz insbesondere die folgenden Leistungen: ${asSentence(d.description) || MISSING}`,
      "Projektbezogene Belange wie Termine, Schnittstellen sowie Sicherheits- und Zutrittsregeln stimmt die Fachperson direkt mit den Ansprechpersonen der Kundin ab.",
    );

    c.section("Selbständigkeit");
    c.clauses(
      "Das Subunternehmen erbringt die Leistungen selbständig, mit eigener Organisation, auf eigene Rechnung und auf eigenes unternehmerisches Risiko. Es bestimmt Arbeitsweise, Arbeitseinteilung und Arbeitsmittel im Rahmen der vereinbarten Leistungen selbst.",
      "Weder KOVALI noch die Kundin oder eine Endkundin haben gegenüber dem Subunternehmen oder der Fachperson ein Weisungsrecht, wie es einer Arbeitgeberin zusteht. Vorgaben beschränken sich auf Gegenstand und Ziel der Leistungen sowie auf die Koordination im Projekt (Art. 397 OR). Die Fachperson wird nicht in die Hierarchie oder die Betriebsorganisation von KOVALI, der Kundin oder einer Endkundin eingegliedert.",
      "Das Subunternehmen arbeitet grundsätzlich mit eigenen Arbeitsmitteln und trägt deren Kosten. Stellt die Kundin aus Sicherheitsgründen Geräte oder Zugänge zur Verfügung, nutzt das Subunternehmen diese ausschliesslich für den Einsatz.",
      "Das Subunternehmen ist frei, auch für andere Auftraggeberinnen tätig zu sein, soweit dadurch die Erfüllung dieses Vertrags, die Geheimhaltung und der Kundenschutz nach Ziffer 9 nicht beeinträchtigt werden.",
      "Für Zeiten, in denen keine Leistungen erbracht werden, insbesondere bei Ferien, Krankheit oder Unfall, besteht kein Anspruch auf Vergütung. Das Subunternehmen informiert KOVALI frühzeitig über geplante Abwesenheiten und unverzüglich über Verhinderungen.",
    );

    c.section("Personal, Sozialversicherungen und Steuern");
    c.clauses(
      "Das Subunternehmen ist allein verantwortlich für Lohn, Sozialversicherungen (insbesondere AHV/IV/EO, ALV, berufliche Vorsorge und Unfallversicherung), Quellensteuern, Steuern und eine allfällige Mehrwertsteuer seiner Mitarbeitenden und seiner selbst sowie für die erforderlichen Arbeits- und Aufenthaltsbewilligungen. KOVALI leistet weder Lohn noch Sozialversicherungsbeiträge.",
      sole
        ? "Das Subunternehmen ist eine Einzelfirma. Es bestätigt, dass die Fachperson deren Inhaberin oder Inhaber ist und von der zuständigen Ausgleichskasse als selbständigerwerbend anerkannt ist. Es reicht KOVALI vor Beginn des Einsatzes eine aktuelle Bestätigung der Ausgleichskasse über die Anerkennung als Selbständigerwerbende oder Selbständigerwerbender (AHV-Bestätigung) ein und, soweit vorhanden, einen aktuellen Handelsregisterauszug."
        : knownForm
          ? "Das Subunternehmen bestätigt, dass die Fachperson bei ihm angestellt oder an ihm beteiligt ist und für es tätig ist, und dass es die Sozialversicherungsbeiträge auf dem Lohn der Fachperson als Arbeitgeberin abrechnet. Es weist dies KOVALI vor Beginn des Einsatzes nach, namentlich mit einem aktuellen Handelsregisterauszug und einer Bestätigung der Ausgleichskasse über den Anschluss als Arbeitgeberin."
          : "Das Subunternehmen bestätigt, dass die Fachperson entweder seine Inhaberin oder sein Inhaber und von der Ausgleichskasse als selbständigerwerbend anerkannt ist oder bei ihm angestellt bzw. an ihm beteiligt ist und dass es die Sozialversicherungsbeiträge auf ihrem Lohn als Arbeitgeberin abrechnet. Es weist dies KOVALI vor Beginn des Einsatzes mit einer Bestätigung der Ausgleichskasse und einem aktuellen Handelsregisterauszug nach.",
      "Das Subunternehmen meldet KOVALI unverzüglich jede Änderung dieser Verhältnisse, insbesondere eine Änderung des sozialversicherungsrechtlichen Status der Fachperson.",
      "Stellt eine Sozialversicherung oder Behörde fest, dass die Tätigkeit des Subunternehmens oder der Fachperson für KOVALI als unselbständige Erwerbstätigkeit gilt, informieren sich die Parteien unverzüglich. Das Subunternehmen ersetzt KOVALI Beiträge, Zinsen und Kosten, die KOVALI deswegen leisten muss, soweit sie auf unrichtigen oder unvollständigen Angaben oder Nachweisen des Subunternehmens beruhen.",
    );

    c.section("Leistungserbringung");
    c.clauses(
      "Das Subunternehmen erbringt die Leistungen sorgfältig, nach anerkannten fachlichen Grundsätzen und durch die Fachperson. Der Einsatz einer anderen Person bedarf der vorgängigen schriftlichen Zustimmung von KOVALI, die ihrerseits die Zustimmung der Kundin einholt.",
      "Das Subunternehmen informiert KOVALI unverzüglich über Umstände, welche die vertragsgemässe Leistungserbringung gefährden, insbesondere über Verzögerungen, Mängel oder Konflikte im Projekt.",
    );

    c.section("Vergütung, Zeitrapporte und Rechnungsstellung");
    c.clauses(
      `KOVALI vergütet die Leistungen mit ${rateText(rate, d.rateUnit)} exklusive Mehrwertsteuer nach dem effektiven Aufwand.${d.rateUnit === "tag" ? ` Ein Tag umfasst ${HOURS_PER_DAY_TEXT} Arbeitsstunden; angebrochene Tage werden anteilsmässig abgerechnet.` : ""}`,
      expensesClause(d.expenses, "KOVALI"),
      "Das Subunternehmen erfasst die geleistete Zeit in Zeitrapporten und reicht sie KOVALI bis zum dritten Arbeitstag des Folgemonats ein. KOVALI holt die Freigabe der Kundin ein. Massgebend für die Abrechnung sind die freigegebenen Zeitrapporte.",
      "Das Subunternehmen stellt KOVALI monatlich Rechnung über die freigegebenen Leistungen. Ist es mehrwertsteuerpflichtig, weist es die Mehrwertsteuer separat aus.",
      `KOVALI bezahlt korrekte Rechnungen innert ${num(d.paymentDays) ?? 30} Tagen nach Eingang der Rechnung und des freigegebenen Zeitrapports. Die Zahlung hängt nicht davon ab, ob und wann die Kundin KOVALI bezahlt.`,
      "Beanstandet die Kundin Leistungen des Subunternehmens begründet, kann KOVALI den betroffenen Teil der Vergütung bis zur Klärung zurückbehalten.",
    );

    c.section("Geheimhaltung");
    c.clauses(
      "Die Parteien behandeln alle Informationen vertraulich, die ihnen im Zusammenhang mit diesem Vertrag zugänglich werden und die weder offenkundig noch allgemein zugänglich sind, namentlich Informationen über KOVALI, die Kundin, Endkundinnen, Projekte, Konditionen und Personendaten. Sie verwenden diese ausschliesslich zur Erfüllung dieses Vertrags.",
      confidentialityExceptions(),
      "Das Subunternehmen überbindet diese Pflicht der Fachperson und allfälligen weiteren Hilfspersonen schriftlich. Verlangt die Kundin eine persönliche Geheimhaltungserklärung der Fachperson, sorgt das Subunternehmen für deren Unterzeichnung.",
      "Die Geheimhaltungspflicht gilt während der Dauer dieses Vertrags und während fünf Jahren nach dessen Beendigung; für Geschäftsgeheimnisse und Personendaten gilt sie unbefristet.",
      statutorySecrecyClause(),
    );

    c.section("Datenschutz");
    c.clauses(
      "Die Parteien beachten das Bundesgesetz über den Datenschutz (DSG). KOVALI bearbeitet die Personendaten der Fachperson, die für die Anbahnung und Abwicklung dieses Vertrags erforderlich sind, als Verantwortliche. Profile und Lebensläufe gibt KOVALI an Kundinnen nur mit Einwilligung der Fachperson und nur für ein bestimmtes Mandat weiter.",
      "Personendaten, die dem Subunternehmen im Einsatz zugänglich werden, bearbeitet es ausschliesslich zur Erfüllung dieses Vertrags und nach den Vorgaben der dafür Verantwortlichen. Es schützt sie durch angemessene technische und organisatorische Massnahmen, speichert sie nicht auf eigenen Geräten, soweit dies für den Einsatz nicht erforderlich ist, und gibt sie nach Abschluss des Einsatzes zurück oder löscht sie.",
      "Das Subunternehmen informiert KOVALI unverzüglich über Verletzungen der Datensicherheit, die Personendaten aus dem Einsatz betreffen.",
    );

    c.section("Kundenschutz");
    c.clauses(
      `Das Subunternehmen verpflichtet sich, während der Dauer dieses Vertrags und während ${countWord(months, "Monat", "Monaten")} nach dessen Beendigung für ${clients.join(" und für ")} weder direkt noch über Dritte Leistungen zu erbringen, die den Leistungen nach diesem Vertrag entsprechen oder ähnlich sind, ohne dass KOVALI daran beteiligt ist. Dasselbe gilt während ${countWord(months, "Monat", "Monaten")} ab der Vorstellung für weitere Kundinnen, denen KOVALI das Profil der Fachperson mit deren Einwilligung vorgestellt hat.`,
      "Eine Anstellung der Fachperson bei der Kundin oder einer Endkundin fällt nicht unter dieses Verbot.",
      penaltyClause("Verletzt das Subunternehmen das Verbot nach Ziffer 9.1", "schuldet es KOVALI", num(d.penaltyAmount) ?? 15000),
    );

    c.section("Rechte an Arbeitsergebnissen");
    c.clauses(
      "Die Rechte an allen Arbeitsergebnissen, die das Subunternehmen im Rahmen dieses Vertrags erstellt, gehen mit ihrer Entstehung auf KOVALI über, damit KOVALI sie der Kundin übertragen kann. Soweit ein Übergang nicht möglich ist, räumt das Subunternehmen KOVALI ein ausschliessliches, übertragbares sowie zeitlich und örtlich unbeschränktes Nutzungsrecht ein. Diese Rechtseinräumung ist mit der Vergütung nach Ziffer 6 abgegolten.",
      "Vorbestehende Rechte und das allgemeine Fachwissen des Subunternehmens bleiben bei diesem. Soweit sie in Arbeitsergebnisse einfliessen, erhalten KOVALI und die Kundin daran ein nicht ausschliessliches, unbefristetes und unentgeltliches Nutzungsrecht im erforderlichen Umfang.",
    );

    c.section("Haftung und Versicherung");
    c.clauses(
      "Das Subunternehmen haftet KOVALI für die sorgfältige Erbringung der Leistungen und für Schäden, die es oder die Fachperson schuldhaft verursacht, einschliesslich Ansprüchen der Kundin oder einer Endkundin gegenüber KOVALI, die auf Leistungen des Subunternehmens zurückgehen.",
      `Die Haftung für leichte Fahrlässigkeit ist pro Einsatz und Kalenderjahr ${
        cap !== null
          ? `auf ${formatChf(cap)} beschränkt`
          : "auf den Betrag der Vergütung beschränkt, die KOVALI dem Subunternehmen für den betroffenen Einsatz in den zwölf Monaten vor dem schädigenden Ereignis bezahlt hat"
      }. Für leichte Fahrlässigkeit ist die Haftung für mittelbare Schäden und Folgeschäden, insbesondere für entgangenen Gewinn, ausgeschlossen. Diese Regelung gilt für beide Parteien.`,
      "Für Hilfspersonen haften die Parteien nach Art. 101 OR; die Beschränkungen nach Ziffer 11.2 gelten gestützt auf Art. 101 Abs. 2 OR und im Rahmen von Art. 101 Abs. 3 OR auch für deren Verhalten.",
      "Die Beschränkungen gelten nicht für absichtlich oder grobfahrlässig verursachte Schäden (Art. 100 Abs. 1 OR) und nicht für Personenschäden. Die Konventionalstrafe nach Ziffer 9 bleibt vorbehalten.",
      insurance !== null
        ? `Das Subunternehmen unterhält während der Dauer dieses Vertrags eine Berufs- oder Betriebshaftpflichtversicherung mit einer Deckungssumme von mindestens ${formatChf(insurance, { round: true })} pro Schadenfall und weist diese KOVALI vor Beginn des Einsatzes und auf Verlangen nach.`
        : "KOVALI empfiehlt dem Subunternehmen, eine Berufs- oder Betriebshaftpflichtversicherung mit einer dem Einsatz angemessenen Deckung abzuschliessen. Verlangt die Kundin einen Versicherungsnachweis, legt das Subunternehmen diesen vor Beginn des Einsatzes vor.",
    );

    c.section("Dauer und Beendigung");
    c.clauses(
      `Dieser Vertrag tritt mit der Unterzeichnung in Kraft. Der Einsatz beginnt am ${dateOrMissing(ctx.validFrom)}${
        ctx.validUntil ? ` und endet am ${formatLongDate(ctx.validUntil)}, ohne dass es einer Kündigung bedarf` : " und dauert auf unbestimmte Zeit"
      }.`,
      `Jede Partei kann diesen Vertrag schriftlich mit einer Frist von ${num(d.noticeDays) ?? 30} Tagen kündigen.`,
      "Endet der Auftrag der Kundin an KOVALI für das Vorhaben vorzeitig, informiert KOVALI das Subunternehmen unverzüglich. Der Einsatz endet in diesem Fall auf denselben Zeitpunkt; die bis dahin erbrachten Leistungen werden vergütet.",
      importantReasonClause("diesen Vertrag"),
      art404Clause("diesen Vertrag"),
      "Bei Beendigung gibt das Subunternehmen alle Unterlagen, Geräte und Daten von KOVALI, der Kundin und von Endkundinnen zurück oder löscht sie, soweit keine gesetzliche Aufbewahrungspflicht besteht. Die Ziffern 7 bis 11 gelten über das Vertragsende hinaus, soweit sie ihrer Natur nach fortwirken.",
    );

    const special = paragraphs(d.specialTerms);
    if (special.length) {
      c.section("Besondere Vereinbarungen");
      c.clauses(...special);
    }

    finalClauses(c, k);

    const firmLines = firm ? companyLines(firm, "Subunternehmen", { legalForm: true, representedBy: signer.name }) : ["[Firma des Subunternehmens ergänzen]"];

    return [
      titleBlock("Subunternehmervertrag", "über den Einsatz einer Fachperson in einem Kundenprojekt von KOVALI"),
      partiesBlock([
        { role: "Auftraggeberin", lines: kovaliLines(k) },
        { role: "Subunternehmen", lines: firmLines },
      ]),
      { type: "heading", text: "Präambel" },
      {
        type: "paragraph",
        text: `KOVALI erbringt für ihre Kundinnen Beratungs- und IT-Dienstleistungen und zieht dafür selbständige Subunternehmen bei. Das Subunternehmen ist ein selbständiges Unternehmen, über das ${person} tätig ist. Die Parteien regeln mit diesem Vertrag den Einsatz des Subunternehmens.`,
      },
      ...c.blocks,
      ...signatures([
        { party: k.name, signers: kovaliSigners(k) },
        { party: firm ? companyLegalName(firm) : "Subunternehmen", signers: [signer] },
      ]),
    ];
  },
});
