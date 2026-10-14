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
      {plus ? <span className="ml-1 align-[0.85em] text-[0.42em] font-medium text-blue">+</span> : null}
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
      <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-28 lg:col-span-5">
          <Portrait size="lg" className="max-w-[24rem] sm:max-w-[26rem] lg:max-w-[28rem]" />
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:pt-4">
          <p className="eyebrow">{label}</p>
          <h2 id={h2Id} className="mt-5 scroll-mt-28 text-h2 font-semibold text-ink">
            {title}
          </h2>

          <div className="mt-6 max-w-[34rem] space-y-4 text-lg leading-relaxed text-slate">
            {texts.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-8">
            {founder.experience.map((e) => (
              <div key={e.label} className="relative flex flex-col">
                <span aria-hidden className="absolute -top-[2.0625rem] left-0 h-0.5 w-10 bg-blue" />
                <dt className="order-2 mt-3 max-w-56 hyphens-auto text-[0.9375rem] leading-snug text-slate">{e.label}</dt>
                <dd className="order-1 text-numeral font-semibold lining-nums tabular-nums text-ink">
                  <Figure value={e.value} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-mono text-[0.75rem] leading-relaxed text-slate">{founder.experienceNote}</p>

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
          <dl className="mt-16 grid gap-x-8 gap-y-6 border-t border-line pt-8 md:grid-cols-3">
            {founder.facts.map((f) => (
              <div key={f.label}>
                <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-blue">{f.label}</dt>
                <dd className="mt-2 leading-relaxed text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-16 text-h3 font-semibold">{certificatesTitle}</h3>
          <Certifications className="mt-6" />
        </>
      ) : null}
    </Section>
  );
}
