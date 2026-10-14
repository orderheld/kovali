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
 * Closing call to action as a paper "letter": heading, text, buttons and mail line on the
 * left, Ferhat Demir's signature (portrait tile, name, title) on the right.
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
    <section aria-labelledby={headingId} className="border-t border-paper-line bg-paper">
      <Container className="grid gap-10 py-20 md:py-28 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="lg:col-span-7">
          <h2 id={headingId} className="text-h2 font-medium text-ink">
            {title}
          </h2>
          <div className="mt-5 max-w-2xl text-lead text-slate">{text}</div>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={primary.href} arrow>
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <ButtonLink href={secondary.href} variant="secondary" className="border-field bg-transparent">
                {secondary.label}
              </ButtonLink>
            ) : null}
          </div>
          {showMail ? (
            <p className="mt-6 text-slate">
              Oder direkt per E-Mail:{" "}
              <a href={`mailto:${email}`} className="text-blue underline underline-offset-[3px] hover:text-blue-700">
                {email}
              </a>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4 lg:col-span-4 lg:col-start-9">
          <Portrait size="sm" />
          <p className="text-[0.9375rem] leading-snug text-slate">
            <span className="block font-semibold text-ink">{founder.name}</span>
            {founder.role}
          </p>
        </div>
      </Container>
    </section>
  );
}
