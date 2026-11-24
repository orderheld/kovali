import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { contactCta } from "@/content/home";
import { scenes } from "@/content/scenes";

interface CtaLink {
  label: string;
  href: string;
}

interface CtaBandProps {
  title?: string;
  text?: React.ReactNode;
  primary?: CtaLink;
  /** "Oder per E-Mail an info@kovali.ch" below the button. */
  showMail?: boolean;
  /** Id of the H2 (the section is labelled by it). Change it if a page has two bands. */
  headingId?: string;
}

/**
 * Closing call to action before the footer: a wide panorama with a centred heading, a short
 * text, one button and the e-mail address.
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
    <section aria-labelledby={headingId} className="on-dark relative isolate overflow-hidden bg-night text-white">
      <Image
        src={scenes.cta}
        alt=""
        fill
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-[50%_70%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(2_5_12/0.55),rgb(2_5_12/0.25)_55%,rgb(2_5_12/0.55))]" />
      <Container className="flex flex-col items-center py-24 text-center md:py-32">
        <h2 id={headingId} className="max-w-3xl text-h2 text-white">
          {title}
        </h2>
        {text ? <div className="mt-5 max-w-2xl text-lead text-white/80">{text}</div> : null}
        <ButtonLink href={primary.href} variant="accent" className="mt-10">
          {primary.label}
        </ButtonLink>
        {showMail ? (
          <p className="mt-6 text-white/75">
            Oder per E-Mail an{" "}
            <a
              href={`mailto:${email}`}
              className="text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
            >
              {email}
            </a>
          </p>
        ) : null}
      </Container>
    </section>
  );
}
