import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, type SectionTone } from "@/components/ui/section";
import { founder } from "@/content/company";
import { cn } from "@/lib/utils";
import { Certifications } from "./certifications";
import { Portrait } from "./portrait";

interface PersonLink {
  label: string;
  href: string;
}

const compactLinks: PersonLink[] = [
  { label: "Mehr unter Warum KOVALI", href: "/warum-kovali#geschaeftsleitung" },
  { label: "Branchen im Detail", href: "/branchen" },
];

/** "10+" → "10" with a raised blue "+". The plus stays real text. */
function Figure({ value }: { value: string }) {
  const plus = value.endsWith("+");
  return (
    <>
      {plus ? value.slice(0, -1) : value}
      {plus ? <span className="ml-0.5 align-[0.95em] text-[0.45em] text-blue">+</span> : null}
    </>
  );
}

/**
 * Ferhat Demir with portrait, years of experience (always captioned as his personal
 * experience) and certificates. `compact` on the home page, `full` on Warum KOVALI with a
 * fact list and the certificate rows. Every text has a default from `founder` (company.ts).
 */
export function PersonBlock({
  variant = "compact",
  id,
  headingId,
  label = "Geschäftsleitung",
  title = `${founder.name}, ${founder.role}`,
  paragraphs,
  credentials,
  links,
  certificatesTitle = `Zertifikate von ${founder.name}`,
  tone = "white",
  rule = false,
  className,
}: {
  variant?: "compact" | "full";
  /** Section id, e.g. "ferhat-demir" (home) or "geschaeftsleitung" (Warum KOVALI). */
  id?: string;
  /** Id of the H2, e.g. "ferhat-demir" on Warum KOVALI. Defaults to `${id}-title`. */
  headingId?: string;
  label?: string;
  title?: string;
  /** compact: [founder.intro]; full: founder.summary. */
  paragraphs?: readonly string[];
  /** Line below the figures. compact: founder.credentialsLine; full: none (certificate rows follow). Pass null to hide. */
  credentials?: React.ReactNode | null;
  /** compact: Warum KOVALI and Branchen; full: none. */
  links?: readonly PersonLink[];
  /** full only: h3 above the certificate rows. */
  certificatesTitle?: string;
  tone?: SectionTone;
  rule?: boolean;
  className?: string;
}) {
  const full = variant === "full";
  const h2Id = headingId ?? `${id ?? "person"}-title`;
  const texts = paragraphs ?? (full ? founder.summary : [founder.intro]);
  const credentialLine = credentials === undefined ? (full ? null : founder.credentialsLine) : credentials;
  const linkList = links ?? (full ? [] : compactLinks);

  return (
    <Section id={id} tone={tone} rule={rule} space="loose" labelledBy={h2Id} className={cn("scroll-mt-20", className)}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="hidden lg:sticky lg:top-28 lg:col-span-5 lg:block">
          <Portrait size="lg" />
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex items-center gap-5 lg:block">
            <Portrait size="sm" className="lg:hidden" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue">{label}</p>
              <h2 id={h2Id} className="mt-3 scroll-mt-28 text-h2 font-medium">
                {title}
              </h2>
            </div>
          </div>

          <div className="mt-5 max-w-[34rem] space-y-4 text-lg leading-relaxed text-slate">
            {texts.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-7">
            {founder.experience.map((e) => (
              <div key={e.label} className="flex flex-col">
                <dt className="order-2 mt-3 max-w-56 hyphens-auto text-[0.9375rem] leading-snug text-slate">{e.label}</dt>
                <dd className="order-1 font-display text-numeral font-light lining-nums tabular-nums text-navy">
                  <Figure value={e.value} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.8125rem] text-slate">{founder.experienceNote}</p>

          {credentialLine ? <p className="mt-6 max-w-[34rem] leading-relaxed text-slate">{credentialLine}</p> : null}

          {linkList.length ? (
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {linkList.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group inline-flex items-center gap-2 font-medium text-blue hover:text-blue-700">
                    {l.label}
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {full ? (
        <>
          <dl className="mt-14 grid gap-6 border-t border-line pt-8 md:grid-cols-3">
            {founder.facts.map((f) => (
              <div key={f.label}>
                <dt className="text-sm font-medium text-ink">{f.label}</dt>
                <dd className="mt-1.5 text-slate">{f.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-14 text-h3 font-semibold">{certificatesTitle}</h3>
          <Certifications className="mt-6" />
        </>
      ) : null}
    </Section>
  );
}
