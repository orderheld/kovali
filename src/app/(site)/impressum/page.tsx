import Link from "next/link";
import { LegalPage } from "@/components/sections/legal-page";
import { legalEntityName, legalFormLabel, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Impressum",
  description: "Impressum von KOVALI: Anbieter, Kontakt und rechtliche Hinweise.",
  path: "/impressum",
});

export default function ImpressumPage() {
  const { legal, contact } = site;
  const { address } = contact;
  const isCompany = legal.form === "gmbh";
  return (
    <LegalPage title="Impressum" path="/impressum" updated="Oktober 2026">
      <h2>Anbieter</h2>
      <p>
        {site.brand} ist ein Angebot von:
        <br />
        <strong>{legalEntityName()}</strong>
        <br />
        {address.street}
        <br />
        {address.postalCode} {address.city}
        <br />
        {address.country}
      </p>
      <p>
        Rechtsform: {legalFormLabel[legal.form]}
        <br />
        {isCompany ? "Geschäftsführung" : "Inhaber"}: {legal.owner}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${contact.email.value}`}>{contact.email.value}</a>
        {contact.phone.value ? (
          <>
            <br />
            Telefon: {contact.phone.value}
          </>
        ) : null}
      </p>

      {legal.uid.value || legal.vatNumber.value || legal.commercialRegister.value ? (
        <>
          <h2>Register und Steuern</h2>
          <p>
            {legal.uid.value ? (
              <>
                Unternehmens-Identifikationsnummer (UID): {legal.uid.value}
                <br />
              </>
            ) : null}
            {legal.vatNumber.value ? (
              <>
                Mehrwertsteuernummer: {legal.vatNumber.value}
                <br />
              </>
            ) : null}
            {legal.commercialRegister.value ? <>Eintrag: {legal.commercialRegister.value}</> : null}
          </p>
        </>
      ) : null}

      <h2>Haftungsausschluss</h2>
      <p>
        Die Inhalte dieser Website wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
        Aktualität der Inhalte wird jedoch keine Gewähr übernommen. Haftungsansprüche wegen Schäden materieller oder
        immaterieller Art, die aus dem Zugriff auf, der Nutzung oder Nichtnutzung der veröffentlichten Informationen
        entstanden sind, werden ausgeschlossen, soweit gesetzlich zulässig.
      </p>
      <p>
        Die Fachbeiträge im Bereich Insights dienen der allgemeinen Information und ersetzen keine Beratung im
        Einzelfall.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Verweise auf Websites Dritter liegen ausserhalb des Verantwortungsbereichs von {site.brand}. Für deren Inhalte
        sind ausschliesslich die jeweiligen Betreiber verantwortlich. Der Zugriff auf solche Websites erfolgt auf eigene
        Gefahr.
      </p>

      <h2>Urheberrechte</h2>
      <p>
        Texte, Logo, Grafiken und weitere Inhalte dieser Website sind urheberrechtlich geschützt. Jede Verwendung
        ausserhalb der Grenzen des Urheberrechts bedarf der vorgängigen schriftlichen Zustimmung von{" "}
        {legalEntityName()}.
      </p>

      <h2>Datenschutz</h2>
      <p>
        Informationen zur Bearbeitung von Personendaten finden Sie in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </LegalPage>
  );
}
