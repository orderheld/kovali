import { FileCheck2, Handshake, type LucideIcon, Network } from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { Portrait } from "@/components/sections/portrait";
import { RoleIcon } from "@/components/sections/role-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { about } from "@/content/about";
import { certifications, founder } from "@/content/company";
import { pageMetadata, personJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: about.meta.title,
  description: about.meta.description,
  path: "/unternehmen",
});

/** One icon per collaboration model, in the order of `about.collaboration.models`. */
const modelIcons: LucideIcon[] = [Handshake, Network, FileCheck2];

/** "IREB CPRE und ISTQB CTFL" */
const certificateNames = certifications.map((c) => c.short).join(" und ");

/**
 * Company page "Über uns": who we are, the team by roles, how we work, the collaboration
 * models (anchor #zusammenarbeit), the contact person (anchor #ferhat-demir) and the closing
 * panel, which carries the contact actions.
 */
export default function UnternehmenPage() {
  const { intro, team, approach, collaboration, contact } = about;

  return (
    <>
      <PageBanner
        crumbs={[
          { name: "Start", path: "/" },
          { name: about.banner.title, path: "/unternehmen" },
        ]}
        title={about.banner.title}
      />

      <Section labelledBy="wer-wir-sind-title" space="loose" className="pt-0 md:pt-0">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeader id="wer-wir-sind-title" kicker={intro.kicker} title={intro.title} />
          </div>
          <div className="lg:col-span-7">
            {intro.paragraphs.map((p) => (
              <p key={p} className="mt-6 text-lead text-muted first:mt-0">
                {p}
              </p>
            ))}
            {site.nameMeaning ? (
              <div className="mt-12">
                <p className="text-[0.9375rem] font-semibold text-graphite">{intro.nameMeaningLabel}</p>
                <dl className="mt-4 border-b border-hairline">
                  {site.nameMeaning.map((m) => (
                    <div key={m.letters} className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-hairline py-4">
                      <dt className="font-semibold text-blue">{m.letters}</dt>
                      <dd>
                        <span className="block font-semibold text-graphite">{m.word}</span>
                        <span className="mt-1 block text-[0.9375rem] text-muted">{m.text}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section tone="canvas" labelledBy="team-title" space="loose">
        <SectionHeader id="team-title" kicker={team.kicker} title={team.title} text={team.text} />
        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {team.roles.map((role, i) => (
            <li key={role.id} className="rounded-3xl bg-white p-7 sm:p-8">
              <RoleIcon index={i} />
              <h3 className="mt-6 text-h3 text-graphite">{role.title}</h3>
              <p className="mt-3 text-muted">{role.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="arbeitsweise-title" space="loose">
        <SectionHeader id="arbeitsweise-title" kicker={approach.kicker} title={approach.title} />
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {approach.steps.map((step, i) => (
            <li key={step.title} className="rounded-3xl bg-canvas p-7">
              <span aria-hidden className="text-[0.875rem] font-semibold tabular-nums text-blue">
                {i + 1}
              </span>
              <h3 className="mt-3 text-h3 text-graphite">{step.title}</h3>
              <p className="mt-3 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id={collaboration.id} tone="canvas" labelledBy="zusammenarbeit-title" space="loose">
        <SectionHeader id="zusammenarbeit-title" kicker={collaboration.kicker} title={collaboration.title} />
        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {collaboration.models.map((model, i) => {
            const Icon = modelIcons[i];
            return (
              <li key={model.title} className="rounded-3xl bg-white p-7 sm:p-8">
                <Icon aria-hidden strokeWidth={1.25} className="size-8 text-blue" />
                <h3 className="mt-6 text-h3 text-graphite">{model.title}</h3>
                <p className="mt-3 text-muted">{model.text}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid gap-6 rounded-3xl bg-white p-7 sm:p-8 lg:grid-cols-12 lg:gap-16">
          <h3 className="text-h3 text-graphite lg:col-span-4">{collaboration.termsTitle}</h3>
          <div className="space-y-4 lg:col-span-8">
            {collaboration.terms.map((t) => (
              <p key={t} className="max-w-3xl text-muted">
                {t}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section labelledBy={contact.headingId} space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Portrait size="lg" caption={false} sizes="(min-width: 640px) 24rem, 90vw" />
          </div>
          <div className="lg:col-span-7">
            <p className="kicker">{contact.kicker}</p>
            <h2 id={contact.headingId} className="mt-3 scroll-mt-24 text-h2 text-graphite">
              {site.contact.person}
            </h2>
            <p className="mt-2 text-lead text-muted">{site.contact.title}</p>
            <p className="mt-6 max-w-xl text-muted">
              Er begleitet Ihr Vorhaben vom ersten Gespräch bis zur Übergabe. {founder.name} arbeitet{" "}
              {founder.experienceLine}. Er ist nach {certificateNames} zertifiziert.
            </p>
            <ul className="mt-10 max-w-xl border-b border-hairline">
              {certifications.map((c) => (
                <li key={c.id} className="grid gap-1 border-t border-hairline py-4 sm:grid-cols-[8rem_1fr] sm:gap-x-6">
                  <span className="font-semibold text-graphite">{c.short}</span>
                  <span className="text-[0.9375rem] text-muted">{c.credential}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <CtaBand />
      <JsonLd data={personJsonLd()} />
    </>
  );
}
