import { ShieldCheck } from "lucide-react";
import { legalEntityName, site } from "@/config/site";
import { RETENTION_MONTHS_WITH_CONSENT, RETENTION_MONTHS_WITHOUT_CONSENT, RETENTION_YEARS_BUSINESS_RECORDS } from "@/lib/admin/privacy";

/**
 * Short privacy notice (Art. 19 DSG) shown when the invitation is accepted and on the account
 * page. The full statement is on /datenschutz. Retention periods come from the admin privacy
 * module, so this notice, the record of processing activities and the access report agree.
 * Rendered by server pages only (the privacy module is server-only).
 */
export function PrivacySummary({ compact = false }: { compact?: boolean }) {
  const { contact } = site;
  const email = contact.email.value;
  const rows: [string, React.ReactNode][] = [
    [
      "Verantwortlich",
      <>
        {legalEntityName()} ({site.brand}), {contact.person}, {contact.address.street}, {contact.address.postalCode} {contact.address.city},{" "}
        <a href={`mailto:${email}`} className="text-blue hover:underline">
          {email}
        </a>
      </>,
    ],
    [
      "Was",
      "Ihre Kontaktdaten (Name, E-Mail, Telefon, Geburtsdatum, Wohnadresse), Ihre Firma, Ihr berufliches Profil (Werdegang, Ausbildung, Kompetenzen, Sprachen, Verfügbarkeit und Konditionen), Ihre Dokumente sowie Ihre Antworten auf Vakanzen. Für die Anmeldung Ihre E-Mail-Adresse, ein nicht umkehrbarer Hashwert Ihres Passworts und der Zeitpunkt der Anmeldung.",
    ],
    ["Wozu", "Damit KOVALI Sie für passende Projektmandate vorschlagen und die Zusammenarbeit abwickeln kann."],
    [
      "Weitergabe",
      "Ihr Profil geht nur an einen Auftraggeber, wenn Sie für die konkrete Vakanz eingewilligt haben. Sie können die Einwilligung im Portal zurückziehen; danach gibt KOVALI Ihr Profil für diese Vakanz nicht mehr weiter.",
    ],
    [
      "Speicherung",
      "In einer Datenbank in Frankfurt (Deutschland). Dokumente werden verschlüsselt gespeichert, jeder Zugriff wird protokolliert.",
    ],
    [
      "Bekanntgabe ins Ausland",
      "KOVALI setzt Vercel (Hosting), Neon (Datenbank) und Resend (E-Mail-Versand) ein. Diese US-Unternehmen können Daten auch in den USA bearbeiten; die Bekanntgabe stützt sich auf das Swiss-U.S. Data Privacy Framework oder auf vom EDÖB anerkannte Standardvertragsklauseln.",
    ],
    [
      "Dauer",
      `Ohne Einwilligung in den Talent-Pool höchstens ${RETENTION_MONTHS_WITHOUT_CONSENT} Monate, mit Einwilligung bis ${RETENTION_MONTHS_WITH_CONSENT} Monate (verlängerbar nur mit erneuter Einwilligung). Danach werden Ihre Daten und Ihr Zugang gelöscht oder anonymisiert. Verträge und Buchhaltung: ${RETENTION_YEARS_BUSINESS_RECORDS} Jahre. Auf Wunsch löscht KOVALI Ihre Daten jederzeit früher, soweit keine gesetzliche Aufbewahrungspflicht besteht.`,
    ],
    ["Ihre Rechte", "Auskunft, Berichtigung, Löschung und Herausgabe Ihrer Daten. Eine Beschwerde beim EDÖB ist möglich."],
  ];
  return (
    <section aria-labelledby="datenschutz-kurz" className={compact ? "" : "rounded-lg border border-blue/20 bg-blue/[0.04] px-4 py-4"}>
      <h2 id="datenschutz-kurz" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
        <ShieldCheck aria-hidden className="size-4 text-blue" />
        Datenschutz in Kürze
      </h2>
      <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-medium text-ink">{label}</dt>
            <dd className="text-slate">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm">
        <a href="/datenschutz" target="_blank" rel="noopener" className="font-medium text-blue hover:underline">
          Vollständige Datenschutzerklärung
        </a>
      </p>
    </section>
  );
}
