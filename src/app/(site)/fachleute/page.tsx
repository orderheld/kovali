import { Info, Mail } from "lucide-react";
import { PageHero } from "@/components/sections/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { specialists } from "@/content/specialists";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { ProfileForm } from "./profile-form";

export const metadata = pageMetadata({
  title: "Für Fachleute – Mitarbeit in IT-Mandaten",
  description:
    "Business Analysis, Requirements Engineering, Application Management oder Test: Senden Sie Ihr Profil für die Mitarbeit in IT-Mandaten von KOVALI. Persönliche Prüfung.",
  path: "/fachleute",
});

/** Same rule as on /kontakt: the upload form only appears when profiles can be delivered. */
const formActive = isEmailConfigured() || serverEnv.dryRun;

export default function FachleutePage() {
  const email = site.contact.email.value;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Für Fachleute", path: "/fachleute" },
        ]}
        eyebrow="Für Fachleute"
        title="Mitarbeit in IT-Mandaten"
        lead={specialists.intro}
      >
        <ButtonLink href="#profil" arrow>
          Profil senden
        </ButtonLink>
      </PageHero>

      <Section labelledBy="schwerpunkte-title">
        <SectionHeader
          id="schwerpunkte-title"
          eyebrow="Schwerpunkte"
          title="Diese Profile sind gefragt"
          text="Gesucht sind erfahrene Fachleute für Mandate von Beratungen, IT-Dienstleistern und Unternehmen in der ganzen Schweiz."
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {specialists.focus.map((f) => (
            <li key={f.title} className="bg-white p-7">
              <h3 className="text-h3 font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{f.text}</p>
            </li>
          ))}
          <li className="bg-mist p-7">
            <h3 className="text-h3 font-semibold">Anderer Schwerpunkt</h3>
            <p className="mt-2 leading-relaxed text-slate">
              Sie arbeiten an der Schnittstelle von Fachbereich und IT? Beschreiben Sie Ihren Schwerpunkt im Formular.
            </p>
          </li>
        </ul>
      </Section>

      <Section tone="mist" labelledBy="ablauf-title">
        <SectionHeader id="ablauf-title" eyebrow="Ablauf" title="So geht es nach Ihrem Profil weiter" />
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {specialists.steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-line bg-white p-7">
              <span className="flex size-9 items-center justify-center rounded-md bg-navy font-mono text-sm text-white">
                {i + 1}
              </span>
              <h3 className="mt-5 text-h3 font-semibold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="profil" labelledBy="profil-title" className="scroll-mt-20">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <h2 id="profil-title" className="text-2xl font-semibold tracking-tight">
              Profil senden
            </h2>
            <div className="mt-8">
              {formActive ? (
                <ProfileForm fallbackEmail={email} testMode={serverEnv.dryRun} />
              ) : (
                <div className="rounded-xl border border-line bg-mist p-8">
                  <p className="leading-relaxed text-slate">
                    Senden Sie Ihren Lebenslauf als PDF per E-Mail. Nennen Sie kurz Ihren Schwerpunkt, Ihre
                    Verfügbarkeit und ob Sie selbständig arbeiten oder eine Anstellung suchen.
                  </p>
                  <a href={`mailto:${email}`} className={buttonClasses({ className: "mt-6" })}>
                    <Mail aria-hidden className="size-4" />
                    {email}
                  </a>
                </div>
              )}
            </div>
          </div>

          <aside aria-labelledby="hinweise-title" className="space-y-6 lg:col-span-4 lg:col-start-9">
            <div className="rounded-xl border border-line p-8">
              <h2 id="hinweise-title" className="font-mono text-xs uppercase tracking-[0.12em] text-blue">
                Gut zu wissen
              </h2>
              <ul className="mt-5 space-y-5">
                {specialists.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <Info aria-hidden className="mt-1 size-4 shrink-0 text-blue" />
                    <span className="leading-relaxed text-slate">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-navy p-8 text-white">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-electric">Fragen vorab</p>
              <p className="mt-4 leading-relaxed text-white/80">Schreiben Sie an</p>
              <p className="mt-1 flex items-center gap-3">
                <Mail aria-hidden className="size-5 text-electric" />
                <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
                  {email}
                </a>
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="mist" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" eyebrow="FAQ" title="Fragen von Fachleuten" />
          </div>
          <div className="lg:col-span-8">
            <Faq items={specialists.faq} />
          </div>
        </div>
      </Section>
      <JsonLd data={faqJsonLd([...specialists.faq])} />
    </>
  );
}
