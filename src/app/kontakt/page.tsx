import { Suspense } from "react";
import { Mail, MapPin, UserRound } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";
import { PreselectedContactForm } from "./preselected-form";

export const metadata = pageMetadata({
  title: "Kontakt – IT Consulting Solothurn und Schweiz",
  description:
    "Kontakt zu KOVALI, IT Consulting aus Grenchen im Kanton Solothurn: Projekt anfragen, Mandat besprechen oder Partnerschaft anfragen. Persönliche Rückmeldung.",
  path: "/kontakt",
});

const nextSteps = [
  "Sie schildern Ihr Vorhaben über das Formular oder per E-Mail.",
  "Ferhat Demir prüft die Anfrage persönlich und meldet sich mit einer ersten Einschätzung.",
  "In einem kurzen Gespräch klären Sie Ziel, Umfang, Zeitrahmen und Zusammenarbeit.",
];

export default function KontaktPage() {
  const email = site.contact.email.value;
  const { address } = site.contact;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Kontakt", path: "/kontakt" },
        ]}
        eyebrow="Kontakt"
        title="Projekt anfragen"
        lead="Ob konkretes Mandat, offene Rolle im Kundenprojekt oder erste Idee: Schildern Sie kurz Ihr Anliegen. IT Consulting aus dem Kanton Solothurn, für Organisationen in der ganzen Schweiz."
      />

      <Container className="grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        <section aria-labelledby="formular-title" className="lg:col-span-7">
          <h2 id="formular-title" className="text-2xl font-semibold tracking-tight">
            Ihre Anfrage
          </h2>
          <div className="mt-8">
            <Suspense fallback={<ContactForm fallbackEmail={email} />}>
              <PreselectedContactForm fallbackEmail={email} />
            </Suspense>
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
            <address className="mt-4 flex gap-3 not-italic text-white/85">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-electric" />
              <span>
                {address.street}
                <br />
                {address.postalCode} {address.city}, {address.country}
              </span>
            </address>
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
