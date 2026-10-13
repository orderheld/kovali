import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";
import { PreselectedContactForm } from "./preselected-form";

export const metadata = pageMetadata({
  title: "Kontakt – Zusammenarbeit anfragen",
  description:
    "Kontakt zu KOVALI für Beratungen, IT-Dienstleister und Unternehmen: Rolle im Kundenmandat, Projekt oder Kooperation anfragen. Persönliche Rückmeldung.",
  path: "/kontakt",
});

/**
 * The form only appears when requests can be delivered (Resend configured) or in a dry run.
 * Until then the page offers the e-mail address instead of a form that would fail.
 */
const formActive = isEmailConfigured() || serverEnv.dryRun;

const nextSteps = [
  formActive
    ? "Sie schildern die gesuchte Rolle oder Ihr Vorhaben über das Formular oder per E-Mail."
    : "Sie schildern die gesuchte Rolle oder Ihr Vorhaben per E-Mail.",
  "Wir prüfen die Anfrage persönlich und melden uns mit einer ersten Einschätzung.",
  "In einem kurzen Gespräch klären wir Aufgaben, Umfang, Zeitrahmen und Konditionen.",
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
        title="Zusammenarbeit anfragen"
        lead="Für Beratungen, IT-Dienstleister und Unternehmen: Ob offene Rolle im Kundenmandat, abgegrenztes Projekt oder Kooperation, schildern Sie kurz Ihr Anliegen."
      />

      <Container className="grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="formular-title" className="lg:col-span-7">
          <h2 id="formular-title" className="text-2xl font-semibold tracking-tight">
            Anfrage für Unternehmen
          </h2>
          <div className="mt-8">
            {formActive ? (
              <Suspense fallback={<ContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />}>
                <PreselectedContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />
              </Suspense>
            ) : (
              <div className="rounded-xl border border-line bg-mist p-8">
                <p className="leading-relaxed text-slate">
                  Senden Sie Ihre Anfrage per E-Mail. Beschreiben Sie kurz Ausgangslage, Ziel und Zeitrahmen. Sie
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

          <div className="rounded-xl border border-line bg-mist p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-blue">Für Fachleute</h2>
            <p className="mt-4 leading-relaxed text-slate">
              Sie möchten in Mandaten mitarbeiten? Senden Sie Ihren Lebenslauf über die Seite für Fachleute.
            </p>
            <Link
              href="/fachleute#profil"
              className="mt-5 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              Profil senden <ArrowRight aria-hidden className="size-4" />
            </Link>
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
