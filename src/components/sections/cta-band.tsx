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
 * Closing call to action before the footer: a dark rounded panel on white, text and button
 * on the left, a 3D image on the right that fades into the panel.
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
    <section aria-labelledby={headingId} className="bg-white py-16 md:py-24">
      <Container>
        <div className="on-dark relative isolate overflow-hidden rounded-3xl bg-night text-white">
          <div aria-hidden className="absolute inset-y-0 right-0 -z-20 w-full md:w-[62%]">
            <Image
              src={scenes.cta}
              alt=""
              fill
              sizes="(min-width: 768px) 46rem, 100vw"
              placeholder="blur"
              className="object-cover object-right"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(6_11_24/0.6)_0%,rgb(6_11_24/0.92)_70%)] md:bg-[linear-gradient(90deg,var(--color-night)_0%,rgb(6_11_24/0.9)_40%,rgb(6_11_24/0.2)_80%)]"
          />
          <div className="px-7 py-14 sm:px-12 md:py-20 lg:px-16">
            <h2 id={headingId} className="max-w-xl text-h2 text-white">
              {title}
            </h2>
            {text ? <div className="mt-5 max-w-lg text-lead text-white/75">{text}</div> : null}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <ButtonLink href={primary.href} variant="light">
                {primary.label}
              </ButtonLink>
              {showMail ? (
                <a
                  href={`mailto:${email}`}
                  className="text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                >
                  {email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
