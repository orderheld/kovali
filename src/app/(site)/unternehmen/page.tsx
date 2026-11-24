import Image from "next/image";
import {
  FileCheck2,
  FlaskConical,
  Handshake,
  ListChecks,
  type LucideIcon,
  Network,
  Workflow,
} from "lucide-react";
import { CtaBand } from "@/components/sections/cta-band";
import { PageBanner } from "@/components/sections/page-banner";
import { Portrait } from "@/components/sections/portrait";
import { JsonLd } from "@/components/seo/json-ld";
import { Section, SectionHeader } from "@/components/ui/section";
import { site } from "@/config/site";
import { about } from "@/content/about";
import { certifications, founder } from "@/content/company";
import { scenes } from "@/content/scenes";
import { pageMetadata, personJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: about.meta.title,
  description: about.meta.description,
  path: "/unternehmen",
});

/** One icon per role, in the order of `about.team.roles`. */
const roleIcons: LucideIcon[] = [Workflow, ListChecks, FlaskConical];
/** One icon per collaboration model, in the order of `about.collaboration.models`. */
const modelIcons: LucideIcon[] = [Handshake, Network, FileCheck2];

/** "IREB CPRE und ISTQB CTFL" */
const certificateNames = certifications.map((c) => c.short).join(" und ");

/**
 * Company page "Über uns": who we are, the team by roles, how we work, the collaboration
 * models (anchor #zusammenarbeit), the contact person and the closing band, which carries
 * the contact actions.
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
        scene="unternehmen"
        title={about.banner.title}
      />

      <Section labelledBy="wer-wir-sind-title" space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h2 id="wer-wir-sind-title" className="text-h2 text-navy">
              {intro.title}
            </h2>
            {intro.paragraphs.map((p) => (
              <p key={p} className="mt-6 text-lead text-slate">
                {p}
              </p>
            ))}
            {site.nameMeaning ? (
              <div className="mt-10 border-t border-line pt-8">
                <p className="kicker">{intro.nameMeaningLabel}</p>
                <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                  {site.nameMeaning.map((m) => (
                    <li key={m.letters} className="text-slate">
                      <span className="mr-2 font-semibold tracking-[0.06em] text-navy">{m.letters}</span>
                      {m.word}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={scenes.team}
                alt=""
                fill
                sizes="(min-width: 1024px) 36rem, 92vw"
                placeholder="blur"
                className="object-cover object-[50%_60%]"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section tone="cloud" labelledBy="team-title">
        <SectionHeader id="team-title" kicker={team.kicker} title={team.title} text={team.text} align="center" />
        <ul className="mt-16 grid gap-x-12 gap-y-14 md:grid-cols-3">
          {team.roles.map((role, i) => {
            const Icon = roleIcons[i];
            return (
              <li key={role.id} className="flex flex-col items-center text-center">
                <Icon aria-hidden strokeWidth={1.25} className="size-10 text-blue" />
                <h3 className="mt-6 text-h3 text-navy">{role.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-slate">{role.text}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section labelledBy="arbeitsweise-title" space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden bg-night sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={scenes.arbeitsweise}
                alt=""
                fill
                sizes="(min-width: 1024px) 36rem, 92vw"
                placeholder="blur"
                className="object-cover object-[50%_45%]"
              />
            </div>
          </div>
          <div className="lg:col-span-6">
            <h2 id="arbeitsweise-title" className="text-h2 text-navy">
              {approach.title}
            </h2>
            <ol className="mt-10 border-b border-line">
              {approach.steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-line py-6">
                  <span aria-hidden className="pt-0.5 font-medium tabular-nums text-blue">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-h3 text-navy">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-slate">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section id={collaboration.id} tone="navy" labelledBy="zusammenarbeit-title">
        <SectionHeader id="zusammenarbeit-title" title={collaboration.title} />
        <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {collaboration.models.map((model, i) => {
            const Icon = modelIcons[i];
            return (
              <li key={model.title}>
                <Icon aria-hidden strokeWidth={1.25} className="size-11 text-electric" />
                <h3 className="mt-6 text-h3 text-white">{model.title}</h3>
                <p className="mt-3 leading-relaxed text-white/75">{model.text}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-14 space-y-3 border-t border-white/15 pt-10">
          {collaboration.terms.map((t) => (
            <p key={t} className="max-w-3xl leading-relaxed text-white/75">
              {t}
            </p>
          ))}
        </div>
      </Section>

      <Section labelledBy={contact.headingId} space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Portrait size="lg" caption={false} sizes="(min-width: 640px) 24rem, 90vw" />
          </div>
          <div className="lg:col-span-7">
            <p className="kicker">{contact.kicker}</p>
            <h2 id={contact.headingId} className="mt-4 scroll-mt-28 text-h2 text-navy">
              {site.contact.person}
            </h2>
            <p className="mt-2 text-lead text-slate">{site.contact.title}</p>
            <p className="mt-6 max-w-xl leading-relaxed text-slate">
              Er begleitet Ihr Vorhaben vom ersten Gespräch bis zur Übergabe. {founder.name} arbeitet{" "}
              {founder.experienceLine}. Er ist nach {certificateNames} zertifiziert.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
      <JsonLd data={personJsonLd()} />
    </>
  );
}
