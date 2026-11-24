import { DarkBackdrop } from "@/components/brand/motifs";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { founder } from "@/content/company";
import { contactCta } from "@/content/home";
import { Portrait } from "./portrait";

interface CtaLink {
  label: string;
  href: string;
}

interface CtaBandProps {
  title?: string;
  text?: React.ReactNode;
  primary?: CtaLink;
  /** Pass null for no secondary button. */
  secondary?: CtaLink | null;
  /** "Oder direkt per E-Mail: info@kovali.ch" below the buttons. */
  showMail?: boolean;
  /** Id of the H2 (the section is labelled by it). Change it if a page has two bands. */
  headingId?: string;
}

/**
 * Closing call to action on near-black ink, flowing into the dark footer: heading, text,
 * buttons (full width below sm) and mail line on the left, Ferhat Demir's signature (round
 * avatar, name, title in mono) on the right, as wide as its content.
 */
export function CtaBand({
  title = contactCta.title,
  text = contactCta.text,
  primary = contactCta.primary,
  secondary = contactCta.secondary,
  showMail = true,
  headingId = "cta-title",
}: CtaBandProps) {
  const email = site.contact.email.value;
  return (
    <section aria-labelledby={headingId} className="on-dark relative isolate overflow-hidden bg-night text-white">
      <DarkBackdrop variant="band" />
      <Container className="relative grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <h2 id={headingId} className="text-h2 font-semibold text-white">
            {title}
          </h2>
          <div className="mt-5 max-w-2xl text-lead text-white/70">{text}</div>
          <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap">
            <ButtonLink href={primary.href} variant="inverse" arrow>
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <ButtonLink href={secondary.href} variant="outline-inverse">
                {secondary.label}
              </ButtonLink>
            ) : null}
          </div>
          {showMail ? (
            <p className="mt-7 text-white/70">
              Oder direkt per E-Mail:{" "}
              <a
                href={`mailto:${email}`}
                className="text-electric underline decoration-electric/40 underline-offset-[3px] transition-colors hover:decoration-electric"
              >
                {email}
              </a>
            </p>
          ) : null}
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
          <div className="flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 pr-6 backdrop-blur-sm">
            <Portrait size="md" />
            <p className="min-w-0 font-mono text-xs uppercase leading-5 tracking-[0.08em]">
              <span className="block font-medium text-white">{founder.name}</span>
              <span className="block text-sky">{founder.role}</span>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
