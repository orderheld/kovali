import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { contactCta } from "@/content/home";

interface CtaLink {
  label: string;
  href: string;
}

interface CtaBandProps {
  title?: string;
  text?: React.ReactNode;
  primary?: CtaLink;
  /** The e-mail address next to the button. */
  showMail?: boolean;
  /** Id of the H2 (the section is labelled by it). Change it if a page has two bands. */
  headingId?: string;
}

/**
 * Closing call to action before the footer: a light grey rounded panel on white, heading and
 * text on the left, the button and the e-mail address on the right from md. No image.
 */
export function CtaBand({
  title = contactCta.title,
  text = contactCta.text,
  primary = contactCta.primary,
  showMail = true,
  headingId = "cta-title",
}: CtaBandProps) {
  const email = site.contact.email.value;
  return (
    <section aria-labelledby={headingId} className="bg-white pb-20 pt-4 md:pb-28">
      <Container>
        <div className="grid gap-x-12 gap-y-10 rounded-[2rem] bg-canvas px-7 py-12 sm:px-12 md:grid-cols-12 md:items-end md:py-16 lg:px-16">
          <div className="md:col-span-7">
            <h2 id={headingId} className="max-w-xl text-h2 text-graphite">
              {title}
            </h2>
            {text ? <div className="mt-5 max-w-lg text-lead text-muted">{text}</div> : null}
          </div>
          <div className="flex flex-col items-start gap-4 md:col-span-5 md:items-end">
            <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
            {showMail ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex min-h-10 items-center text-blue transition-colors hover:text-blue-700 hover:underline hover:underline-offset-4"
              >
                {email}
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
