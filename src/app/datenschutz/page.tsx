import { LegalPage } from "@/components/sections/legal-page";
import { legalEntityName, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung von KOVALI nach dem Schweizer Datenschutzgesetz (DSG): welche Personendaten bearbeitet werden, zu welchem Zweck und welche Rechte Sie haben.",
  path: "/datenschutz",
});

export default function DatenschutzPage() {
  const { contact } = site;
  const { address } = contact;
  const email = contact.email.value;
  return (
    <LegalPage title="Datenschutzerklärung" path="/datenschutz" updated="Oktober 2026">
      <p>
        Diese Datenschutzerklärung informiert darüber, welche Personendaten beim Besuch dieser Website und bei einer
        Kontaktaufnahme bearbeitet werden. Sie richtet sich nach dem Schweizer Bundesgesetz über den Datenschutz (DSG).
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        {legalEntityName()} ({site.brand})
        <br />
        {contact.person}
        <br />
        {address.street}, {address.postalCode} {address.city}, {address.country}
        <br />
        E-Mail: <a href={`mailto:${email}`}>{email}</a>
      </p>
      <p>Für alle Anliegen zum Datenschutz können Sie sich an diese Adresse wenden.</p>

      <h2>2. Besuch der Website</h2>
      <p>
        Die Website wird bei Vercel Inc. (USA) betrieben. Beim Aufruf einer Seite werden technisch notwendige Daten
        verarbeitet und in Server-Protokollen kurzzeitig gespeichert: IP-Adresse, Datum und Uhrzeit, aufgerufene
        Adresse, Referrer sowie Browser und Betriebssystem. Diese Daten dienen dem sicheren und stabilen Betrieb der
        Website und werden nicht mit anderen Daten zusammengeführt.
      </p>

      <h2>3. Keine Cookies, kein Tracking</h2>
      <p>
        Diese Website setzt keine Cookies und verwendet keine Analyse-, Werbe- oder Tracking-Dienste. Es sind keine
        Social-Media-Plugins eingebunden. Schriften und Grafiken werden direkt von dieser Website geladen, es besteht
        keine Verbindung zu Schriftanbietern wie Google Fonts.
      </p>

      <h2>4. Kontaktformular und E-Mail</h2>
      <p>
        Wenn Sie das Kontaktformular verwenden, werden die von Ihnen eingegebenen Angaben bearbeitet: Name, Unternehmen,
        E-Mail-Adresse, optional Telefonnummer, Art der Anfrage, gewünschte Leistung, Projektbeschreibung, optional
        gewünschter Start, Arbeitsmodell und Einsatzort sowie Ihre Nachricht. Zweck ist die Bearbeitung Ihrer Anfrage
        und gegebenenfalls die Vorbereitung einer Zusammenarbeit.
      </p>
      <ul>
        <li>
          Die Anfrage wird über den E-Mail-Dienst Resend (Resend, Inc., USA) an das Postfach von {site.brand}{" "}
          übermittelt.
        </li>
        <li>
          Je nach Konfiguration wird die Anfrage zusätzlich in einer Datenbank des Anbieters Neon (Neon, Inc., USA) mit
          Speicherort in der Europäischen Union abgelegt, damit keine Anfrage verloren geht.
        </li>
        <li>
          Zum Schutz vor Missbrauch wird aus Ihrer IP-Adresse ein nicht umkehrbarer Hashwert gebildet, mit dem die
          Anzahl Anfragen pro Absender begrenzt wird. Die IP-Adresse selbst wird dabei nicht gespeichert.
        </li>
      </ul>
      <p>
        Wenn Sie eine E-Mail senden, werden Ihre E-Mail-Adresse und der Inhalt der Nachricht zur Bearbeitung Ihres
        Anliegens verwendet.
      </p>

      <h2>5. Bekanntgabe ins Ausland</h2>
      <p>
        Die genannten Dienstleister können Personendaten in den USA bearbeiten. Die Bekanntgabe erfolgt gestützt auf
        die Zertifizierung der Anbieter unter dem Swiss-U.S. Data Privacy Framework, das der Bundesrat als angemessenen
        Schutz anerkannt hat, oder auf Standardvertragsklauseln, die vom Eidgenössischen Datenschutz- und
        Öffentlichkeitsbeauftragten (EDÖB) anerkannt sind. Die Dienstleister bearbeiten die Daten ausschliesslich im
        Auftrag und nach Weisung von {site.brand}.
      </p>

      <h2>6. Aufbewahrung</h2>
      <p>
        Personendaten werden nur so lange aufbewahrt, wie es für den jeweiligen Zweck nötig ist. In der Datenbank
        gespeicherte Anfragen werden nach spätestens zwölf Monaten automatisch gelöscht. Entsteht aus einer Anfrage
        eine Geschäftsbeziehung, gelten die gesetzlichen Aufbewahrungspflichten, insbesondere für Geschäftskorrespondenz
        und Buchhaltungsunterlagen.
      </p>

      <h2>7. Datensicherheit</h2>
      <p>
        Die Übertragung zwischen Ihrem Browser und dieser Website ist mit TLS verschlüsselt. Der Zugriff auf
        Anfragen ist auf die Personen beschränkt, die sie bearbeiten.
      </p>

      <h2>8. Ihre Rechte</h2>
      <p>Im Rahmen des DSG haben Sie insbesondere folgende Rechte:</p>
      <ul>
        <li>Auskunft darüber, ob und welche Personendaten über Sie bearbeitet werden</li>
        <li>Berichtigung unrichtiger Personendaten</li>
        <li>Löschung oder Einschränkung der Bearbeitung, soweit keine Pflicht zur Aufbewahrung besteht</li>
        <li>Herausgabe oder Übertragung Ihrer Personendaten in einem gängigen elektronischen Format</li>
        <li>Widerspruch gegen eine Bearbeitung</li>
      </ul>
      <p>
        Für die Ausübung dieser Rechte genügt eine E-Mail an <a href={`mailto:${email}`}>{email}</a>. Zur Prüfung
        Ihrer Identität kann ein Nachweis verlangt werden. Sie haben zudem das Recht, sich beim Eidgenössischen
        Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren.
      </p>
      <p>Es finden keine automatisierten Einzelentscheidungen und kein Profiling statt.</p>

      <h2>9. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann angepasst werden, wenn sich die Website oder die eingesetzten Dienste ändern.
        Massgebend ist die auf dieser Seite veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
