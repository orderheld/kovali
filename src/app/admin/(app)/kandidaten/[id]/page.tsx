import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  FileDown,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, EmptyState, LinkButton, Mono, Notice, PageHeader, TagList } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCandidate, listCandidateSubmissions, matchingMandatesFor } from "@/lib/admin/data/candidates";
import { companyOptions, getCompany } from "@/lib/admin/data/companies";
import type { EducationEntry, ExperienceEntry, LanguageSkill } from "@/lib/admin/db/schema";
import { availabilityText, dossierHref, formatRate, formatWorkload, languageLine, sortExperience } from "@/lib/admin/dossier";
import { PortalAccountCard } from "@/app/admin/(app)/portal/account-card";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatChf, formatDate, formatMonthRange, todayIso } from "@/lib/admin/format";
import {
  candidateSources,
  candidateStatuses,
  consentMethods,
  disciplines,
  engagements,
  labelOf,
  profileVariants,
  remoteOptions,
  seniorities,
  submissionStatuses,
  toneOf,
  workPermits,
} from "@/lib/admin/options";
import type { Tone } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { adoptDetectedSkills, liftCandidateObjection, linkOwnFirm, recordCandidateObjection, unlinkOwnFirm } from "../actions";
import { ageOn, isCapitalCompany, retentionState } from "../rules";
import { DetectedSkills } from "./detected-skills";
import { DossierMenu } from "./dossier-menu";
import { LiftObjectionForm, ObjectionForm } from "./objection-forms";
import { OwnFirmForm } from "./own-firm-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

const detailsClass = "rounded-md border border-line bg-white [&[open]>summary]:border-b [&[open]>summary]:border-line";
const summaryClass =
  "cursor-pointer list-none rounded-md px-3 py-2 text-[0.8125rem] font-medium text-blue select-none hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden";

export async function generateMetadata({ params }: PageProps<"/admin/kandidaten/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.candidate(id) : "Kandidat" };
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function scoreTone(score: number): Tone {
  return score >= 75 ? "green" : score >= 50 ? "blue" : "neutral";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} von 5`} className="tracking-wider text-amber-500">
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default async function CandidatePage({ params }: PageProps<"/admin/kandidaten/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const c = await getCandidate(id);
  if (!c) notFound();

  const today = todayIso();
  const [proposals, matches, company, firmChoices] = await Promise.all([
    listCandidateSubmissions(id),
    matchingMandatesFor(c, today, 5),
    c.companyId ? getCompany(c.companyId) : null,
    c.companyId ? [] : companyOptions(["subunternehmer"]),
  ]);
  const owner = { type: "candidate" as const, id };
  const no = displayNo.candidate(id);
  const name = `${c.firstName} ${c.lastName}`;

  const languages = list<LanguageSkill>(c.languages).filter((l) => l?.language);
  const experience = sortExperience(list<ExperienceEntry>(c.experience).filter((e) => e?.role));
  const education = list<EducationEntry>(c.education).filter((e) => e?.title);
  const inProfile = new Set([...c.skills, ...c.sapModules].map((s) => s.toLowerCase()));
  const pendingSkills = c.detectedSkills.filter((s) => !inProfile.has(s.toLowerCase()));
  const availability = availabilityText(c.availableFrom, today);
  const retention = retentionState(c.retentionUntil, today);
  const address = [c.street, [c.postalCode, c.city].filter(Boolean).join(" "), c.country !== "Schweiz" ? c.country : null].filter(Boolean).join(", ");

  const dossierLinks = [
    { label: "PDF, anonymisiert", description: "Ohne Namen und Kontaktdaten", href: dossierHref(id, { format: "pdf", variant: "anonym" }) },
    { label: "PDF, mit Namen", description: "Name, Wohnort und eigene Firma, ohne Kontaktdaten", href: dossierHref(id, { format: "pdf", variant: "namentlich" }) },
    { label: "Word, anonymisiert", description: "Zum Anpassen vor dem Versand", href: dossierHref(id, { format: "docx", variant: "anonym" }) },
    { label: "Word, mit Namen", description: "Zum Anpassen vor dem Versand", href: dossierHref(id, { format: "docx", variant: "namentlich" }) },
  ];

  return (
    <>
      <PageHeader
        title={name}
        description={c.headline ?? undefined}
        crumbs={[{ label: "Kandidaten", href: "/admin/kandidaten" }, { label: no }]}
        meta={
          <>
            <Badge tone={toneOf(candidateStatuses, c.status)}>{labelOf(candidateStatuses, c.status)}</Badge>
            <Mono>{no}</Mono>
            {c.objectionAt ? (
              <Badge tone="red">
                <ShieldAlert aria-hidden className="size-3" />
                Widerspruch gegen Weitergabe
              </Badge>
            ) : null}
            {company ? null : (
              <Badge tone="amber">
                <Building2 aria-hidden className="size-3" />
                Ohne eigene Firma
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-[0.8125rem] text-slate">
              <CalendarDays aria-hidden className="size-3.5" />
              {availability ? (availability === "sofort" ? "Sofort verfügbar" : `Verfügbar ab ${availability}`) : "Verfügbarkeit offen"}
            </span>
          </>
        }
        actions={
          <>
            <DossierMenu
              links={dossierLinks}
              note="Für eine Firma das Dossier beim Vorschlag im Mandat erstellen: dort wird die Einwilligung für das Mandat geprüft."
            />
            <LinkButton href={`/admin/kandidaten/${id}/bearbeiten`} variant="primary" icon={Pencil}>
              Bearbeiten
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Profil" />
            <CardBody className="space-y-5">
              {c.summary ? (
                <p className="max-w-3xl text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{c.summary}</p>
              ) : (
                <p className="text-sm text-slate">
                  Noch kein Kurzprofil.{" "}
                  <Link href={`/admin/kandidaten/${id}/bearbeiten`} className="text-blue hover:underline">
                    Ergänzen
                  </Link>
                </p>
              )}
              <DescriptionList
                items={[
                  { label: "Schwerpunkte", value: c.disciplines.length ? c.disciplines.map((d) => labelOf(disciplines, d)).join(", ") : "–" },
                  { label: "Seniorität", value: labelOf(seniorities, c.seniority) },
                  { label: "Kompetenzen", value: <TagList items={c.skills} />, wide: true },
                  { label: "SAP-Module", value: <TagList items={c.sapModules} tone="blue" />, wide: true },
                  {
                    label: "Sprachen",
                    value: languages.length ? (
                      <ul className="space-y-0.5">
                        {languages.map((l, i) => (
                          <li key={i}>{languageLine(l)}</li>
                        ))}
                      </ul>
                    ) : (
                      "–"
                    ),
                  },
                  {
                    label: "Zertifikate",
                    value: c.certifications.length ? (
                      <ul className="space-y-0.5">
                        {c.certifications.map((cert) => (
                          <li key={cert}>{cert}</li>
                        ))}
                      </ul>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Bewertung", value: c.rating ? <Stars rating={c.rating} /> : "–" },
                  {
                    label: "Interne Notizen",
                    value: c.notes ? <span className="whitespace-pre-line">{c.notes}</span> : "–",
                    wide: true,
                  },
                ]}
              />
            </CardBody>
          </Card>

          {pendingSkills.length ? (
            <Card>
              <CardHeader
                title="Im Lebenslauf erkannt"
                description="Stichworte aus hochgeladenen Lebensläufen, die noch nicht im Profil stehen. Im Matching zählen sie nur halb, bis du sie übernimmst. SAP-Einträge kommen zu den SAP-Modulen."
              />
              <CardBody>
                <DetectedSkills key={pendingSkills.join("|")} skills={pendingSkills} adopt={adoptDetectedSkills.bind(null, id)} />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Werdegang und Projekte" />
            {experience.length ? (
              <CardBody>
                <ol className="space-y-5 border-l border-line pl-5">
                  {experience.map((e, i) => (
                    <li key={i} className="relative">
                      <span aria-hidden className={`absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-white ${e.to ? "bg-line" : "bg-blue"}`} />
                      <p className="font-mono text-xs text-slate">{formatMonthRange(e.from, e.to)}</p>
                      <p className="mt-0.5 font-medium text-ink">{e.role}</p>
                      {e.client || e.industry ? <p className="text-sm text-slate">{[e.client, e.industry].filter(Boolean).join(" · ")}</p> : null}
                      {e.description ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-ink">{e.description}</p> : null}
                      {e.technologies?.length ? (
                        <div className="mt-2">
                          <TagList items={e.technologies} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </CardBody>
            ) : (
              <EmptyState icon={Briefcase} title="Noch kein Werdegang erfasst">
                Stationen und Projekte erscheinen im Dossier als Zeitleiste.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader title="Ausbildung" />
            {education.length ? (
              <ul className="divide-y divide-line">
                {education.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{e.title}</span>
                      {e.institution ? <span className="block text-[0.8125rem] text-slate">{e.institution}</span> : null}
                    </span>
                    {e.year ? <span className="font-mono text-xs text-slate">{e.year}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="flex items-center gap-2 text-sm text-slate">
                  <GraduationCap aria-hidden className="size-4" />
                  Noch keine Ausbildung erfasst.
                </p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Vorschläge" description="Bei welchen Mandaten dieses Profil vorgemerkt oder vorgeschlagen ist. Erfasst und geändert im Mandat." />
            {proposals.length ? (
              <ul className="divide-y divide-line">
                {proposals.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1 basis-56">
                      <Link href={`/admin/mandate/${p.mandateId}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {p.mandateTitle}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate">
                        <Mono>{displayNo.mandate(p.mandateId)}</Mono>
                        {p.companyName ? <span>{p.companyName}</span> : null}
                        <span>{p.submittedAt ? `vorgeschlagen am ${formatDate(p.submittedAt)}` : "noch nicht vorgeschlagen"}</span>
                      </p>
                    </div>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={toneOf(submissionStatuses, p.status)}>{labelOf(submissionStatuses, p.status)}</Badge>
                      {p.withdrawnAt ? (
                        <Badge tone="red">
                          <ShieldAlert aria-hidden className="size-3" />
                          Widerrufen am {formatDate(p.withdrawnAt)}
                        </Badge>
                      ) : p.consentAt ? (
                        <Badge tone="green">
                          <ShieldCheck aria-hidden className="size-3" />
                          Einwilligung{p.consentMethod ? ` (${labelOf(consentMethods, p.consentMethod)})` : ""}
                        </Badge>
                      ) : (
                        <Badge tone="amber">
                          <ShieldAlert aria-hidden className="size-3" />
                          Ohne Einwilligung
                        </Badge>
                      )}
                      <LinkButton
                        href={dossierHref(id, { format: "pdf", variant: p.profileVariant === "namentlich" ? "namentlich" : "anonym", mandateId: p.mandateId })}
                        size="sm"
                        variant="ghost"
                        icon={FileDown}
                        download
                      >
                        <span>
                          Dossier <span className="sr-only">für {displayNo.mandate(p.mandateId)}, </span>
                          <span className="text-xs text-slate">({labelOf(profileVariants, p.profileVariant)})</span>
                        </span>
                      </LinkButton>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">Noch keine Vorschläge. Ein Profil schlägst du im Mandat vor, mit der Einwilligung für genau dieses Mandat.</p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Passende Mandate" description="Offene Mandate ohne Vorschlag für dieses Profil, nach Übereinstimmung sortiert." />
            {matches.length ? (
              <ul className="divide-y divide-line">
                {matches.map(({ mandate: m, match }) => (
                  <li key={m.id} className="flex items-start gap-4 px-5 py-3">
                    <span
                      className={`mt-0.5 flex size-11 shrink-0 flex-col items-center justify-center rounded-full text-sm font-semibold tabular-nums ring-1 ring-inset ${
                        scoreTone(match.score) === "green"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : scoreTone(match.score) === "blue"
                            ? "bg-blue/10 text-blue-700 ring-blue/20"
                            : "bg-slate/10 text-slate ring-slate/15"
                      }`}
                    >
                      {match.score}
                      <span className="sr-only"> von 100 Punkten</span>
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <Link href={`/admin/mandate/${m.id}?kandidat=${id}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {m.title}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate">
                        <Mono>{displayNo.mandate(m.id)}</Mono>
                        {m.companyName ? <span>{m.companyName}</span> : null}
                        {m.startDate ? <span>Start {formatDate(m.startDate)}</span> : null}
                      </p>
                      {match.reasons.length ? <p className="mt-1 text-[0.8125rem] text-ink">{match.reasons.slice(0, 3).join(" · ")}</p> : null}
                      {match.missingRequired.length ? (
                        <p className="mt-0.5 text-[0.8125rem] text-slate">Fehlt: {match.missingRequired.slice(0, 4).join(", ")}</p>
                      ) : null}
                      {match.warnings.length ? (
                        <p className="mt-0.5 flex items-start gap-1 text-[0.8125rem] text-amber-800">
                          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                          {match.warnings.slice(0, 2).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="flex items-center gap-2 text-sm text-slate">
                  <Sparkles aria-hidden className="size-4" />
                  Kein offenes Mandat ohne Vorschlag für dieses Profil.
                </p>
              </CardBody>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className={company ? undefined : "border-amber-300"}>
            <CardHeader title="Eigene Firma" description="Profile gehen nur über die eigene Firma der Fachperson an Firmen, als Subunternehmen von KOVALI." />
            <CardBody className="space-y-4">
              {company ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-blue">
                      <Building2 aria-hidden className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <Link href={`/admin/firmen/${company.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                        {company.name}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate">
                        <Mono>{displayNo.company(company.id)}</Mono>
                        <span>{company.legalForm ?? "Rechtsform nicht erfasst"}</span>
                        <span>UID {company.uid ?? "–"}</span>
                      </p>
                    </div>
                  </div>
                  {company.kind !== "subunternehmer" ? (
                    <Notice tone="amber" icon={AlertTriangle}>
                      Diese Firma ist nicht als Subunternehmer erfasst.
                    </Notice>
                  ) : null}
                  {isCapitalCompany(company) ? null : (
                    <Notice tone="amber" icon={AlertTriangle} title="Einzelfirma: höheres Risiko Scheinselbständigkeit">
                      Prüfen, ob die Ausgleichskasse die Selbständigkeit anerkannt hat. GmbH oder AG bevorzugen.
                    </Notice>
                  )}
                  <ActionButton action={unlinkOwnFirm.bind(null, id)} confirm={`Verknüpfung mit «${company.name}» lösen?`} variant="ghost">
                    Verknüpfung lösen
                  </ActionButton>
                </>
              ) : (
                <>
                  <Notice tone="amber" icon={AlertTriangle} title="Keine eigene Firma erfasst – Profil kann nicht vorgeschlagen werden" />
                  {firmChoices.length ? (
                    <OwnFirmForm action={linkOwnFirm.bind(null, id)} choices={firmChoices} />
                  ) : (
                    <p className="text-sm text-slate">Noch keine Firma der Art «Subunternehmer» erfasst.</p>
                  )}
                  <LinkButton href="/admin/firmen/neu?art=subunternehmer" size="sm" icon={Plus}>
                    Firma anlegen
                  </LinkButton>
                </>
              )}
              {c.engagement === "anstellung" ? (
                <p className="text-[0.8125rem] text-slate">Sucht Anstellung: derzeit keine Vermittlung in Anstellung.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Verfügbarkeit und Konditionen" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Verfügbar ab", value: availability ?? "–" },
                  { label: "Pensum", value: formatWorkload(c.workloadMin, c.workloadMax) ?? "–" },
                  { label: "Einsatzform", value: labelOf(engagements, c.engagement) },
                  { label: "Satzvorstellung", value: formatRate(c.rateAmount, c.rateUnit) ?? "–" },
                  { label: "Lohnvorstellung", value: c.salaryExpectation ? `${formatChf(c.salaryExpectation, { round: true })} pro Jahr` : "–" },
                  { label: "Arbeitsort", value: labelOf(remoteOptions, c.remote) },
                  { label: "Kündigungsfrist", value: c.noticePeriod ?? "–" },
                  { label: "Regionen", value: c.regions ?? "–", wide: true },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Kontakt" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  {
                    label: "E-Mail",
                    value: c.email ? (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-blue hover:underline">
                        <Mail aria-hidden className="size-3.5 shrink-0" />
                        {c.email}
                      </a>
                    ) : (
                      "–"
                    ),
                  },
                  {
                    label: "Telefon",
                    value: c.phone ? (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-blue hover:underline">
                        <Phone aria-hidden className="size-3.5 shrink-0" />
                        {c.phone}
                      </a>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Adresse", value: address || "–" },
                  { label: "Geburtsdatum", value: c.dateOfBirth ? `${formatDate(c.dateOfBirth)} (${ageOn(c.dateOfBirth, today)} Jahre)` : "–" },
                  { label: "Nationalität", value: c.nationality ?? "–" },
                  { label: "Arbeitsbewilligung", value: labelOf(workPermits, c.workPermit) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Datenschutz"
              actions={
                <LinkButton href="/admin/datenschutz" size="sm" variant="ghost">
                  Übersicht
                </LinkButton>
              }
            />
            <CardBody className="space-y-4">
              {retention.state === "overdue" ? (
                <Notice tone="red" icon={ShieldAlert} title="Aufbewahrungsfrist abgelaufen">
                  {retention.days === 0 ? "Heute erreicht." : `Seit ${formatDate(c.retentionUntil)}.`} Profil löschen oder Einwilligung erneuern und Frist verlängern.
                </Notice>
              ) : retention.state === "due" ? (
                <Notice tone="amber" icon={ShieldAlert} title={`Frist endet in ${retention.days === 1 ? "1 Tag" : `${retention.days} Tagen`}`}>
                  Einwilligung einholen und Frist verlängern, sonst das Profil löschen.
                </Notice>
              ) : null}
              {c.objectionAt ? (
                <Notice tone="red" icon={ShieldAlert} title="Widerspruch gegen jede Weitergabe">
                  <p>
                    Seit {formatDate(c.objectionAt)}
                    {c.objectionNote ? `: ${c.objectionNote}` : ""}.
                  </p>
                  <p className="mt-1">
                    Kein Vormerken, keine Einwilligung und kein Vorschlag bei irgendeinem Mandat. Erst eine neue, ausdrückliche Einwilligung für ein Mandat hebt
                    den Widerspruch auf, oder du hebst ihn hier mit Begründung auf.
                  </p>
                  <details className={cn(detailsClass, "mt-3 text-ink")}>
                    <summary className={summaryClass}>Widerspruch aufheben</summary>
                    <div className="p-3">
                      <LiftObjectionForm action={liftCandidateObjection.bind(null, id)} />
                    </div>
                  </details>
                </Notice>
              ) : null}
              {!c.consentAt ? (
                <Notice tone="amber" icon={ShieldAlert} title={c.consentNote ? "Keine gültige Einwilligung" : "Keine Einwilligung erfasst"}>
                  {c.consentNote ? <span className="whitespace-pre-line">{c.consentNote}. </span> : null}
                  Ohne Einwilligung höchstens sechs Monate aufbewahren; an Firmen nur mit Einwilligung für das Mandat.
                </Notice>
              ) : null}
              <DescriptionList
                columns={1}
                items={[
                  {
                    label: "Einwilligung zur Speicherung",
                    value: c.consentAt ? (
                      <Badge tone="green">
                        <ShieldCheck aria-hidden className="size-3" />
                        Erteilt am {formatDate(c.consentAt)}
                      </Badge>
                    ) : (
                      <Badge tone="amber">Nicht erteilt</Badge>
                    ),
                  },
                  ...(c.consentAt ? [{ label: "Wie erteilt", value: c.consentNote ?? "–" }] : []),
                  { label: "Datenschutzinformation zugestellt", value: c.privacyInfoAt ? formatDate(c.privacyInfoAt) : "Nicht erfasst" },
                  { label: "Aufbewahren bis", value: formatDate(c.retentionUntil) },
                  { label: "Herkunft der Daten", value: labelOf(candidateSources, c.source) },
                ]}
              />
              {c.objectionAt ? null : (
                <details className={detailsClass}>
                  <summary className={summaryClass}>Widerspruch erfassen (keine Weitergabe mehr)</summary>
                  <div className="space-y-3 p-3">
                    <p className="text-[0.8125rem] text-slate">
                      Gilt für alle Mandate: offene Vorschläge gelten als widerrufen, neues Vormerken ist gesperrt. Für ein einzelnes Mandat erfasst du den
                      Widerruf im Mandat.
                    </p>
                    <ObjectionForm action={recordCandidateObjection.bind(null, id)} today={today} />
                  </div>
                </details>
              )}
            </CardBody>
          </Card>

          <PortalAccountCard candidateId={id} />

          <ActivityFeed owner={owner} />
          <DocumentsCard
            owner={owner}
            defaultKind="cv"
            title="Lebenslauf und Dokumente"
            description="Verschlüsselt gespeichert (AES-256), jeder Abruf wird protokolliert. In Lebensläufen (PDF, Word) werden Kompetenzen automatisch erkannt. Keine Gesundheits-, Religions- oder Strafregisterdaten ablegen."
          />
        </div>
      </div>
    </>
  );
}
