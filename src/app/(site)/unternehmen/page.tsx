import Image from "next/image";
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
import { scenes } from "@/content/scenes";
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

/** "01", "02", … for the mono numbering of sections and items. */
const nr = (i: number) => String(i + 1).padStart(2, "0");

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
        scene="unternehmen"
        title={about.banner.title}
      />

      <Section labelledBy="wer-wir-sind-title" space="loose">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="kicker">{`${nr(0)} / ${intro.kicker}`}</p>
            <h2 id="wer-wir-sind-title" className="mt-5 text-h2 text-night">
              {intro.title}
            </h2>
            {intro.paragraphs.map((p) => (
              <p key={p} className="mt-6 text-lead text-slate">
                {p}
              </p>
            ))}
            {site.nameMeaning ? (
              <div className="mt-12">
                <p className="kicker">{intro.nameMeaningLabel}</p>
                <dl className="mt-5 border-b border-line">
                  {site.nameMeaning.map((m) => (
                    <div key={m.letters} className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-line py-4">
                      <dt className="font-mono text-sm font-medium tracking-[0.06em] text-blue">{m.letters}</dt>
                      <dd>
                        <span className="block font-medium text-night">{m.word}</span>
                        <span className="mt-1 block text-[0.9375rem] leading-relaxed text-slate">{m.text}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-line bg-mist lg:aspect-[4/5]">
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

      <Section tone="mist" labelledBy="team-title" space="loose">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeader id="team-title" kicker={`${nr(1)} / ${team.kicker}`} title={team.title} text={team.text} />
          </div>
          <ul className="grid gap-4 md:grid-cols-3 lg:col-span-8">
            {team.roles.map((role, i) => (
              <li key={role.id} className="flex flex-col rounded-2xl border border-line bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <RoleIcon index={i} />
                  <span aria-hidden className="font-mono text-xs text-blue">
                    {nr(i)}
                  </span>
                </div>
                <h3 className="mt-8 text-lg font-medium leading-snug tracking-[-0.01em] text-night">{role.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-slate">{role.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="arbeitsweise-title" space="loose">
        <SectionHeader id="arbeitsweise-title" kicker={`${nr(2)} / ${approach.kicker}`} title={approach.title} />
        {/* The image takes the height of the steps on wide screens. */}
        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl bg-night lg:col-span-5 lg:aspect-auto lg:min-h-[26rem]">
            <Image
              src={scenes.arbeitsweise}
              alt=""
              fill
              sizes="(min-width: 1024px) 30rem, 92vw"
              placeholder="blur"
              className="object-cover object-[50%_45%]"
            />
          </div>
          <ol className="border-b border-line lg:col-span-7">
            {approach.steps.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-line py-8 md:grid-cols-[3.5rem_10rem_1fr] md:gap-x-6"
              >
                <span aria-hidden className="pt-1 font-mono text-sm text-blue">
                  {nr(i)}
                </span>
                <h3 className="text-h3 text-night">{step.title}</h3>
                <p className="col-start-2 mt-2 leading-relaxed text-slate md:col-start-3 md:mt-0">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id={collaboration.id} tone="night" labelledBy="zusammenarbeit-title" space="loose">
        <SectionHeader
          id="zusammenarbeit-title"
          kicker={`${nr(3)} / ${collaboration.kicker}`}
          title={collaboration.title}
        />
        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {collaboration.models.map((model, i) => {
            const Icon = modelIcons[i];
            return (
              <li
                key={model.title}
                className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon aria-hidden strokeWidth={1.25} className="size-8 text-electric" />
                  <span aria-hidden className="font-mono text-xs text-white/55">
                    {nr(i)}
                  </span>
                </div>
                <h3 className="mt-8 text-h3 text-white">{model.title}</h3>
                <p className="mt-3 leading-relaxed text-white/65">{model.text}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-16 grid gap-6 border-t border-white/[0.08] pt-10 lg:grid-cols-12 lg:gap-16">
          <h3 className="text-h3 text-white lg:col-span-4">{collaboration.termsTitle}</h3>
          <ul className="space-y-3 lg:col-span-8">
            {collaboration.terms.map((t) => (
              <li
                key={t}
                className="relative max-w-3xl pl-6 leading-relaxed text-white/70 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-electric"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy={contact.headingId} space="loose">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Portrait size="lg" caption={false} sizes="(min-width: 640px) 24rem, 90vw" />
          </div>
          <div className="lg:col-span-7">
            <p className="kicker">{`${nr(4)} / ${contact.kicker}`}</p>
            <h2 id={contact.headingId} className="mt-5 scroll-mt-4 text-h2 text-night">
              {site.contact.person}
            </h2>
            <p className="mt-2 text-lead text-slate">{site.contact.title}</p>
            <p className="mt-6 max-w-xl leading-relaxed text-slate">
              Er begleitet Ihr Vorhaben vom ersten Gespräch bis zur Übergabe. {founder.name} arbeitet{" "}
              {founder.experienceLine}. Er ist nach {certificateNames} zertifiziert.
            </p>
            <ul className="mt-10 max-w-xl border-b border-line">
              {certifications.map((c) => (
                <li
                  key={c.id}
                  className="grid gap-1 border-t border-line py-4 sm:grid-cols-[8rem_1fr] sm:gap-x-6"
                >
                  <span className="font-mono text-sm font-medium text-night">{c.short}</span>
                  <span className="text-[0.9375rem] leading-relaxed text-slate">{c.credential}</span>
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
