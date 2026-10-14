import type { EducationEntry, ExperienceEntry, LanguageSkill } from "@/lib/admin/db/schema";
import { formatDate, formatMonthRange } from "@/lib/admin/format";
import { labelOf, remoteOptions } from "@/lib/admin/options";
import {
  disciplineLabels,
  formatFirmAddress,
  formatRate,
  formatWorkload,
  languageLevelLabel,
  type FirmSource,
  type PortalCard,
  type SectionValues,
} from "@/lib/portal/profile";
import { Chips, Facts } from "./ui";

/**
 * Read-only view of a profile card's values (confirmed or pending), shared by the portal's
 * profile page and the overview. Server component, no state.
 */

function Empty({ children = "Noch keine Angaben." }: { children?: React.ReactNode }) {
  return <p className="text-[0.9375rem] text-slate">{children}</p>;
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[0.8125rem] font-medium text-slate">{label}</h3>
      {children}
    </div>
  );
}

export function CardValuesView({ card, values }: { card: PortalCard; values: Record<string, unknown> }) {
  switch (card) {
    case "profil": {
      const v = values as SectionValues["profil"];
      if (!v.headline && !v.summary) return <Empty />;
      return (
        <div className="space-y-2">
          {v.headline ? <p className="text-[1.0625rem] font-semibold text-ink">{v.headline}</p> : null}
          {v.summary ? <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink/90">{v.summary}</p> : null}
        </div>
      );
    }
    case "firma": {
      const firm = values.firm as FirmSource | null;
      if (!firm) return <Empty>Noch keine Firma erfasst.</Empty>;
      return (
        <Facts
          items={[
            { label: "Firma", value: firm.name },
            { label: "Rechtsform", value: firm.legalForm },
            { label: "UID", value: firm.uid },
            { label: "Adresse", value: formatFirmAddress(firm) },
          ]}
        />
      );
    }
    case "kompetenzen": {
      const v = values as SectionValues["kompetenzen"];
      if (!v.disciplines?.length && !v.skills?.length && !v.sapModules?.length && !v.certifications?.length) return <Empty />;
      return (
        <div className="space-y-4">
          <Block label="Schwerpunkte">
            <Chips items={disciplineLabels(v.disciplines ?? [])} tone="blue" />
          </Block>
          <Block label="Kompetenzen und Tools">
            <Chips items={v.skills ?? []} />
          </Block>
          {v.sapModules?.length ? (
            <Block label="SAP-Module">
              <Chips items={v.sapModules} />
            </Block>
          ) : null}
          <Block label="Zertifikate">
            {v.certifications?.length ? (
              <ul className="list-disc space-y-0.5 pl-5 text-[0.9375rem] text-ink">
                {v.certifications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <span className="text-slate">–</span>
            )}
          </Block>
        </div>
      );
    }
    case "werdegang": {
      const list = (values.experience ?? []) as ExperienceEntry[];
      if (!list.length) return <Empty />;
      return (
        <ol className="relative space-y-5 border-l border-line pl-5">
          {list.map((e, i) => (
            <li key={`${e.role}-${e.from}-${i}`} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[1.5625rem] size-2.5 rounded-full border-2 border-white bg-blue ring-1 ring-blue/30" />
              <p className="text-[0.8125rem] font-medium text-slate">{formatMonthRange(e.from, e.to)}</p>
              <p className="mt-0.5 font-semibold text-ink">{e.role}</p>
              {e.client || e.industry ? <p className="text-sm text-slate">{[e.client, e.industry].filter(Boolean).join(" · ")}</p> : null}
              {e.description ? <p className="mt-1.5 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink/90">{e.description}</p> : null}
              {e.technologies?.length ? (
                <div className="mt-2">
                  <Chips items={e.technologies} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      );
    }
    case "ausbildung": {
      const list = (values.education ?? []) as EducationEntry[];
      if (!list.length) return <Empty />;
      return (
        <ul className="divide-y divide-line">
          {list.map((e, i) => (
            <li key={`${e.title}-${i}`} className="py-2.5 first:pt-0 last:pb-0">
              <p className="font-medium text-ink">{e.title}</p>
              {e.institution || e.year ? <p className="text-sm text-slate">{[e.institution, e.year].filter(Boolean).join(", ")}</p> : null}
            </li>
          ))}
        </ul>
      );
    }
    case "sprachen": {
      const list = (values.languages ?? []) as LanguageSkill[];
      if (!list.length) return <Empty />;
      return (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((l) => (
            <li key={l.language} className="flex items-baseline justify-between gap-3 rounded-md bg-mist px-3 py-2">
              <span className="font-medium text-ink">{l.language}</span>
              <span className="text-right text-sm text-slate">{languageLevelLabel(l.level)}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "verfuegbarkeit": {
      const v = values as SectionValues["verfuegbarkeit"];
      return (
        <Facts
          items={[
            { label: "Verfügbar ab", value: v.availableFrom ? formatDate(v.availableFrom) : "–" },
            { label: "Pensum", value: formatWorkload(v.workloadMin, v.workloadMax) },
            { label: "Satzvorstellung (Ihre Firma an KOVALI, exkl. MWST)", value: formatRate(v.rateAmount, v.rateUnit) },
            { label: "Arbeitsmodell", value: labelOf(remoteOptions, v.remote) },
            { label: "Regionen", value: v.regions },
            { label: "Kündigungsfrist", value: v.noticePeriod },
          ]}
        />
      );
    }
  }
}
