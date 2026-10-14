import { LegalPage } from "@/components/sections/legal-page";
import { legalEntityName, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung von KOVALI nach dem Schweizer Datenschutzgesetz (DSG): welche Personendaten bearbeitet werden, zu welchem Zweck und welche Rechte Sie haben.",
  path: "/datenschutz",
});

/** Section numbers count up in order, so adding or removing a section needs no renumbering. */
function sectionCounter() {
  let n = 0;
  return (title: string) => `${++n}. ${title}`;
}

export default function DatenschutzPage() {
  const { contact } = site;
  const { address } = contact;
  const email = contact.email.value;
  const section = sectionCounter();
  return (
    <LegalPage title="Datenschutzerklärung" path="/datenschutz" updated="Oktober 2026">
      <p>
        Diese Datenschutzerklärung informiert darüber, welche Personendaten beim Besuch dieser Website, bei einer
        Kontaktaufnahme und in der Zusammenarbeit mit Kunden und Partnern bearbeitet werden. Sie richtet sich nach dem
        Schweizer Bundesgesetz über den Datenschutz (DSG).
      </p>

      <h2>{section("Verantwortliche Stelle")}</h2>
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

      <h2>{section("Besuch der Website")}</h2>
      <p>
        Die Website wird bei Vercel Inc. (USA) betrieben. Beim Aufruf einer Seite werden technisch notwendige Daten
        verarbeitet und in Server-Protokollen kurzzeitig gespeichert: IP-Adresse, Datum und Uhrzeit, aufgerufene
        Adresse, Referrer sowie Browser und Betriebssystem. Diese Daten dienen dem sicheren und stabilen Betrieb der
        Website und werden nicht mit anderen Daten zusammengeführt.
      </p>

      <h2>{section("Cookies und Tracking")}</h2>
      <p>
        Die öffentlichen Seiten dieser Website setzen keine Cookies und verwenden keine Analyse-, Werbe- oder
        Tracking-Dienste. Es sind keine Social-Media-Plugins eingebunden. Schriften und Grafiken werden direkt von dieser
        Website geladen, es besteht keine Verbindung zu Schriftanbietern wie Google Fonts.
      </p>
      <p>
        Nur wer sich im internen Verwaltungsbereich von {site.brand} anmeldet, erhält ein technisch notwendiges Sitzungscookie. Es enthält eine zufällige Kennung, dient
        ausschliesslich der Anmeldung und wird beim Abmelden gelöscht.
      </p>

      <h2>{section("Kontaktformular und E-Mail")}</h2>
      <p>
        Wenn Sie das Kontaktformular verwenden, werden die von Ihnen eingegebenen Angaben bearbeitet: Unternehmen, Name,
        E-Mail-Adresse, Art der Anfrage und Beschreibung, optional Telefonnummer, gewünschte Leistungen, Beginn,
        Laufzeit, Pensum, Arbeitsmodell, Einsatzort, Voraussetzungen und Ihre Nachricht sowie ein Anforderungsprofil als
        Datei. Zweck ist die Bearbeitung Ihrer Anfrage und gegebenenfalls die Vorbereitung einer Zusammenarbeit.
      </p>
      <ul>
        <li>
          Die Anfrage wird über den E-Mail-Dienst Resend (Resend, Inc., USA) an das Postfach von {site.brand}{" "}
          übermittelt, ein Anforderungsprofil als Anhang.
        </li>
        <li>
          Je nach Konfiguration wird die Anfrage zusätzlich in einer Datenbank des Anbieters Neon (Neon, Inc., USA) mit
          Speicherort in Frankfurt am Main (Deutschland) abgelegt, damit keine Anfrage verloren geht. Ein
          Anforderungsprofil wird dort nicht gespeichert.
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

      <h2>{section("Zusammenarbeit mit Kunden und Partnern")}</h2>
      <p>
        Entsteht eine Zusammenarbeit, speichert {site.brand} Name, Funktion, E-Mail-Adresse und Telefonnummer der
        Kontaktpersonen bei Kunden und Partnern sowie Verträge und Korrespondenz in einer internen Datenbank beim
        Anbieter Neon in Frankfurt am Main (Deutschland). Dokumente werden dort verschlüsselt gespeichert. Zugriff hat
        nur {site.brand}.
      </p>

      <h2>{section("Bekanntgabe ins Ausland")}</h2>
      <p>
        Die interne Datenbank liegt in Frankfurt am Main (Deutschland), die Server-Funktionen dieser Website laufen
        ebenfalls in Frankfurt. Deutschland bietet nach dem Schweizer Datenschutzrecht einen angemessenen Schutz. Die
        genannten Dienstleister sind Unternehmen aus den USA und können Personendaten auch dort bearbeiten. Die
        Bekanntgabe in die USA erfolgt gestützt auf die Zertifizierung der Anbieter unter dem Swiss-U.S. Data Privacy
        Framework, das der Bundesrat als angemessenen Schutz anerkannt hat, oder auf Standardvertragsklauseln, die vom
        Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) anerkannt sind. Die Dienstleister bearbeiten die Daten ausschliesslich im
        Auftrag und nach Weisung von {site.brand}.
      </p>

      <h2>{section("Aufbewahrung")}</h2>
      <p>
        Personendaten werden nur so lange aufbewahrt, wie es für den jeweiligen Zweck nötig ist. In der Datenbank
        gespeicherte Anfragen werden nach spätestens zwölf Monaten automatisch gelöscht. Entsteht eine
        Geschäftsbeziehung, gelten die gesetzlichen Aufbewahrungspflichten, insbesondere für Verträge,
        Geschäftskorrespondenz und Buchhaltungsunterlagen.
      </p>

      <h2>{section("Datensicherheit")}</h2>
      <ul>
        <li>Die Übertragung zwischen Ihrem Browser und dieser Website ist mit TLS verschlüsselt.</li>
        <li>Dokumente werden vor dem Speichern verschlüsselt (AES-256). Das Passwort wird nur als Hashwert gespeichert.</li>
        <li>
          Auf die interne Datenbank hat nur {site.brand} Zugriff. Die Anmeldung erfordert ein Passwort und einen Code aus
          einer Authenticator-App, die Zahl der Fehlversuche ist begrenzt.
        </li>
        <li>
          Anmeldungen, Änderungen und Abrufe von Dokumenten werden in einem Zugriffsprotokoll festgehalten, das selbst
          keine Namen enthält.
        </li>
        <li>Der interne Verwaltungsbereich wird nicht von Suchmaschinen erfasst.</li>
      </ul>

      <h2>{section("Ihre Rechte")}</h2>
      <p>Im Rahmen des DSG haben Sie insbesondere folgende Rechte:</p>
      <ul>
        <li>Auskunft darüber, ob und welche Personendaten über Sie bearbeitet werden</li>
        <li>Berichtigung unrichtiger Personendaten</li>
        <li>Löschung oder Einschränkung der Bearbeitung, soweit keine Pflicht zur Aufbewahrung besteht</li>
        <li>Herausgabe oder Übertragung Ihrer Personendaten in einem gängigen elektronischen Format</li>
        <li>Widerspruch gegen eine Bearbeitung</li>
      </ul>
      <p>
        Für die Ausübung dieser Rechte genügt eine E-Mail an <a href={`mailto:${email}`}>{email}</a>. Die Auskunft ist
        kostenlos und erfolgt innerhalb von 30 Tagen, auf Wunsch auch in einem maschinenlesbaren Format. Zur Prüfung
        Ihrer Identität kann ein Nachweis verlangt werden. Eine erteilte Einwilligung können Sie jederzeit widerrufen.
        Sie haben zudem das Recht, sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu
        beschweren.
      </p>

      <h2>{section("Änderungen")}</h2>
      <p>
        Diese Datenschutzerklärung kann angepasst werden, wenn sich die Website oder die eingesetzten Dienste ändern.
        Massgebend ist die auf dieser Seite veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
