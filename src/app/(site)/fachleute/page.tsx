import Link from "next/link";
import { Mail } from "lucide-react";
import { Tick } from "@/components/sections/check-list";
import { PageHero } from "@/components/sections/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Faq } from "@/components/ui/faq";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { portalLogin } from "@/content/navigation";
import { specialists } from "@/content/specialists";
import { isAdminConfigured } from "@/lib/admin/env";
import { isEmailConfigured, serverEnv } from "@/lib/env";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { ProfileForm } from "./profile-form";

export const metadata = pageMetadata({
  title: "Für Fachleute – Mitarbeit in IT-Mandaten",
  description:
    "Sie arbeiten mit Ihrer eigenen GmbH oder AG in Business Analysis, Requirements Engineering, Application Management oder Test? Senden Sie Ihr Profil an KOVALI.",
  path: "/fachleute",
});

/** Same rule as on /kontakt: the upload form only appears when profiles can be delivered. */
const formActive = isEmailConfigured() || serverEnv.dryRun;

/** The portal box appears only once the portal is configured (see the footer). */
const portalActive = isAdminConfigured();

/*
 * No prices on this page: rates must never read as rates for specialists (spec 4.1).
 */
export default function FachleutePage() {
  const email = site.contact.email.value;
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Start", path: "/" },
          { name: "Für Fachleute", path: "/fachleute" },
        ]}
        title="Mitarbeit in IT-Mandaten"
        lead={specialists.intro}
      >
        <ButtonLink href="#profil" arrow>
          Profil senden
        </ButtonLink>
      </PageHero>

      <Section labelledBy="schwerpunkte-title">
        <SectionHeader id="schwerpunkte-title" title={specialists.focusTitle} text={specialists.focusText} />
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {specialists.focus.map((f) => (
            <li key={f.title} className="border-t border-line pt-6">
              <h3 className="text-h3 font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{f.text}</p>
            </li>
          ))}
          <li className="border-t border-line pt-6">
            <h3 className="text-h3 font-semibold">Anderer Schwerpunkt</h3>
            <p className="mt-2 leading-relaxed text-slate">
              Sie arbeiten an der Schnittstelle von Fachbereich und IT? Beschreiben Sie Ihren Schwerpunkt{" "}
              {formActive ? "im Formular" : "in Ihrer E-Mail"}.
            </p>
          </li>
        </ul>
      </Section>

      <Section tone="paper" labelledBy="ablauf-title">
        <SectionHeader id="ablauf-title" title={specialists.stepsTitle} />
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {specialists.steps.map((s, i) => (
            <li key={s.title} className="border-t border-paper-line pt-6">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full border border-line bg-white text-sm font-medium tabular-nums text-blue"
              >
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
            <h2 id="profil-title" className="text-[2rem] font-medium leading-tight text-ink">
              Profil senden
            </h2>
            {formActive ? (
              <div className="mt-8">
                <ProfileForm fallbackEmail={email} testMode={serverEnv.dryRun} />
              </div>
            ) : (
              <div className="mt-6 max-w-2xl">
                <p className="text-lg leading-relaxed text-slate">{specialists.emailInstructions}</p>
                <a href={`mailto:${email}`} className={buttonClasses({ className: "mt-8" })}>
                  <Mail aria-hidden className="size-4" />
                  {email}
                </a>
              </div>
            )}
          </div>

          {/* A plain div, not an aside: a complementary landmark must not sit inside a section. */}
          <div className="space-y-6 lg:col-span-4 lg:col-start-9">
            <div className="rounded-xl border border-line p-8">
              <h2 className="font-sans text-sm font-medium text-blue">{specialists.notesTitle}</h2>
              <ul className="mt-5 space-y-5">
                {specialists.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <Tick />
                    <span className="leading-relaxed text-slate">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-paper p-8">
              <h2 className="font-sans text-sm font-medium text-blue">Fragen vorab</h2>
              <p className="mt-4 leading-relaxed text-slate">
                Schreiben Sie an{" "}
                <a
                  href={`mailto:${email}`}
                  className="text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                >
                  {email}
                </a>
                .
              </p>
            </div>
            {portalActive ? (
              <div className="rounded-xl border border-line p-8">
                <h2 className="font-sans text-sm font-medium text-blue">{specialists.portal.title}</h2>
                <p className="mt-4 leading-relaxed text-slate">{specialists.portal.text}</p>
                <Link
                  href={portalLogin.href}
                  className="mt-4 inline-block font-medium text-blue underline decoration-1 underline-offset-[3px] hover:decoration-2"
                >
                  {portalLogin.label}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section tone="paper" labelledBy="faq-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeader id="faq-title" title={specialists.faqTitle} />
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
