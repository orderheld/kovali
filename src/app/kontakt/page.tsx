import { Suspense } from "react";
import { Mail, UserRound } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";
import { PreselectedContactForm } from "./preselected-form";

export const metadata = pageMetadata({
  title: "Kontakt – IT Consulting für die ganze Schweiz",
  description:
    "Kontakt zu KOVALI, Business & Technology Consulting: Projekt anfragen, Mandat besprechen oder Partnerschaft anfragen. Persönliche Rückmeldung.",
  path: "/kontakt",
});

/**
 * The form only appears when requests can be delivered (Resend configured) or in a dry run.
 * Until then the page offers the e-mail address instead of a form that would fail.
 */
const formActive = isEmailConfigured() || serverEnv.dryRun;

const nextSteps = [
  formActive
    ? "Sie schildern Ihr Vorhaben über das Formular oder per E-Mail."
    : "Sie schildern Ihr Vorhaben per E-Mail.",
  "Ferhat Demir prüft die Anfrage persönlich und meldet sich mit einer ersten Einschätzung.",
  "In einem kurzen Gespräch klären Sie Ziel, Umfang, Zeitrahmen und Zusammenarbeit.",
];

export default function KontaktPage() {
  const email = site.contact.email.value;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Kontakt", path: "/kontakt" },
        ]}
        eyebrow="Kontakt"
        title="Projekt anfragen"
        lead="Ob konkretes Mandat, offene Rolle im Kundenprojekt oder erste Idee: Schildern Sie kurz Ihr Anliegen. IT Consulting für Organisationen in der ganzen Schweiz."
      />

      <Container className="grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="formular-title" className="lg:col-span-7">
          <h2 id="formular-title" className="text-2xl font-semibold tracking-tight">
            Ihre Anfrage
          </h2>
          <div className="mt-8">
            {formActive ? (
              <Suspense fallback={<ContactForm fallbackEmail={email} />}>
                <PreselectedContactForm fallbackEmail={email} />
              </Suspense>
            ) : (
              <div className="rounded-xl border border-line bg-mist p-8">
                <p className="leading-relaxed text-slate">
                  Das Kontaktformular wird noch eingerichtet. Bis dahin senden Sie Ihre Anfrage bitte per E-Mail. Sie
                  erhalten eine persönliche Rückmeldung.
                </p>
                <a href={`mailto:${email}`} className={buttonClasses({ className: "mt-6" })}>
                  <Mail aria-hidden className="size-4" />
                  {email}
                </a>
              </div>
            )}
          </div>
        </section>

        <aside aria-label="Kontaktangaben" className="space-y-6 lg:col-span-4 lg:col-start-9">
          <div className="rounded-xl bg-navy p-8 text-white">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-electric">Ansprechpartner</p>
            <p className="mt-4 flex items-center gap-3 text-lg font-semibold">
              <UserRound aria-hidden className="size-5 text-electric" />
              {site.contact.person}
            </p>
            <p className="mt-1 pl-8 text-white/70">{site.contact.role}</p>
            <p className="mt-6 flex items-center gap-3">
              <Mail aria-hidden className="size-5 text-electric" />
              <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
                {email}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-line p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-blue">So geht es weiter</h2>
            <ol className="mt-5 space-y-5">
              {nextSteps.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-mist font-mono text-sm text-blue">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed text-slate">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="px-1 text-sm leading-relaxed text-slate">
            Einsätze vor Ort, remote oder hybrid in der ganzen Schweiz. Projektsprachen: Deutsch, Französisch und
            Englisch.
          </p>
        </aside>
      </Container>
    </>
  );
}
