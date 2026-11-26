import { Check, GitBranch, ListChecks } from "lucide-react";
import type { ServiceSlug } from "@/content/types";
import { cn } from "@/lib/utils";
import { ExampleCard, ExampleFigure, Pill } from "./example-frame";

/*
 * Example artefacts with made-up content (a fictitious application process), always shown
 * with a "Beispiel" caption. Identifiers such as ANF-142 or TF-311 follow no product's scheme.
 */

const small = "text-[0.8125rem] leading-snug";

function CheckRow({ children, done = true }: { children: React.ReactNode; done?: boolean }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          "mt-px grid size-[1.125rem] shrink-0 place-items-center rounded-full",
          done ? "bg-pass text-white" : "border border-hairline text-transparent",
        )}
      >
        <Check strokeWidth={3} className="size-2.5" />
      </span>
      <span>{children}</span>
    </li>
  );
}

/** A user story with acceptance criteria, linked to a process step and a test case. */
export function UserStoryCard({ className }: { className?: string }) {
  return (
    <ExampleCard label="User Story · ANF-142" meta={<Pill tone="blue">Bereit</Pill>} className={className}>
      <p className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-graphite">
        Unvollständigen Antrag mit Begründung zurückweisen
      </p>
      <p className={cn(small, "mt-2 text-muted")}>
        Als Sachbearbeiterin möchte ich einen unvollständigen Antrag zurückweisen, damit die antragstellende Person
        weiss, was fehlt.
      </p>
      <p className="mt-5 text-[0.75rem] font-semibold text-graphite">Akzeptanzkriterien</p>
      <ul className={cn(small, "mt-2.5 space-y-2 text-graphite")}>
        <CheckRow>Zurückweisen ist nur im Status «In Prüfung» möglich.</CheckRow>
        <CheckRow>Die Begründung ist ein Pflichtfeld.</CheckRow>
        <CheckRow>Die antragstellende Person erhält die Begründung per E-Mail.</CheckRow>
      </ul>
      <div className={cn(small, "mt-5 grid gap-2 border-t border-hairline/70 pt-4 text-muted")}>
        <p className="flex items-center gap-2">
          <GitBranch strokeWidth={1.75} className="size-3.5 text-muted" />
          Prozessschritt «Antrag prüfen»
        </p>
        <p className="flex items-center gap-2">
          <ListChecks strokeWidth={1.75} className="size-3.5 text-muted" />
          Testfall TF-311
          <span className="ml-auto">
            <Pill tone="green">Bestanden</Pill>
          </span>
        </p>
      </div>
    </ExampleCard>
  );
}

/** A small BPMN process: start, two tasks, a gateway, end. The current step is blue. */
export function ProcessCard({ className, title = "Prozess «Antrag bearbeiten» · BPMN 2.0" }: { className?: string; title?: string }) {
  const task = "fill-white stroke-[#86868b]";
  return (
    <ExampleCard label={title} className={className}>
      <svg viewBox="0 0 330 132" className="h-auto w-full" fontFamily="inherit">
        <defs>
          <marker id="pfeil" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 8 4 0 8z" fill="#86868b" />
          </marker>
        </defs>
        <g stroke="#86868b" strokeWidth="1.25" fill="none">
          <path d="M28 54h16" markerEnd="url(#pfeil)" />
          <path d="M124 54h12" markerEnd="url(#pfeil)" />
          <path d="M168 54h14" markerEnd="url(#pfeil)" />
          <path d="M262 54h22" markerEnd="url(#pfeil)" />
          <path d="M152 70v34h-62V76" markerEnd="url(#pfeil)" />
        </g>
        <circle cx="16" cy="54" r="11" className="fill-white" stroke="#86868b" strokeWidth="1.25" />
        <rect x="46" y="34" width="78" height="40" rx="8" className={task} strokeWidth="1.25" />
        <text x="85" y="51" textAnchor="middle" fontSize="10" fill="#1d1d1f">
          Antrag
        </text>
        <text x="85" y="64" textAnchor="middle" fontSize="10" fill="#1d1d1f">
          erfassen
        </text>
        <path d="M152 38 168 54 152 70 136 54z" className="fill-white" stroke="#86868b" strokeWidth="1.25" />
        <text x="152" y="27" textAnchor="middle" fontSize="9" fill="#6e6e73">
          vollständig?
        </text>
        <text x="158" y="118" fontSize="9" fill="#6e6e73">
          nein
        </text>
        <text x="171" y="48" fontSize="9" fill="#6e6e73">
          ja
        </text>
        <rect x="184" y="34" width="78" height="40" rx="8" fill="#145bce" fillOpacity="0.08" stroke="#145bce" strokeWidth="1.5" />
        <text x="223" y="51" textAnchor="middle" fontSize="10" fill="#145bce" fontWeight="600">
          Antrag
        </text>
        <text x="223" y="64" textAnchor="middle" fontSize="10" fill="#145bce" fontWeight="600">
          prüfen
        </text>
        <circle cx="300" cy="54" r="11" className="fill-white" stroke="#1d1d1f" strokeWidth="3" />
      </svg>
    </ExampleCard>
  );
}

/** A test case with steps, a SQL check and its result. */
export function TestCaseCard({ className, sql = true }: { className?: string; sql?: boolean }) {
  return (
    <ExampleCard label="Testfall · TF-311" meta={<Pill tone="green">Bestanden</Pill>} className={className}>
      <p className="text-[0.9375rem] font-semibold leading-snug text-graphite">Antrag zurückweisen</p>
      <p className={cn(small, "mt-1 text-muted")}>Prüft ANF-142, Kriterien 1 bis 3</p>
      <ol className={cn(small, "mt-4 space-y-2 text-graphite")}>
        <CheckRow>Antrag 4711 im Status «In Prüfung» öffnen</CheckRow>
        <CheckRow>Zurückweisen mit Begründung</CheckRow>
        <CheckRow>Status in der Datenbank prüfen</CheckRow>
      </ol>
      {sql ? (
        <div className="mt-4 rounded-lg bg-canvas px-3.5 py-3 font-mono text-[0.75rem] leading-relaxed text-graphite">
          <p>
            <span className="text-blue">SELECT</span> status <span className="text-blue">FROM</span> antrag
          </p>
          <p>
            <span className="text-blue">WHERE</span> id = 4711;
          </p>
          <p className="mt-1.5 text-pass">→ ZURUECKGEWIESEN</p>
        </div>
      ) : null}
    </ExampleCard>
  );
}

const runSegments = [
  { label: "Bestanden", value: 182, bar: "bg-pass" },
  { label: "Fehlgeschlagen", value: 6, bar: "bg-fail" },
  { label: "Blockiert", value: 2, bar: "bg-open" },
  { label: "Offen", value: 24, bar: "bg-hairline" },
];

/** A test run overview with results, open defects by severity and the release criterion. */
export function TestRunCard({ className }: { className?: string }) {
  const total = runSegments.reduce((n, s) => n + s.value, 0);
  return (
    <ExampleCard label="Testlauf · Release 3.2" meta={<Pill>Tag 6 von 10</Pill>} className={className}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-canvas">
        {runSegments.map((s) => (
          <span key={s.label} className={s.bar} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <dl className={cn(small, "mt-4 grid grid-cols-2 gap-x-6 gap-y-2")}>
        {runSegments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", s.bar)} />
            <dt className="text-muted">{s.label}</dt>
            <dd className="ml-auto font-medium tabular-nums text-graphite">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 border-t border-hairline/70 pt-4 text-[0.75rem] font-semibold text-graphite">Offene Fehler nach Schwere</p>
      <dl className={cn(small, "mt-2.5 grid grid-cols-4 gap-2 text-center")}>
        {[
          ["Kritisch", 0],
          ["Hoch", 2],
          ["Mittel", 5],
          ["Tief", 9],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse rounded-lg bg-canvas px-1 py-2">
            <dt className="text-[0.6875rem] text-muted">{label}</dt>
            <dd className="text-[1.0625rem] font-semibold tabular-nums text-graphite">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className={cn(small, "mt-4 text-graphite")}>
        <CheckRow>Abnahmekriterium: keine kritischen Fehler offen</CheckRow>
      </ul>
    </ExampleCard>
  );
}

/** A change request with impact analysis and the planned release. */
export function ChangeRequestCard({ className }: { className?: string }) {
  const rows = [
    ["Anliegen", "Neues Pflichtfeld «Zustellart» im Antrag"],
    ["Betroffen", "Antragsformular, Schnittstelle Druck, zwei Berichte"],
    ["Bewertung", "Nutzen hoch, Aufwand mittel"],
    ["Geplant", "Release 3.3"],
  ];
  return (
    <ExampleCard label="Change Request · CR-58" meta={<Pill tone="blue">Freigegeben</Pill>} className={className}>
      <dl className={cn(small, "divide-y divide-hairline/70")}>
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-[6rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-muted">{term}</dt>
            <dd className="text-graphite">{value}</dd>
          </div>
        ))}
      </dl>
    </ExampleCard>
  );
}

/**
 * The home page visual: the user story in front, the process step and the test case beside it
 * from lg (one story, from requirement to test). Small screens show the story only.
 */
export function TraceabilityExample({ className }: { className?: string }) {
  return (
    <ExampleFigure
      className={className}
      captionClassName="text-center"
      caption="Beispiel: eine User Story mit Akzeptanzkriterien, verknüpft mit dem Prozessschritt und dem Testfall, der sie prüft."
    >
      <div className="relative mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1.15fr_1fr]">
        <ProcessCard className="hidden lg:block lg:translate-y-8" title="Prozess · BPMN 2.0" />
        <UserStoryCard className="mx-auto w-full max-w-md" />
        <TestCaseCard className="hidden lg:block lg:translate-y-8" />
      </div>
    </ExampleFigure>
  );
}

/** One example per discipline, for the page header of its page. */
export function ServiceExample({ slug, className }: { slug: ServiceSlug; className?: string }) {
  const examples: Record<ServiceSlug, { caption: string; card: React.ReactNode }> = {
    "business-analysis": {
      caption: "Beispiel: Prozessmodell in BPMN und die User Story zum markierten Schritt.",
      card: (
        <div className="grid gap-5">
          <ProcessCard />
          <UserStoryCard className="sm:ml-10" />
        </div>
      ),
    },
    "test-management": {
      caption: "Beispiel: Stand eines Testlaufs mit offenen Fehlern und Abnahmekriterium.",
      card: <TestRunCard />,
    },
    "test-engineering": {
      caption: "Beispiel: Testfall mit Schritten und Prüfung des Ergebnisses per SQL.",
      card: <TestCaseCard />,
    },
    "application-management": {
      caption: "Beispiel: bewerteter Change Request mit geplantem Release.",
      card: <ChangeRequestCard />,
    },
  };
  const { caption, card } = examples[slug];
  return (
    <ExampleFigure caption={caption} className={cn("mx-auto w-full max-w-md", className)}>
      {card}
    </ExampleFigure>
  );
}
