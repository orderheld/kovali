import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, ShieldAlert } from "lucide-react";
import { Notice } from "@/components/admin/ui";
import { SENSITIVE_DATA_HINT } from "@/components/portal/constants";
import { CardForm } from "@/components/portal/profile-forms";
import { PortalHeading } from "@/components/portal/ui";
import { skillGroups, skillSuggestions } from "@/lib/admin/skills";
import { sectionState } from "@/lib/portal/change-requests";
import { cardSection, cardTitles, cardValues, isPortalCard, type PortalCard } from "@/lib/portal/profile";
import { requireCandidate } from "@/lib/portal/session";
import { saveCard } from "../../actions";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/portal/profil/[bereich]">): Promise<Metadata> {
  const { bereich } = await params;
  return { title: isPortalCard(bereich) ? `${cardTitles[bereich]} bearbeiten` : "Profil" };
}

const intros: Record<PortalCard, string> = {
  profil: "Ein kurzer Überblick, mit dem KOVALI Sie Auftraggebern vorstellt.",
  firma: "Ihre GmbH oder AG, über die Sie als Subunternehmen von KOVALI in Projekten arbeiten.",
  kompetenzen: "Schwerpunkte, Methoden, Tools und Zertifikate.",
  werdegang: "Ihre Projekte und Stellen, die für Projektmandate relevant sind.",
  ausbildung: "Abschlüsse und Weiterbildungen.",
  sprachen: "Sprachen und Niveau.",
  verfuegbarkeit: "Ab wann, in welchem Pensum und zu welchem Satz Sie für Projekte zur Verfügung stehen.",
};

// SAP modules are suggested from the SAP group of the skill dictionary.
const sapSuggestions = skillSuggestions.filter((s) => skillGroups[s] === "SAP");

export default async function EditCardPage({ params }: PageProps<"/portal/profil/[bereich]">) {
  const session = await requireCandidate();
  const { bereich } = await params;
  if (!isPortalCard(bereich)) notFound();
  const state = await sectionState(session.candidateId, cardSection(bereich));
  if (!state) notFound();
  const values = cardValues(bereich, (state.pending ?? state.current) as Record<string, unknown>);
  const pending = state.openId !== null && state.pending !== null;

  return (
    <div className="mx-auto max-w-3xl">
      <PortalHeading title={cardTitles[bereich]} description={intros[bereich]} back={{ href: `/portal/profil#${bereich}`, label: "Zurück zum Profil" }} />
      <div className="space-y-4">
        {pending ? (
          <Notice tone="amber" icon={Clock}>
            Sie bearbeiten Ihre noch nicht bestätigte Änderung. Beim Senden ersetzt sie den bisherigen Vorschlag.
          </Notice>
        ) : null}
        {bereich !== "firma" && bereich !== "sprachen" ? (
          <Notice tone="neutral" icon={ShieldAlert}>
            {SENSITIVE_DATA_HINT}
          </Notice>
        ) : null}
        <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:p-6">
          <CardForm
            card={bereich}
            values={values}
            message={state.message}
            action={saveCard.bind(null, bereich)}
            cancelHref={`/portal/profil#${bereich}`}
            suggestions={{ skills: bereich === "kompetenzen" ? skillSuggestions : [], sap: bereich === "kompetenzen" ? sapSuggestions : [] }}
          />
        </div>
        <p className="px-1 text-[0.8125rem] text-slate">
          Ihre Angaben gelten als «Nicht bestätigt», bis KOVALI sie geprüft hat. Bis dahin bleiben die bisher bestätigten Angaben massgebend.
        </p>
      </div>
    </div>
  );
}
