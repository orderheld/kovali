import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { CheckList } from "@/components/sections/check-list";
import { PageHero } from "@/components/sections/page-hero";
import { Portrait } from "@/components/sections/portrait";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { responseClause, site } from "@/config/site";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";
import { PreselectedContactForm } from "./preselected-form";

export const metadata = pageMetadata({
  title: "Kontakt – Projekt oder Mandat anfragen",
  description:
    "Kontakt zu KOVALI für Unternehmen, Beratungen und IT-Dienstleister: offene Aufgabe, Projekt oder Teilmandat schildern. Antwort von Ferhat Demir.",
  path: "/kontakt",
});

/**
 * The form only appears when requests can be delivered (Resend configured) or in a dry run.
 * Until then the page offers the e-mail address instead of a form that would fail.
 */
const formActive = isEmailConfigured() || serverEnv.dryRun;

/** What helps for a first assessment when the request comes by e-mail (spec 3.8). */
const helpfulDetails = [
  "Aufgabe oder gesuchte Unterstützung",
  "Zeitraum und Pensum",
  "Einsatzort und Remote-Anteil",
  "Projektsprache",
  "Ein vorhandenes Anforderungsprofil, falls es eines gibt",
];

const nextSteps = [
  formActive
    ? "Sie schildern die offene Aufgabe oder Ihr Vorhaben über das Formular oder per E-Mail."
    : "Sie schildern die offene Aufgabe oder Ihr Vorhaben per E-Mail.",
  `Ferhat Demir liest Ihre Anfrage und meldet sich mit einer ersten Einschätzung${responseClause()}.`,
  "In einem kurzen Gespräch klären wir Aufgaben, Umfang, Zeitrahmen und Konditionen.",
];

const textLink = "text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2";

/** h3 inside the request section (form off), h2 in the aside (form on). */
function NextSteps({ className, headingLevel: Heading = "h2" }: { className?: string; headingLevel?: "h2" | "h3" }) {
  return (
    <div className={cn("rounded-xl border border-line p-8", className)}>
      <Heading className="font-sans text-sm font-medium text-blue">So geht es weiter</Heading>
      <ol className="mt-5 space-y-5">
        {nextSteps.map((step, i) => (
          <li key={step} className="flex gap-4">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-sm font-medium tabular-nums text-blue"
            >
              {i + 1}
            </span>
            <span className="leading-relaxed text-slate">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function KontaktPage() {
  const email = site.contact.email.value;
  const phone = site.contact.phone.value;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Kontakt", path: "/kontakt" },
        ]}
        title="Kontakt"
        lead="Schildern Sie kurz Ihr Vorhaben oder die offene Aufgabe in Ihrem Mandat. Ihre Anfrage liest Ferhat Demir, Geschäftsführer."
      />

      <Container className="grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="formular-title" className="lg:col-span-7">
          <h2 id="formular-title" className="text-[2rem] font-medium leading-tight text-ink">
            {formActive ? "Anfrage für Unternehmen" : "Anfrage per E-Mail"}
          </h2>
          {formActive ? (
            <div className="mt-8">
              <Suspense fallback={<ContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />}>
                <PreselectedContactForm fallbackEmail={email} testMode={serverEnv.dryRun} />
              </Suspense>
            </div>
          ) : (
            <div className="mt-6 max-w-2xl">
              <p className="text-lg leading-relaxed text-slate">
                Senden Sie Ihre Anfrage an <span className="font-medium text-ink">{email}</span>. Hilfreich sind diese
                Angaben:
              </p>
              <CheckList items={helpfulDetails} columns={1} className="mt-6 text-lg" />
              <a href={`mailto:${email}`} className={buttonClasses({ className: "mt-10" })}>
                <Mail aria-hidden className="size-4" />
                {email}
              </a>
              {/* Without the form the left column is short: the steps sit here instead of in the aside. */}
              <NextSteps className="mt-14" headingLevel="h3" />
            </div>
          )}
        </section>

        <aside aria-label="Kontaktangaben" className="space-y-6 lg:col-span-4 lg:col-start-9">
          <div className="rounded-xl bg-paper p-8">
            <h2 className="font-sans text-sm font-medium text-blue">Ansprechpartner</h2>
            <div className="mt-5 flex items-start gap-5">
              <Portrait size="sm" />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug text-ink">{site.contact.person}</p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-slate">{site.contact.role}</p>
              </div>
            </div>
            <p className="mt-6 leading-relaxed text-slate">Seit über 10 Jahren in der IT.</p>
            <ul className="mt-4 space-y-2">
              <li>
                <a href={`mailto:${email}`} className={textLink}>
                  {email}
                </a>
              </li>
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className={textLink}>
                    {phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {formActive ? <NextSteps /> : null}

          <div className="rounded-xl border border-line p-8">
            <h2 className="font-sans text-sm font-medium text-blue">Für Fachleute</h2>
            <p className="mt-4 leading-relaxed text-slate">
              Sie arbeiten mit Ihrer eigenen GmbH oder AG in Business Analysis oder im Test? Senden Sie Ihr Profil über
              die Seite für Fachleute.
            </p>
            <Link
              href="/fachleute#profil"
              className="mt-5 inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700"
            >
              Profil senden <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          <p className="px-1 text-sm leading-relaxed text-slate">
            Einsätze vor Ort, remote oder hybrid in der ganzen Schweiz. Arbeitssprachen: Deutsch, Französisch und
            Englisch.
          </p>
        </aside>
      </Container>
    </>
  );
}
