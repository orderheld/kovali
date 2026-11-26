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
          Prozessschritt «Antrag zurückweisen»
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

/**
 * A small BPMN process: the application is checked, a gateway asks whether it is complete;
 * yes leads on to processing, no to the rejection step of the user story (blue).
 */
export function ProcessCard({ className, title = "Prozess «Antragseingang» · BPMN 2.0" }: { className?: string; title?: string }) {
  const line = "#86868b";
  const label = { fontSize: 11, fill: "#6a6a6f" } as const;
  const taskText = { fontSize: 12, fill: "#1d1d1f", textAnchor: "middle" } as const;
  return (
    <ExampleCard label={title} className={className}>
      {/* Drawn at 268 units for a card of about 250 to 320 px, so the labels stay at 11 px or more. */}
      <svg viewBox="0 0 268 122" className="mx-auto h-auto w-full max-w-[20rem]" fontFamily="inherit">
        <defs>
          <marker id="pfeil" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 8 4 0 8z" fill={line} />
          </marker>
        </defs>
        <g stroke={line} strokeWidth="1.25" fill="none">
          <path d="M20 34h10" markerEnd="url(#pfeil)" />
          <path d="M104 34h10" markerEnd="url(#pfeil)" />
          <path d="M144 34h16" markerEnd="url(#pfeil)" />
          <path d="M236 34h8" markerEnd="url(#pfeil)" />
          <path d="M130 48v28" markerEnd="url(#pfeil)" />
          <path d="M174 97h70" markerEnd="url(#pfeil)" />
        </g>
        {/* Start event */}
        <circle cx="11" cy="34" r="9" fill="#fff" stroke={line} strokeWidth="1.25" />
        {/* Antrag prüfen */}
        <rect x="32" y="15" width="72" height="38" rx="8" fill="#fff" stroke={line} strokeWidth="1.25" />
        <text x="68" y="31" {...taskText}>
          Antrag
        </text>
        <text x="68" y="45" {...taskText}>
          prüfen
        </text>
        {/* Gateway */}
        <path d="M130 20 144 34 130 48 116 34z" fill="#fff" stroke={line} strokeWidth="1.25" />
        <text x="130" y="11" textAnchor="middle" {...label}>
          vollständig?
        </text>
        <text x="148" y="28" {...label}>
          ja
        </text>
        <text x="136" y="67" {...label}>
          nein
        </text>
        {/* Antrag bearbeiten */}
        <rect x="162" y="15" width="74" height="38" rx="8" fill="#fff" stroke={line} strokeWidth="1.25" />
        <text x="199" y="31" {...taskText}>
          Antrag
        </text>
        <text x="199" y="45" {...taskText}>
          bearbeiten
        </text>
        {/* Antrag zurückweisen: the step of the user story */}
        <rect x="86" y="78" width="88" height="38" rx="8" fill="#145bce" fillOpacity="0.08" stroke="#145bce" strokeWidth="1.5" />
        <text x="130" y="94" {...taskText} fill="#145bce" fontWeight="600">
          Antrag
        </text>
        <text x="130" y="108" {...taskText} fill="#145bce" fontWeight="600">
          zurückweisen
        </text>
        {/* End events */}
        <circle cx="255" cy="34" r="9" fill="#fff" stroke="#1d1d1f" strokeWidth="2.5" />
        <circle cx="255" cy="97" r="9" fill="#fff" stroke="#1d1d1f" strokeWidth="2.5" />
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
        <CheckRow>Antrag im Status «Neu»: Zurückweisen gesperrt</CheckRow>
        <CheckRow>Ohne Begründung: Meldung «Pflichtfeld»</CheckRow>
        <CheckRow>Antrag 4711 mit Begründung zurückweisen, E-Mail erhalten</CheckRow>
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
            <dt className="flex items-center gap-2 text-muted">
              <span aria-hidden className={cn("size-2 rounded-full", s.bar)} />
              {s.label}
            </dt>
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
            <dt className="text-[0.75rem] text-muted">{label}</dt>
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
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_1.1fr_1fr]">
        <ProcessCard className="hidden lg:block lg:translate-y-8" title="Prozess · BPMN 2.0" />
        <UserStoryCard className="mx-auto w-full max-w-md lg:max-w-none" />
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
