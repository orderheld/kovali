import { Suspense } from "react";
import { Mail } from "lucide-react";
import { PageBanner } from "@/components/sections/page-banner";
import { Portrait } from "@/components/sections/portrait";
import { buttonClasses } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { responseClause, site } from "@/config/site";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";
import { PreselectedContactForm } from "./preselected-form";

export const metadata = pageMetadata({
  title: "Kontakt – Projekt oder Mandat anfragen",
  description: `Kontakt zu ${site.brand} für Beratungen, IT-Dienstleister und Unternehmen: Leistung, Zeitraum, Pensum und Voraussetzungen angeben. Antwort von ${site.contact.person}.`,
  path: "/kontakt",
});

/**
 * The form only appears when requests can be delivered (Resend configured) or in a dry run.
 * Until then the page offers the e-mail address instead of a form that would fail.
 */
const formActive = isEmailConfigured() || serverEnv.dryRun;

/** What helps for a first assessment when the request comes by e-mail. Same order as the form. */
const helpfulDetails = [
  "Gewünschte Leistung, Aufgabe und Ausgangslage",
  "Beginn, Laufzeit und Pensum",
  "Einsatzort und Remote-Anteil",
  "Voraussetzungen wie Methoden, Tools oder Sprachen",
  "Ihr Unternehmen und Ihre Kontaktangaben",
  "Das Anforderungsprofil, falls es eines gibt",
];

const bullet =
  "relative pl-6 leading-relaxed text-slate before:absolute before:left-0 before:top-[0.8em] before:h-px before:w-3 before:bg-blue";

/** Contact page: heading, short text and contact person on the left, the form (or the e-mail route) on the right. */
export default function KontaktPage() {
  const email = site.contact.email.value;
  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Kontakt", path: "/kontakt" },
        ]}
        scene="kontakt"
        title="Kontakt"
      />

      <Section labelledBy="kontakt-title">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <h2 id="kontakt-title" className="text-h2 text-navy">
              Sprechen wir über Ihr Vorhaben
            </h2>
            <p className="mt-6 leading-relaxed text-slate">
              Beschreiben Sie kurz Aufgabe, Zeitraum und Pensum. {site.contact.person} meldet sich mit einer ersten
              Einschätzung{responseClause()}.
            </p>
            <p className="mt-6">
              <a
                href={`mailto:${email}`}
                className="font-medium text-blue underline decoration-blue/40 decoration-1 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-700"
              >
                {email}
              </a>
            </p>

            <div className="mt-10 flex items-center gap-4 border-t border-line pt-8">
              <Portrait size="md" />
              <div className="min-w-0">
                <p className="font-medium leading-snug text-navy">{site.contact.person}</p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-slate">{site.contact.title}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            {formActive ? (
              <Suspense fallback={<ContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />}>
                <PreselectedContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />
              </Suspense>
            ) : (
              <div className="border-t border-line pt-10 lg:border-t-0 lg:pt-0">
                <h3 className="text-h3 text-navy">Anfrage per E-Mail</h3>
                <p className="mt-4 leading-relaxed text-slate">
                  Senden Sie Ihre Anfrage an {email}. Diese Angaben helfen uns bei der ersten Einschätzung:
                </p>
                <ul className="mt-6 space-y-3">
                  {helpfulDetails.map((item) => (
                    <li key={item} className={bullet}>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={`mailto:${email}`} className={buttonClasses({ className: "mt-10" })}>
                  <Mail aria-hidden strokeWidth={1.5} className="size-4" />
                  E-Mail schreiben
                </a>
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
