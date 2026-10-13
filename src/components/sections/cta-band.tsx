import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { contactCta } from "@/content/home";
import { DiagonalAccent } from "./page-hero";

interface CtaBandProps {
  title?: string;
  text?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string } | null;
}

export function CtaBand({
  title = contactCta.title,
  text = contactCta.text,
  primary = contactCta.primary,
  secondary = contactCta.secondary,
}: CtaBandProps) {
  return (
    <section aria-labelledby="cta-title" className="on-dark relative overflow-hidden bg-navy text-white">
      <div aria-hidden className="grid-lines absolute inset-0 opacity-[0.07] [--grid-color:#ffffff]" />
      <DiagonalAccent tone="dark" className="absolute -right-6 top-0 h-full opacity-90" />
      <Container className="relative py-20 md:py-24">
        <div className="max-w-2xl">
          <h2 id="cta-title" className="text-h2 font-semibold">
            {title}
          </h2>
          <p className="mt-5 text-lead text-white/75">{text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={primary.href} variant="inverse" arrow>
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <ButtonLink href={secondary.href} variant="outline-inverse">
                {secondary.label}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
