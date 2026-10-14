import { LegalPage } from "@/components/sections/legal-page";
import { legalEntityName, site } from "@/config/site";
import {
  PORTAL_SESSION_ABSOLUTE_MS,
  PORTAL_SESSION_IDLE_MS,
  RETENTION_MONTHS_WITH_CONSENT,
  RETENTION_MONTHS_WITHOUT_CONSENT,
} from "@/lib/admin/retention";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung von KOVALI nach dem Schweizer Datenschutzgesetz (DSG): welche Personendaten bearbeitet werden, zu welchem Zweck und welche Rechte Sie haben.",
  path: "/datenschutz",
});

const numberWords = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
/** Numbers up to twelve in words, as in the rest of the text. */
const num = (n: number) => numberWords[n] ?? String(n);
const portalSessionDays = PORTAL_SESSION_ABSOLUTE_MS / 86_400_000;
const portalIdleHours = PORTAL_SESSION_IDLE_MS / 3_600_000;

export default function DatenschutzPage() {
  const { contact } = site;
  const { address } = contact;
  const email = contact.email.value;
  return (
    <LegalPage title="Datenschutzerklärung" path="/datenschutz" updated="Oktober 2026">
      <p>
        Diese Datenschutzerklärung informiert darüber, welche Personendaten beim Besuch dieser Website, bei einer
        Kontaktaufnahme, beim Senden eines Profils, in der Zusammenarbeit mit Fachleuten und im Kandidatenportal bearbeitet
        werden. Sie richtet sich nach dem Schweizer Bundesgesetz über den Datenschutz (DSG).
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

      <h2>3. Cookies und Tracking</h2>
      <p>
        Die öffentlichen Seiten dieser Website setzen keine Cookies und verwenden keine Analyse-, Werbe- oder
        Tracking-Dienste. Es sind keine Social-Media-Plugins eingebunden. Schriften und Grafiken werden direkt von dieser
        Website geladen, es besteht keine Verbindung zu Schriftanbietern wie Google Fonts.
      </p>
      <p>
        Nur wer sich im Kandidatenportal oder im internen Verwaltungsbereich von {site.brand} anmeldet, erhält ein
        technisch notwendiges Sitzungscookie. Es enthält eine zufällige Kennung, dient ausschliesslich der Anmeldung und
        wird beim Abmelden gelöscht. Im Kandidatenportal endet eine Sitzung spätestens nach {num(portalSessionDays)} Tagen
        oder nach {num(portalIdleHours)} Stunden ohne Aktivität.
      </p>

      <h2>4. Kontaktformular und E-Mail</h2>
      <p>
        Wenn Sie das Kontaktformular verwenden, werden die von Ihnen eingegebenen Angaben bearbeitet: Name, Unternehmen,
        E-Mail-Adresse, optional Telefonnummer, Art der Anfrage, gewünschte Leistung, Beschreibung, optional
        gewünschter Start, Arbeitsmodell und Einsatzort, Ihre Nachricht sowie optional ein Anforderungsprofil als Datei.
        Zweck ist die Bearbeitung Ihrer Anfrage
        und gegebenenfalls die Vorbereitung einer Zusammenarbeit.
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
        Anliegens verwendet. Entsteht eine Zusammenarbeit, erfasst {site.brand} Name, Funktion, E-Mail-Adresse und
        Telefonnummer der Kontaktpersonen bei Kunden und Partnern in der internen Datenbank (siehe Ziffer 5).
      </p>

      <h2>5. Profil und Lebenslauf</h2>
      <p>
        Wenn Sie auf der Seite für Fachleute Ihr Profil senden, werden die von Ihnen eingegebenen Angaben bearbeitet:
        Name, E-Mail-Adresse, Schwerpunkt, optional Telefonnummer, Verfügbarkeit, Form der Zusammenarbeit (eigene GmbH oder AG),
        Link zu einem Online-Profil und Nachricht sowie Ihr Lebenslauf mit den darin enthaltenen Angaben. Zweck ist die
        Prüfung einer Zusammenarbeit in Mandaten von {site.brand}.
      </p>
      <ul>
        <li>
          Das Profil wird mit dem Lebenslauf als Anhang über Resend an das Postfach von {site.brand} übermittelt. Die
          Website selbst speichert weder das Profil noch den Lebenslauf.
        </li>
        <li>
          Prüft {site.brand} eine Zusammenarbeit, werden Ihre Angaben und Ihr Lebenslauf in der internen
          Kandidatendatenbank erfasst. Sie liegt beim Anbieter Neon in Frankfurt am Main (Deutschland). Lebensläufe und
          andere Dokumente werden dort verschlüsselt gespeichert. Erfasst werden auch Ihr Werdegang, Ihre Kompetenzen,
          Sprachen und Konditionen, Notizen zu Gesprächen sowie Ihre Einwilligungen.
        </li>
        <li>
          Ihr Profil geht nur mit Ihrer Einwilligung für ein konkretes Mandat und einen bestimmten Empfänger an einen
          Auftraggeber, ohne Namen und Kontaktdaten oder, wenn Sie ausdrücklich zugestimmt haben, mit Namen. Die
          Zusammenarbeit läuft über Ihre eigene Firma als Subunternehmerin von {site.brand}; {site.brand} selbst ist
          Auftragnehmer. {site.brand} vermittelt keine Stellen an Dritte und verleiht kein Personal. Der Empfänger
          bearbeitet das Profil danach in eigener Verantwortung.
        </li>
        <li>
          Ohne Ihre Einwilligung wird ein Profil höchstens {num(RETENTION_MONTHS_WITHOUT_CONSENT)} Monate aufbewahrt. Mit
          Ihrer Einwilligung bleibt es höchstens {num(RETENTION_MONTHS_WITH_CONSENT)} Monate gespeichert, länger nur mit
          einer erneuten Einwilligung. Danach wird es gelöscht oder so anonymisiert, dass es keiner Person mehr
          zugeordnet werden kann, auf Wunsch jederzeit früher. Entsteht eine Zusammenarbeit, gelten die gesetzlichen
          Aufbewahrungspflichten.
        </li>
        <li>Der Schutz vor Missbrauch erfolgt wie beim Kontaktformular über einen Hashwert der IP-Adresse.</li>
      </ul>
      <p>
        Stammen Ihre Angaben aus einer anderen Quelle, etwa aus einer Empfehlung oder einem öffentlichen beruflichen
        Profil, informiert {site.brand} Sie bei der ersten Kontaktaufnahme darüber.
      </p>
      <p>
        Bitte geben Sie im Lebenslauf keine besonders schützenswerten Personendaten an, die für die Prüfung nicht nötig
        sind, zum Beispiel Angaben zur Gesundheit oder zur Religion.
      </p>

      <h2>6. Kandidatenportal</h2>
      <p>
        Fachleute, mit denen {site.brand} zusammenarbeitet oder eine Zusammenarbeit prüft, erhalten auf Einladung ein
        Konto im Kandidatenportal. Dort werden folgende Daten bearbeitet:
      </p>
      <ul>
        <li>
          Ihre E-Mail-Adresse für die Anmeldung und Ihr Passwort. Das Passwort wird nur als nicht umkehrbarer Hashwert
          gespeichert. Dazu kommen der Zeitpunkt der letzten Anmeldung und die aktiven Sitzungen.
        </li>
        <li>
          Die Angaben, die Sie selbst pflegen: Profil, Kompetenzen, Werdegang, Ausbildung, Sprachen und Verfügbarkeit
          sowie Dokumente, die Sie hochladen und die verschlüsselt gespeichert werden. Ihre Änderungen gelten als «nicht
          bestätigt», bis {site.brand} sie geprüft hat. Name, Geburtsdatum, Adresse, Telefonnummer und E-Mail-Adresse
          ändern Sie über eine Anfrage im Portal.
        </li>
        <li>
          Vakanzen, die {site.brand} Ihnen im Portal zeigt, mit Ihren Antworten. Wenn Sie Interesse melden, willigen Sie
          für genau diese Vakanz ein, dass {site.brand} Sie dem Auftraggeber ohne Namen vorschlägt. Bevor Ihr Profil mit
          Namen weitergeht, fragt {site.brand} Sie nochmals. Sie können Ihre Einwilligung im Portal zurückziehen.
        </li>
        <li>
          Einladungen und Links zum Setzen eines neuen Passworts werden über Resend per E-Mail versandt.
        </li>
      </ul>
      <p>
        Das Konto wird gelöscht, wenn Ihr Profil gelöscht oder anonymisiert wird, und auf Ihren Wunsch jederzeit
        früher.
      </p>

      <h2>7. Bekanntgabe ins Ausland</h2>
      <p>
        Die interne Datenbank liegt in Frankfurt am Main (Deutschland), die Server-Funktionen dieser Website laufen
        ebenfalls in Frankfurt. Deutschland bietet nach dem Schweizer Datenschutzrecht einen angemessenen Schutz. Die
        genannten Dienstleister sind Unternehmen aus den USA und können Personendaten auch dort bearbeiten. Die
        Bekanntgabe in die USA erfolgt gestützt auf die Zertifizierung der Anbieter unter dem Swiss-U.S. Data Privacy
        Framework, das der Bundesrat als angemessenen Schutz anerkannt hat, oder auf Standardvertragsklauseln, die vom
        Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) anerkannt sind. Die Dienstleister bearbeiten die Daten ausschliesslich im
        Auftrag und nach Weisung von {site.brand}.
      </p>

      <h2>8. Aufbewahrung</h2>
      <p>
        Personendaten werden nur so lange aufbewahrt, wie es für den jeweiligen Zweck nötig ist. In der Datenbank
        gespeicherte Anfragen werden nach spätestens zwölf Monaten automatisch gelöscht. Profile von Fachleuten werden
        ohne Einwilligung nach spätestens {num(RETENTION_MONTHS_WITHOUT_CONSENT)} Monaten gelöscht oder anonymisiert, mit
        Einwilligung nach spätestens {num(RETENTION_MONTHS_WITH_CONSENT)} Monaten. Entsteht eine Geschäftsbeziehung,
        gelten die gesetzlichen Aufbewahrungspflichten, insbesondere für Verträge, Geschäftskorrespondenz und
        Buchhaltungsunterlagen.
      </p>

      <h2>9. Datensicherheit</h2>
      <ul>
        <li>Die Übertragung zwischen Ihrem Browser und dieser Website ist mit TLS verschlüsselt.</li>
        <li>
          Lebensläufe und andere Dokumente werden vor dem Speichern verschlüsselt (AES-256). Passwörter werden nur als
          Hashwert gespeichert.
        </li>
        <li>
          Auf die interne Datenbank hat nur {site.brand} Zugriff. Der Zugang ist durch ein Passwort geschützt, die Zahl der
          Fehlversuche ist begrenzt.
        </li>
        <li>
          Anmeldungen, Änderungen, Abrufe von Dokumenten und Exporte werden in einem Zugriffsprotokoll festgehalten, das
          selbst keine Namen enthält.
        </li>
        <li>Das Kandidatenportal und der Verwaltungsbereich werden nicht von Suchmaschinen erfasst.</li>
      </ul>

      <h2>10. Ihre Rechte</h2>
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
      <p>
        Um passende Fachleute für ein Mandat zu finden, ordnet die interne Datenbank Profile nach ihrer Übereinstimmung
        mit den Anforderungen. Diese Rangfolge ist ein Hilfsmittel: Ob ein Profil vorgeschlagen wird, entscheidet immer
        ein Mensch. Es finden keine automatisierten Einzelentscheidungen statt.
      </p>

      <h2>11. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann angepasst werden, wenn sich die Website oder die eingesetzten Dienste ändern.
        Massgebend ist die auf dieser Seite veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
