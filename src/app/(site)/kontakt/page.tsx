import { Suspense } from "react";
import { Mail } from "lucide-react";
import { DarkBackdrop } from "@/components/brand/motifs";
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
    "Kontakt zu KOVALI für Beratungen, IT-Dienstleister und Unternehmen: Leistung, Zeitraum, Pensum und Voraussetzungen angeben. Antwort von Ferhat Demir.",
  path: "/kontakt",
});

/**
 * The form only appears when requests can be delivered (Resend configured) or in a dry run.
 * Until then the page offers the e-mail address instead of a form that would fail.
 */
const formActive = isEmailConfigured() || serverEnv.dryRun;

/** What helps for a first assessment when the request comes by e-mail. Same order as the form. */
const helpfulDetails = [
  "Gewünschte Leistung, zum Beispiel Business Analysis oder Testmanagement",
  "Aufgabe und Ausgangslage",
  "Beginn, Laufzeit und Pensum",
  "Einsatzort und Remote-Anteil",
  "Voraussetzungen wie Erfahrung, Methoden, Tools, Sprachen oder Zertifikate",
  "Name Ihres Unternehmens und Ihre Kontaktangaben",
  "Ein vorhandenes Anforderungsprofil, falls es eines gibt",
];

const nextSteps = [
  formActive
    ? "Sie schildern die offene Aufgabe oder Ihr Vorhaben über das Formular oder per E-Mail."
    : "Sie schildern die offene Aufgabe oder Ihr Vorhaben per E-Mail.",
  `Ferhat Demir liest Ihre Anfrage und meldet sich mit einer ersten Einschätzung${responseClause()}.`,
  "In einem kurzen Gespräch klären wir Aufgaben, Umfang, Zeitrahmen und Konditionen.",
];

const textLinkDark =
  "text-electric underline decoration-electric/40 decoration-1 underline-offset-[3px] transition-colors hover:decoration-electric";

/** h3 inside the request section (form off), h2 in the aside (form on). */
function NextSteps({ className, headingLevel: Heading = "h2" }: { className?: string; headingLevel?: "h2" | "h3" }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-7 sm:p-8", className)}>
      <Heading className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-blue">So geht es weiter</Heading>
      <ol className="relative mt-6 space-y-6">
        <span aria-hidden className="absolute bottom-3 left-[1.125rem] top-3 w-px bg-line" />
        {nextSteps.map((step, i) => (
          <li key={step} className="relative flex gap-4">
            <span
              aria-hidden
              className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-night font-mono text-xs font-medium tabular-nums text-electric"
            >
              {String(i + 1).padStart(2, "0")}
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
        lead="KOVALI arbeitet für Beratungen, IT-Dienstleister und Unternehmen mit eigenem IT-Projekt. Ihre Anfrage liest Ferhat Demir, Geschäftsführer."
        compact
      />

      <Container className="grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="formular-title" className="lg:col-span-7">
          <h2 id="formular-title" className="text-[2rem] font-semibold leading-tight tracking-[-0.028em] text-ink">
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

        <aside aria-label="Kontaktangaben" className="space-y-6 lg:sticky lg:top-28 lg:col-span-4 lg:col-start-9 lg:self-start">
          <div className="on-dark relative isolate overflow-hidden rounded-2xl bg-night p-7 text-white shadow-[0_30px_60px_-30px_rgb(6_11_24/0.6)] sm:p-8">
            <DarkBackdrop variant="panel" arms={false} />
            <h2 className="relative font-mono text-xs font-medium uppercase tracking-[0.08em] text-sky">Ansprechpartner</h2>
            <div className="relative mt-6 flex items-center gap-4">
              <Portrait size="md" />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug tracking-[-0.01em] text-white">{site.contact.person}</p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-white/70">{site.contact.role}</p>
              </div>
            </div>
            <p className="relative mt-6 leading-relaxed text-white/70">Seit über 10 Jahren in der IT.</p>
            <ul className="relative mt-4 space-y-2">
              <li>
                <a href={`mailto:${email}`} className={textLinkDark}>
                  {email}
                </a>
              </li>
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className={textLinkDark}>
                    {phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {formActive ? <NextSteps /> : null}

          <p className="px-1 text-sm leading-relaxed text-slate">
            Einsätze vor Ort, remote oder hybrid in der ganzen Schweiz. Arbeitssprachen: Deutsch, Französisch und
            Englisch.
          </p>
        </aside>
      </Container>
    </>
  );
}
